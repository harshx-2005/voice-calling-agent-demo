const express = require("express");
const router = express.Router();
const { getAIResponse } = require("../services/groq");

// Helper to construct ExoML XML responses
function buildExoML(text, gatherAction = null, shouldHangup = false) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n';
  
  if (shouldHangup) {
    xml += `  <Say>${escapeXml(text)}</Say>\n`;
    xml += `  <Hangup/>\n`;
  } else if (gatherAction) {
    xml += `  <Gather action="${gatherAction}" method="POST" timeout="5" finishOnKey="#">\n`;
    xml += `    <Say>${escapeXml(text)}</Say>\n`;
    xml += `  </Gather>\n`;
    xml += `  <Say>I didn't hear anything. Goodbye!</Say>\n`;
    xml += `  <Hangup/>\n`;
  } else {
    xml += `  <Say>${escapeXml(text)}</Say>\n`;
  }

  xml += "</Response>";
  return xml;
}

function escapeXml(unsafe) {
  return (unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// 1. Incoming Call from Exotel Passthru Applet
router.all("/incoming", async (req, res) => {
  const callSid = req.body.CallSid || req.query.CallSid || `exotel_${Date.now()}`;
  const callerNumber = req.body.From || req.body.CallFrom || req.query.From || "Unknown";

  console.log(`[Exotel] Incoming call: ${callSid} from ${callerNumber}`);

  const greeting = await getAIResponse(
    callSid,
    "[CALL STARTED - greet the caller warmly and ask how you can help]"
  );

  const host = req.headers.host;
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const actionUrl = `${protocol}://${host}/exotel/respond`;

  const exoml = buildExoML(greeting, actionUrl);
  res.type("text/xml");
  res.send(exoml);
});

// 2. Response processing after user input / speech / DTMF
router.all("/respond", async (req, res) => {
  const callSid = req.body.CallSid || req.query.CallSid || `exotel_${Date.now()}`;
  const callerSpeech = req.body.SpeechResult || req.body.Digits || req.query.Digits || "";

  console.log(`[Exotel] [${callSid}] Caller input: "${callerSpeech}"`);

  let aiReply;
  if (!callerSpeech) {
    aiReply = "I didn't quite get that. Could you please repeat how I can help you?";
  } else {
    aiReply = await getAIResponse(callSid, callerSpeech);
  }

  const endKeywords = ["goodbye", "bye", "thank you goodbye", "that's all"];
  const shouldEnd = endKeywords.some((kw) => callerSpeech.toString().toLowerCase().includes(kw));

  const host = req.headers.host;
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const actionUrl = `${protocol}://${host}/exotel/respond`;

  const exoml = buildExoML(aiReply, shouldEnd ? null : actionUrl, shouldEnd);
  res.type("text/xml");
  res.send(exoml);
});

// 3. Trigger an outbound call via Exotel's Calls Connect API
router.post("/outbound", async (req, res) => {
  const { to, appId } = req.body;
  if (!to) {
    return res.status(400).json({ error: "Phone number 'to' is required (e.g. +91XXXXXXXXXX)" });
  }

  const accountSid = process.env.EXOTEL_ACCOUNT_SID;
  const apiKey = process.env.EXOTEL_API_KEY;
  const apiToken = process.env.EXOTEL_API_TOKEN;
  const callerId = process.env.EXOTEL_CALLER_ID;
  const subdomain = process.env.EXOTEL_SUBDOMAIN || "api.exotel.com";
  const finalAppId = appId || process.env.EXOTEL_APP_ID;

  if (!accountSid || !apiKey || !apiToken || !callerId) {
    return res.status(500).json({ error: "Exotel credentials or phone numbers missing in .env" });
  }

  if (!finalAppId) {
    return res.status(400).json({ error: "Exotel App ID (appId) is required for outbound flow connection" });
  }

  // Construct Exotel's flow URL: http://my.exotel.com/{your_sid}/exoml/start_voice/{app_id}
  const flowUrl = `http://my.exotel.com/${accountSid}/exoml/start_voice/${finalAppId}`;

  // Basic auth header
  const auth = Buffer.from(`${apiKey}:${apiToken}`).toString("base64");

  // Call status callback url (points to our webhook)
  const host = req.headers.host;
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const statusCallbackUrl = `${protocol}://${host}/webhook/exotel-status`;

  // Build the form-data request body parameters
  const params = new URLSearchParams();
  params.append("From", to);
  params.append("CallerId", callerId);
  params.append("Url", flowUrl);
  params.append("CallType", "trans");
  params.append("StatusCallback", statusCallbackUrl);

  const exotelEndpoint = `https://${subdomain}/v1/Accounts/${accountSid}/Calls/connect.json`;

  try {
    console.log(`[Exotel] Initiating outbound call to ${to} connecting to flow app ${finalAppId}...`);
    const response = await fetch(exotelEndpoint, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Exotel] API Error response:", data);
      return res.status(response.status).json({
        success: false,
        error: data.RestResponse?.Errors?.[0]?.Message || "Exotel API connection failed",
        details: data
      });
    }

    const callDetails = data.RestResponse?.Call;
    console.log(`[Exotel] Outbound call initiated. Call SID: ${callDetails?.Sid}`);
    res.json({
      success: true,
      message: `Call initiated to ${to}`,
      callSid: callDetails?.Sid,
      status: callDetails?.Status,
      flowUrl: flowUrl,
      statusCallback: statusCallbackUrl
    });
  } catch (error) {
    console.error("[Exotel] Outbound call error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


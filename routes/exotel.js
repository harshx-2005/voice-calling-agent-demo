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

module.exports = router;

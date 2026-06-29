const express = require("express");
const router = express.Router();
const twilio = require("twilio");
const { getAIResponse } = require("../services/groq");

const VoiceResponse = twilio.twiml.VoiceResponse;

// Called when someone first dials your Twilio number
router.post("/incoming", async (req, res) => {
  const twiml = new VoiceResponse();
  const callSid = req.body.CallSid;

  console.log(`Incoming call: ${callSid} from ${req.body.From}`);

  // Get opening greeting from AI
  const greeting = await getAIResponse(
    callSid,
    "[CALL STARTED - greet the caller warmly and ask how you can help]"
  );

  // Use Twilio's built-in TTS (free, no ElevenLabs needed)
  const gather = twiml.gather({
    input: "speech",
    action: `/call/respond`,
    method: "POST",
    speechTimeout: "auto",
    language: "en-US",
    hints: "book, appointment, pricing, services, AI, automation",
  });

  gather.say(
    {
      voice: "Polly.Joanna", // Free AWS Polly voice via Twilio
      language: "en-US",
    },
    greeting
  );

  // If no input, prompt again
  twiml.redirect("/call/no-input");

  res.type("text/xml");
  res.send(twiml.toString());
});

// Called after caller speaks — process their response
router.post("/respond", async (req, res) => {
  const twiml = new VoiceResponse();
  const callSid = req.body.CallSid;
  const callerSpeech = req.body.SpeechResult || "";
  const confidence = parseFloat(req.body.Confidence || "0");

  console.log(`[${callSid}] Caller said: "${callerSpeech}" (confidence: ${confidence})`);

  let aiReply;

  if (!callerSpeech || confidence < 0.3) {
    aiReply = "I'm sorry, I didn't quite catch that. Could you say that again?";
  } else {
    aiReply = await getAIResponse(callSid, callerSpeech);
  }

  // Check if conversation should end
  const endKeywords = ["goodbye", "bye", "thank you goodbye", "that's all"];
  const shouldEnd = endKeywords.some((kw) => callerSpeech.toLowerCase().includes(kw));

  if (shouldEnd) {
    twiml.say({ voice: "Polly.Joanna" }, aiReply);
    twiml.hangup();
  } else {
    // Continue the conversation
    const gather = twiml.gather({
      input: "speech",
      action: "/call/respond",
      method: "POST",
      speechTimeout: "auto",
      language: "en-US",
    });

    gather.say({ voice: "Polly.Joanna" }, aiReply);

    // Fallback if no response
    twiml.say(
      { voice: "Polly.Joanna" },
      "Are you still there? Feel free to ask me anything about our AI services."
    );
    twiml.redirect("/call/respond");
  }

  res.type("text/xml");
  res.send(twiml.toString());
});

// No input fallback
router.post("/no-input", (req, res) => {
  const twiml = new VoiceResponse();

  const gather = twiml.gather({
    input: "speech",
    action: "/call/respond",
    method: "POST",
    speechTimeout: "auto",
  });

  gather.say(
    { voice: "Polly.Joanna" },
    "Hello? I'm here to help with any questions about our AI agency. What can I do for you today?"
  );

  twiml.hangup();

  res.type("text/xml");
  res.send(twiml.toString());
});

module.exports = router;

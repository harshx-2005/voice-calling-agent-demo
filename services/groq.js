const Groq = require("groq-sdk");
const { SYSTEM_PROMPT } = require("../config/agent");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// In-memory conversation store per call SID
const conversations = {};

async function getAIResponse(callSid, userMessage) {
  // Initialize conversation history for this call
  if (!conversations[callSid]) {
    conversations[callSid] = {
      messages: [],
      leadData: {},
    };
  }

  const convo = conversations[callSid];

  // Add user message to history
  convo.messages.push({ role: "user", content: userMessage });

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant", // Free, fast model on Groq
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...convo.messages,
      ],
      max_tokens: 150, // Keep responses short for voice
      temperature: 0.7,
    });

    const aiReply = response.choices[0].message.content.trim();

    // Add AI reply to history
    convo.messages.push({ role: "assistant", content: aiReply });

    // Extract lead data from conversation
    extractLeadData(callSid, userMessage);

    return aiReply;
  } catch (error) {
    console.error("Groq API error:", error.message);
    return "I'm sorry, I had a small hiccup. Could you repeat that please?";
  }
}

function extractLeadData(callSid, message) {
  const convo = conversations[callSid];
  const lower = message.toLowerCase();

  // Simple email extraction
  const emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    convo.leadData.email = emailMatch[0];
  }

  // Store message for full transcript
  if (!convo.leadData.transcript) {
    convo.leadData.transcript = [];
  }
  convo.leadData.transcript.push(message);
}

function getLeadData(callSid) {
  return conversations[callSid]?.leadData || {};
}

function clearConversation(callSid) {
  delete conversations[callSid];
}

module.exports = { getAIResponse, getLeadData, clearConversation };

const express = require("express");
const router = express.Router();
const { getLeadData, clearConversation } = require("../services/groq");
const { saveLead } = require("../services/leads");

// Twilio calls this when a call ends
router.post("/call-status", (req, res) => {
  const { CallSid, CallStatus, From, To, CallDuration } = req.body;

  console.log(`Call ${CallSid} ended. Status: ${CallStatus}, Duration: ${CallDuration}s`);

  if (CallStatus === "completed" || CallStatus === "no-answer" || CallStatus === "busy") {
    // Save lead data collected during the call
    const leadData = getLeadData(CallSid);

    if (Object.keys(leadData).length > 0) {
      saveLead(CallSid, leadData, From);
      console.log(`Lead saved from ${From}`);
    }

    // Clean up memory
    clearConversation(CallSid);
  }

  res.sendStatus(200);
});

// Exotel calls this when a call ends
router.post("/exotel-status", (req, res) => {
  const callSid = req.body.CallSid || req.query.CallSid;
  const status = req.body.Status || req.query.Status;
  const from = req.body.From || req.query.From || "Unknown";
  const duration = req.body.ConversationDuration || req.body.CallDuration || req.query.ConversationDuration || 0;

  console.log(`[Exotel] Call ${callSid} ended. Status: ${status}, Duration: ${duration}s`);

  if (status === "completed" || status === "no-answer" || status === "busy" || status === "failed") {
    // Save lead data collected during the call
    const leadData = getLeadData(callSid);

    if (Object.keys(leadData).length > 0) {
      saveLead(callSid, leadData, from);
      console.log(`[Exotel] Lead saved from ${from}`);
    }

    // Clean up memory
    clearConversation(callSid);
  }

  res.sendStatus(200);
});

// View all leads (simple API endpoint)
router.get("/leads", (req, res) => {
  const { getAllLeads } = require("../services/leads");
  const leads = getAllLeads();
  res.json({ total: leads.length, leads });
});

module.exports = router;

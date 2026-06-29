const fs = require("fs");
const path = require("path");

const LEADS_FILE = path.join(__dirname, "../data/leads.json");

// Ensure data directory exists
if (!fs.existsSync(path.dirname(LEADS_FILE))) {
  fs.mkdirSync(path.dirname(LEADS_FILE), { recursive: true });
}

function loadLeads() {
  if (!fs.existsSync(LEADS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(LEADS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveLead(callSid, leadData, phoneNumber) {
  const leads = loadLeads();

  const lead = {
    id: callSid,
    phone: phoneNumber || "Unknown",
    email: leadData.email || null,
    name: leadData.name || null,
    business: leadData.business || null,
    need: leadData.need || null,
    transcript: leadData.transcript || [],
    createdAt: new Date().toISOString(),
  };

  // Avoid duplicates
  const existing = leads.findIndex((l) => l.id === callSid);
  if (existing >= 0) {
    leads[existing] = { ...leads[existing], ...lead };
  } else {
    leads.push(lead);
  }

  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
  console.log(`Lead saved for call ${callSid}`);
  return lead;
}

function getAllLeads() {
  return loadLeads();
}

module.exports = { saveLead, getAllLeads };

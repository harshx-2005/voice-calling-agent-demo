# 🤖 AI Voice Receptionist

An AI agent that picks up phone calls and acts as a receptionist for your AI agency — books appointments, answers FAQs, and collects leads. **100% free to build using trial credits.**

---

## 🏗️ Architecture

```
Caller dials number
      ↓
  Twilio (receives call + STT)
      ↓
  Express Server (your backend)
      ↓
  Groq / Llama 3 (AI brain - FREE)
      ↓
  Twilio Polly Voice (TTS - FREE)
      ↓
  Caller hears response
      ↓
  Lead saved to leads.json
```

---

## 🆓 Free Stack

| Tool | Purpose | Cost |
|------|---------|------|
| Twilio | Phone number + call handling + STT + TTS | ~$15 free trial |
| Groq (Llama 3) | AI brain — generates responses | **100% FREE** |
| Render.com | Server hosting | **FREE tier** |
| JSON file | Lead storage | **FREE** |

> **Total cost to get started: $0** (Twilio trial gives you enough minutes for demos)

---

## ⚡ Setup Guide

### Step 1: Get Your API Keys

1. **Twilio** → [twilio.com](https://twilio.com) → Sign up → Get Account SID + Auth Token + Buy a phone number (~$1/month after trial)
2. **Groq** → [console.groq.com](https://console.groq.com) → Sign up → Create API key (FREE)

### Step 2: Clone & Install

```bash
git clone <your-repo>
cd ai-receptionist
npm install
```

### Step 3: Configure Environment

```bash
cp .env.example .env
# Fill in your API keys in .env
```

### Step 4: Customize the Agent

Edit `config/agent.js`:
- Change `AGENCY_INFO.name` to your client's agency name
- Update services, pricing, working hours
- Modify the `SYSTEM_PROMPT` to match their tone

### Step 5: Deploy to Render (Free)

1. Push code to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo
4. Set environment variables from your `.env`
5. Deploy → copy your public URL (e.g. `https://ai-receptionist.onrender.com`)

### Step 6: Connect Twilio

1. Go to Twilio Console → Phone Numbers → Your Number
2. Set **Voice webhook** to: `https://your-render-url.onrender.com/call/incoming`
3. Set **Call Status webhook** to: `https://your-render-url.onrender.com/webhook/call-status`
4. Save!

### Step 7: Test It

Call your Twilio number — Aria will pick up! 🎉

---

## 📁 Project Structure

```
ai-receptionist/
├── index.js              # Express server entry point
├── config/
│   └── agent.js          # Agency info + AI system prompt
├── routes/
│   ├── call.js           # Twilio voice call handling
│   └── webhook.js        # Call status + leads API
├── services/
│   ├── groq.js           # Groq AI + conversation memory
│   ├── deepgram.js       # Optional: Deepgram STT
│   └── leads.js          # Lead storage
├── data/
│   └── leads.json        # Auto-created, stores all leads
├── .env.example
└── package.json
```

---

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/call/incoming` | POST | Twilio calls this on new call |
| `/call/respond` | POST | Processes caller's speech |
| `/webhook/call-status` | POST | Called when call ends, saves lead |
| `/webhook/leads` | GET | View all collected leads |

---

## 📞 What Aria Can Do

- ✅ Greet callers warmly
- ✅ Answer FAQs about AI services and pricing
- ✅ Collect name, email, business type, and needs
- ✅ Book discovery calls (direct to Calendly link)
- ✅ Handle objections politely
- ✅ Save all leads automatically
- ✅ Work 24/7 without breaks

---

## 🚀 Upgrading Later

| Feature | Tool | Cost |
|---------|------|------|
| Better voice | ElevenLabs | $5/month |
| More realistic STT | Deepgram | Pay per use |
| Lead CRM | Airtable/Notion | Free tier |
| Email notification on lead | Resend | Free tier |
| Calendar booking | Cal.com API | Free |

---

## 💰 Sell This to Clients

Position this as an **"AI Receptionist Service"**:
- Setup fee: **£500–£1000**
- Monthly maintenance: **£100–£300/month**
- Clients save cost of a full-time receptionist (~£2000+/month)

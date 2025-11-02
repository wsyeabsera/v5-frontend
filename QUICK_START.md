# Quick Start Guide 🚀

## Your Cursor-Like AI Assistant is Ready!

The frontend is now fully integrated with your [MCP Server](https://wsyeabsera.github.io/v5-mcp-server/intro) and ready to use.

## Step 1: Start the Servers

Make sure both servers are running:

```bash
# Terminal 1: MCP Server (port 3000)
cd /Users/yab/Projects/v5-clear-ai/mcp-server
npm run dev

# Terminal 2: Frontend (port 3001)
cd /Users/yab/Projects/v5-clear-ai/frontend  
npm run dev
```

## Step 2: Set Your API Key

1. Open **http://localhost:3001/settings**
2. Enter your API key for one of these providers:
   - **Anthropic** (Claude) - Recommended
   - **OpenAI** (GPT-4)
   - **Google** (Gemini Pro)
3. Click "Save"
4. Your key is stored securely in browser localStorage

## Step 3: Start Chatting!

Visit **http://localhost:3001/chat** and try these:

### 📍 Query Data
```
"List all facilities"
"Show me recent inspections"
"What contaminants have been detected?"
```

### 📊 Get Analysis  
```
"Analyze the Hannover facility"
"Generate a facility health report"
"What's the acceptance rate?"
```

### ⚠️ Assess Risk
```
"Analyze risk for shipment [ID]"
"Are there any high-risk contaminants?"
"Which facilities need attention?"
```

### 🔍 Custom Questions
```
"How many facilities do we have?"
"Show shipments from Amsterdam"
"List inspections that were rejected"
```

## What Makes It Smart?

Your AI assistant has access to:

### 1. **MCP Tools** (28 CRUD Operations)
- Create, read, update, delete facilities, shipments, inspections, contaminants, contracts
- The AI calls these automatically when you ask questions

### 2. **AI-Powered Analysis** (3 Sampling Tools)
- **Facility Reports**: Health scores (0-100), concerns, recommendations
- **Risk Assessment**: Shipment risk analysis with reasoning
- **Inspection Questions**: Auto-generated inspection checklists

### 3. **MCP Prompts** (4 Workflow Templates)
- Compliance analysis
- Contamination reports
- Shipment reviews
- Performance comparisons

## See It In Action

When you ask: **"How is Hannover facility performing?"**

The AI will:
1. 🔧 Call `get_facility` to fetch details
2. 🤖 Call `generate_intelligent_facility_report` for AI analysis
3. 📊 Return:
   - **Health Score**: 78/100
   - **Top 3 Concerns**: Contamination trends, compliance issues
   - **Recommendations**: Enhanced screening, staff training, review meetings

You'll see each tool call in real-time with a ⏳ icon that turns to ✓ when complete!

## Features

### ✅ Dashboard
- Real-time stats (facilities, shipments, contaminants, acceptance rate)
- Activity feed showing recent inspections and contaminants
- Auto-refreshes every 30 seconds

### ✅ Chat
- Streaming AI responses
- Tool calls visible in UI
- Multi-turn conversations
- Quick prompt suggestions
- Works with Claude, GPT-4, or Gemini

### ✅ Settings
- Model selection (save preference)
- API key management (secure local storage)
- Persists across sessions

## Testing Checklist

### Settings Page (/settings)
- [ ] Enter API key → Save → Reload page → Key persists
- [ ] Switch model → Reload → Selection persists
- [ ] Test all 3 providers

### Chat Page (/chat)
- [ ] Without key → Shows "API Key Required"
- [ ] With key → Chat works
- [ ] Ask "List all facilities" → See tool call badge
- [ ] Ask "Analyze Hannover" → See AI-powered analysis
- [ ] Quick prompts work

### Dashboard (/)
- [ ] Shows 6 facilities, 3 shipments, etc.
- [ ] Activity feed shows data
- [ ] Stats auto-refresh

## Architecture

```
Your Browser (localhost:3001)
  ↓
Next.js Frontend
  ├── Dashboard → /api/stats, /api/activity
  ├── Chat → /api/chat (streaming)
  └── All pages → /api/mcp (proxy)
    ↓
MCP Server (localhost:3000)
  ├── 28 CRUD tools
  ├── 4 prompt templates
  ├── 3 AI sampling tools
  └── MongoDB (data)
```

## Common Issues

### "API Key Required"
→ Go to Settings and enter your API key

### Chat not responding
→ Check:
1. MCP server running? (curl http://localhost:3000)
2. API key valid?
3. Check browser console for errors

### Dashboard showing zeros
→ MCP server needs data. Add facilities via chat:
```
"Create a new facility named Test Facility in Amsterdam with code TEST-001"
```

## What's Next?

Your waste management AI assistant is ready! It can:
- ✅ Answer questions with real data
- ✅ Provide AI-powered analysis
- ✅ Generate health scores and recommendations
- ✅ Assess risks
- ✅ Create custom inspection checklists
- ✅ Stream responses in real-time
- ✅ Show tool usage transparently

**Start exploring your data with natural language!** 🎉

---

For more details:
- [MCP Server Documentation](https://wsyeabsera.github.io/v5-mcp-server/intro)
- [Implementation Details](./CHAT_INTEGRATION_COMPLETE.md)
- [Dashboard Fix](./DASHBOARD_FIX_SUMMARY.md)


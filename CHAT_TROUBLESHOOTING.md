# Chat "Failed to Fetch" Troubleshooting

## What I've Fixed

### 1. ✅ Added Comprehensive Logging
The chat API now logs every step:
- When requests are received
- Which model/provider is being used
- Provider initialization
- Stream start/errors
- Detailed error information

### 2. ✅ Better Error Handling
- Catch provider initialization errors separately
- Catch streaming errors separately
- Return detailed error messages with error types
- All errors return JSON (not plain text)

### 3. ✅ Health Check Endpoint
Test if API is running:
```bash
curl http://localhost:3001/api/chat
# Returns: {"status":"ok","message":"Chat API is running","timestamp":"..."}
```

### 4. ✅ Fixed Groq Provider Detection
The ChatInterface now correctly identifies Groq models and looks for `apiKeys['groq']`.

## How to Diagnose "Failed to Fetch"

### Step 1: Check Browser Console (MOST IMPORTANT)
1. Open **Chrome DevTools** (F12 or Cmd+Option+I)
2. Go to **Console** tab
3. Try sending a chat message
4. Look for errors - they should now be detailed

### Step 2: Check Network Tab
1. In DevTools, go to **Network** tab
2. Try sending a message
3. Look for `/api/chat` request
4. Click on it and check:
   - **Status**: Should be 200 (or see specific error code)
   - **Response**: See actual error message
   - **Request Payload**: Verify modelId and apiKey are being sent

### Step 3: Check Terminal (Where `npm run dev` is running)
Look for these log messages:
```
[Chat API] Received request
[Chat API] Model: groq-llama Messages: 1
[Chat API] Using provider: groq model: llama-3.3-70b-versatile
[Chat API] Initializing Groq client
[Chat API] Groq client ready
[Chat API] Starting stream with 8 tools available
[Chat API] Stream started successfully in XXXms
```

If you see errors, they'll be detailed now.

### Step 4: Test API Directly
```bash
# Replace with your actual Groq API key
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role":"user","content":"Hello"}],
    "modelId": "groq-llama",
    "apiKey": "gsk_YOUR_KEY_HERE"
  }'
```

## Common Issues & Solutions

### Issue 1: Invalid API Key
**Symptoms**: Error mentions authentication or 401
**Solution**: 
- Check your Groq API key starts with `gsk_`
- Verify it's valid at [console.groq.com](https://console.groq.com)
- Re-enter the key in Settings

### Issue 2: CORS Error
**Symptoms**: Browser console shows CORS policy error
**Solution**: This shouldn't happen since API route is same-origin, but if it does:
- Make sure you're accessing `http://localhost:3001` (not a different port)
- Check if any browser extensions are blocking requests

### Issue 3: Network Error
**Symptoms**: "Failed to fetch" or "NetworkError"
**Solution**:
- Check if dev server is running: `curl http://localhost:3001`
- Restart dev server: `npm run dev`
- Check firewall/antivirus isn't blocking localhost

### Issue 4: Model Not Found
**Symptoms**: Error about model not available
**Solution**:
- Groq models: `llama-3.3-70b-versatile`, `mixtral-8x7b-32768`
- Check model name matches what Groq API expects

### Issue 5: Rate Limit
**Symptoms**: Error mentions rate limit or 429
**Solution**:
- Wait a moment and try again
- Groq free tier has rate limits

## Debugging Tools

### 1. Storage Debug Component
In Settings page, click "🐛 Show Debug Info" to see:
- Current Zustand state
- localStorage contents
- Which keys are set

### 2. Console Logging
The API now logs extensively. Watch the terminal where `npm run dev` runs.

### 3. Health Check
```bash
curl http://localhost:3001/api/chat
# Should return: {"status":"ok",...}
```

## What to Check Next

1. **Open Browser Console** - This will show the actual error
2. **Check Terminal Logs** - See what the API is receiving/doing
3. **Verify API Key** - Make sure it's saved and starts with `gsk_`
4. **Test Another Model** - Try Claude or GPT-4 to see if issue is Groq-specific

## Report Back

When you tell me the issue, please include:
- **Exact error message** from browser console
- **Logs from terminal** (the [Chat API] lines)
- **Network tab screenshot** showing the failed request
- **Which model** you're trying to use

This will help me fix it quickly! 🔍


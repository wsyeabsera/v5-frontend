# Orchestrator Frontend Issues Documentation

## Issue 1: JSON Parsing Error - SSE Format Response

### Problem
Error: `Unexpected token 'd', "data: {\"js\"... is not valid JSON`

### Root Cause
The orchestrator server (port 5001) defaults to streaming mode (`stream: true`) for all tools, even simple read operations like `list_available_models`. When streaming is enabled, the server returns responses in SSE format:
```
data: {"jsonrpc":"2.0","id":1,"result":{...}}\n\n
```

However, the API route (`app/api/mcp-orchestrator/route.ts`) attempts to parse this with `response.json()`, which fails because:
1. The response body contains SSE-formatted text (`data: {...}`) not pure JSON
2. The content-type is `text/event-stream` not `application/json`

### Affected Files
- `frontend/app/api/mcp-orchestrator/route.ts` - Lines 170, 190
- `frontend/lib/mcp-client-orchestrator.ts` - All methods that don't explicitly set `stream: false`

### Solution
1. Check response content-type before parsing
2. If SSE format, parse as text and extract JSON from `data:` lines
3. If JSON format, parse normally
4. For non-streaming tools, explicitly set `stream: false` in arguments

### Solution Implemented
1. Added `parseSSEResponse()` function to extract JSON from SSE format (`data: {...}\n\n`)
2. Modified `mcpRequest()` to check content-type and handle both JSON and SSE responses
3. Modified tools/call handler to explicitly set `stream: false` for non-streaming tools (only `execute_orchestration` uses streaming)
4. Both handlers now check content-type before parsing

### Status
✅ **FIXED** - All orchestrator pages now load successfully
- Available Models page: ✅ Working
- Agent Configs page: ✅ Working
- Orchestrators page: ✅ Working
- Orchestrations page: ✅ Working
- Performance Metrics page: ✅ Working

## Issue 2: Select Component Empty String Values

### Problem
Error: `A <Select.Item /> must have a value prop that is not an empty string`

### Root Cause
Radix UI Select components don't allow empty string values for SelectItem. When using `value=""` for "All" or "None" options, React throws an error.

### Affected Files
- `frontend/components/v2/orchestrator/orchestrations/OrchestrationList.tsx` - Lines 105, 121
- `frontend/components/v2/orchestrator/orchestrators/OrchestratorConfigBuilder.tsx` - Line 133

### Solution Implemented
1. Changed empty string values (`value=""`) to non-empty values (`value="all"` and `value="none"`)
2. Updated filter logic to handle these special values
3. Updated state initialization and change handlers to properly convert between display values and filter values

### Status
✅ **FIXED** - All Select components now use valid non-empty values


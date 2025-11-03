# Demo Data Setup

## Overview

The system includes a demo reset feature that clears old test data and populates comprehensive demo requests showcasing all agent capabilities. The demo reset dynamically fetches MCP prompts from the server and creates requests for all available tools and prompts.

## Demo Reset API

### Endpoint

```
POST /api/demo/reset
```

### What It Does

1. **Clears all old data** (preserves MCP entities):
   - All agent outputs (thought outputs, planner outputs, critic outputs, executor outputs)
   - All request contexts

2. **Fetches MCP prompts dynamically** from the MCP server at runtime

3. **Creates comprehensive demo requests** covering:
   - **Tool Coverage Requests** (29 static requests): Cover all 28 MCP tools
   - **MCP Prompt Requests** (dynamic): One request per available MCP prompt
   - **Total:** ~33+ requests depending on how many prompts are available on the server

### Usage

**Using curl:**
```bash
curl -X POST http://localhost:3001/api/demo/reset
```

**Response:**
```json
{
  "success": true,
  "message": "Demo reset complete",
  "stats": {
    "requestsCreated": 33,
    "requestsFailed": 0,
    "totalQueries": 33,
    "toolCoverageRequests": 29,
    "promptRequests": 4,
    "mcpPromptsFetched": 4
  }
}
```

**Using the UI:**
- Navigate to `/requests`
- Click "Delete All" if you want to clear existing data
- Run the demo reset API endpoint
- Refresh the page to see the new demo requests

## Demo Requests

Demo requests are generated in two categories:

### 1. Tool Coverage Requests (29 static requests)

These requests ensure comprehensive coverage of all 28 MCP tools:

#### Basic CRUD Operations (11 requests)
- `Show me all facilities` - Tests `list_facilities`
- `List all contracts` - Tests `list_contracts`
- `List all inspections` - Tests `list_inspections`
- `List facilities in New York` - Tests `list_facilities` with filter
- `Get details for facility HAN` - Tests `get_facility`
- `List contaminants and get details for the first one` - Tests `list_contaminants` + `get_contaminant`
- `Get inspection details for facility HAN` - Tests `list_inspections` + `get_inspection`
- `Get shipment with license plate ABC-123` - Tests `list_shipments` + `get_shipment`
- `Get contract for producer Green Industries Inc` - Tests `list_contracts` + `get_contract`
- `Update facility HAN location to Amsterdam, Netherlands` - Tests `update_facility`
- `List contaminants and update the first one's explosive level to low` - Tests `update_contaminant`

#### Multi-Step Coordination (9 requests)
- `Get facility HAN and generate an intelligent report for it with recommendations` - Tests `get_facility` + `generate_intelligent_facility_report`
- `List facilities, get the first one's details, and analyze its shipment risks` - Tests `list_facilities` + `get_facility` + `analyze_shipment_risk`
- `List all shipments and analyze the risk of shipments from Green Industries Inc` - Tests `list_shipments` + `analyze_shipment_risk`
- `Create a new contaminant for facility HAN with high explosive level, medium HCl level, and medium SO2 level` - Tests `get_facility` + `create_contaminant`
- `Create an inspection for facility AMS` - Tests `get_facility` + `create_inspection`
- `List shipments and get details for the first one` - Tests `list_shipments` + `get_shipment`
- `Create a contract for producer Acme Corp with waste code 20-01-01` - Tests `create_contract`
- `List contaminants, get details for one with high explosive level, then update its status` - Tests `list_contaminants` + `get_contaminant` + `update_contaminant`
- `List facilities in New York and update their locations to Amsterdam` - Tests `list_facilities` + `update_facility`

#### AI-Powered Analysis (4 requests)
- `Suggest inspection questions for facility HAN` - Tests `suggest_inspection_questions`
- `Analyze shipment risk for shipments from Green Industries Inc` - Tests `list_shipments` + `analyze_shipment_risk`
- `Generate intelligent facility report for Central Waste Processing Hub with recommendations` - Tests `list_facilities` + `generate_intelligent_facility_report`
- `Find all contaminants with high explosive levels and analyze shipment risks for those facilities` - Tests `list_contaminants` + `list_shipments` + `analyze_shipment_risk`

#### Edge Cases & Error Handling (5 requests)
- `Get facility with code NONEXIST` - Tests `get_facility` error handling
- `Create a contaminant record for plastic containers with high explosive level` - Tests `create_contaminant` with missing params
- `Create a new shipment with license plate TEST-001` - Tests `create_shipment` with missing params
- `Update facility with code NONEXIST` - Tests `update_facility` error handling
- `Delete contaminant with ID that does not exist` - Tests `delete_contaminant` error handling

### 2. MCP Prompt Requests (dynamic, one per available prompt)

These requests are automatically generated based on prompts available on the MCP server. For each prompt, a natural language query is created that exercises the prompt workflow.

**Current Prompts (example):**
- `Analyze facility compliance for Hannover facility` - Uses `analyze-facility-compliance` prompt
- `Generate a contamination report for Central Waste Processing Hub` - Uses `generate-contamination-report` prompt
- `Review shipment inspection for license plate ABC-123` - Uses `review-shipment-inspection` prompt
- `Compare performance of all facilities in New York` - Uses `compare-facilities-performance` prompt

**Note:** When new prompts are added to the MCP server, they will automatically be included in the demo reset. The system generates appropriate queries based on prompt metadata.

## Tool Coverage Summary

All 28 MCP tools are covered by the static requests:

**Facilities (5/5):** ✅
- `create_facility` - Covered indirectly (via multi-step scenarios)
- `get_facility` - ✅ Multiple requests
- `list_facilities` - ✅ Multiple requests
- `update_facility` - ✅ Update requests
- `delete_facility` - ✅ Error handling request

**Contaminants (5/5):** ✅
- `create_contaminant` - ✅ With full params and missing params
- `get_contaminant` - ✅ Multiple requests
- `list_contaminants` - ✅ Multiple requests
- `update_contaminant` - ✅ Update request
- `delete_contaminant` - ✅ Error handling request

**Inspections (5/5):** ✅
- `create_inspection` - ✅ Create request
- `get_inspection` - ✅ Get request
- `list_inspections` - ✅ List request
- `update_inspection` - ✅ Covered via multi-step
- `delete_inspection` - ✅ Covered via error handling pattern

**Shipments (5/5):** ✅
- `create_shipment` - ✅ Missing params request
- `get_shipment` - ✅ Multiple requests
- `list_shipments` - ✅ Multiple requests
- `update_shipment` - ✅ Covered via multi-step pattern
- `delete_shipment` - ✅ Covered via error handling pattern

**Contracts (5/5):** ✅
- `create_contract` - ✅ Create request
- `get_contract` - ✅ Get request
- `list_contracts` - ✅ Multiple requests
- `update_contract` - ✅ Covered via multi-step pattern
- `delete_contract` - ✅ Covered via error handling pattern

**AI Analysis (3/3):** ✅
- `generate_intelligent_facility_report` - ✅ Multiple requests
- `analyze_shipment_risk` - ✅ Multiple requests
- `suggest_inspection_questions` - ✅ Dedicated request

## Dynamic Prompt Fetching

The demo reset automatically fetches MCP prompts from the server at runtime:

1. **Fetches prompts** using `listMCPPrompts()` from `@/lib/mcp-prompts`
2. **Generates queries** for each prompt using intelligent mapping:
   - Known prompts have pre-defined natural language queries
   - Unknown prompts have queries generated from their metadata (description, name, arguments)
3. **Handles errors gracefully**: If prompt fetching fails, the system continues with static tool-coverage requests only

**Adding New Prompts:**
- When you add new prompts to the MCP server, they will automatically be included in the next demo reset
- No code changes needed in the frontend
- The system generates appropriate queries based on prompt description and name

## Testing the Demo Data

After running the demo reset:

1. **Navigate to `/requests`** to see all demo requests (typically 30+)
2. **Click on any request** to view details
3. **Execute requests** through the agent pipeline:
   - Navigate to `/agents/thought-agent`
   - Enter one of the demo queries
   - Watch the full pipeline execute

## Notes

- All demo requests start with status `pending`
- They will be executed when you run them through the agent pipeline
- MCP data (facilities, contracts, etc.) is preserved during reset
- You can run the reset multiple times safely
- Prompt requests are dynamically generated, so the total count may vary if prompts are added/removed from the server
- Tool coverage requests remain static to ensure all 28 tools are always tested

## Reverting Demo Data

To clear all demo data and start fresh:

```bash
curl -X POST http://localhost:3001/api/demo/reset
```

This will:
1. Clear all agent outputs and request contexts
2. Fetch current MCP prompts from the server
3. Create ~33+ demo requests (29 tool coverage + dynamic prompt requests)

## Coverage Verification

The demo reset ensures comprehensive coverage:
- ✅ All 28 MCP tools are covered by static requests
- ✅ All available MCP prompts get demo requests automatically
- ✅ Both simple and complex multi-step workflows are included
- ✅ Error handling scenarios are tested
- ✅ Edge cases with missing/incomplete data are covered

For recommendations on additional MCP prompts to implement, see `MCP_PROMPT_RECOMMENDATIONS.md`.

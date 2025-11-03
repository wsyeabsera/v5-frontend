# Comprehensive End-to-End Testing Guide

## Overview

This guide provides manual terminal testing instructions using `curl` commands. All tests follow the complete pipeline: **Thought → Planner → Critic → Executor** with proper user feedback handling.

## Test Preparation

### 1. Clear All Agent Histories

```bash
# Clear thought outputs (via MongoDB or API if available)
# Clear planner outputs
# Clear critic outputs  
# Clear executor outputs
```

### 2. Verify Agent Configurations

```bash
# Check that agent configs are enabled
curl -X GET "http://localhost:3001/api/agents/critic-agent" | jq
curl -X GET "http://localhost:3001/api/agents/executor-agent" | jq
```

### 3. Catalog MCP Tools

```bash
# List all available MCP tools
curl -X POST "http://localhost:3000/sse" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | jq
```

## Base URL Configuration

Set in your terminal:
```bash
export BASE_URL="http://localhost:3001"
```

## User Feedback Pattern

### Critic Feedback Pattern

When critique asks questions:

1. **Initial Critique**:
```bash
curl -X POST "${BASE_URL}/api/agents/critic-agent" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": <plan-json>,
    "userQuery": "<original-query>",
    "requestContext": <request-context-json>
  }' | jq > critique-response.json
```

2. **Extract Questions**:
```bash
# View questions asked
cat critique-response.json | jq '.critique.followUpQuestions'

# Extract question IDs
cat critique-response.json | jq '.critique.followUpQuestions[].id'
```

3. **Provide Feedback and Re-critique**:
```bash
curl -X POST "${BASE_URL}/api/agents/critic-agent" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": <plan-json>,
    "userQuery": "<original-query>",
    "requestContext": <request-context-json>,
    "userFeedback": [
      {"questionId": "critic-q-1", "answer": "Your answer here"},
      {"questionId": "critic-q-2", "answer": "Your answer here"}
    ]
  }' | jq
```

### Executor Feedback Pattern

When executor asks questions:

1. **Initial Execution**:
```bash
curl -X POST "${BASE_URL}/api/agents/executor-agent" \
  -H "Content-Type: application/json" \
  -d '{
    "requestContext": <request-context-json>,
    "userQuery": "<original-query>"
  }' | jq > execution-response.json
```

2. **Extract Questions**:
```bash
# View questions asked
cat execution-response.json | jq '.executionResult.questionsAsked'

# Extract question IDs
cat execution-response.json | jq '.executionResult.questionsAsked[].id'
```

3. **Provide Feedback and Resume Execution**:
```bash
curl -X POST "${BASE_URL}/api/agents/executor-agent" \
  -H "Content-Type: application/json" \
  -d '{
    "requestContext": <request-context-json>,
    "userQuery": "<original-query>",
    "userFeedback": [
      {"questionId": "exec-q-1", "answer": "Your answer here"},
      {"questionId": "exec-q-2", "answer": "Your answer here"}
    ]
  }' | jq
```

## Test Scenarios

### Category 1: Facility Operations

#### Test 1.1: Simple Facility List

**Query**: "List all facilities"

**Steps**:

```bash
# Step 1: Generate thoughts
REQUEST_ID="test-1.1-$(date +%s)"
REQUEST_CONTEXT='{"requestId":"'$REQUEST_ID'","createdAt":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","agentChain":[],"status":"pending","userQuery":"List all facilities"}'

curl -X POST "${BASE_URL}/api/agents/thought-agent" \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "List all facilities",
    "requestContext": '"$REQUEST_CONTEXT"'
  }' | jq > thought-response.json

# Extract updated requestContext
REQUEST_CONTEXT=$(cat thought-response.json | jq -c '.requestContext')

# Step 2: Generate plan
curl -X POST "${BASE_URL}/api/agents/planner-agent" \
  -H "Content-Type: application/json" \
  -d '{
    "thoughts": '"$(cat thought-response.json | jq -c '.thoughts')"',
    "userQuery": "List all facilities",
    "requestContext": '"$REQUEST_CONTEXT"'
  }' | jq > plan-response.json

REQUEST_CONTEXT=$(cat plan-response.json | jq -c '.requestContext')
PLAN=$(cat plan-response.json | jq -c '.plan')

# Step 3: Critique plan
curl -X POST "${BASE_URL}/api/agents/critic-agent" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": '"$PLAN"',
    "userQuery": "List all facilities",
    "requestContext": '"$REQUEST_CONTEXT"'
  }' | jq > critique-response.json

# Step 4: Execute plan
curl -X POST "${BASE_URL}/api/agents/executor-agent" \
  -H "Content-Type: application/json" \
  -d '{
    "requestContext": '"$REQUEST_CONTEXT"',
    "userQuery": "List all facilities"
  }' | jq > execution-response.json

# Verify results
echo "Execution Status:"
cat execution-response.json | jq '.executionResult.overallSuccess'
cat execution-response.json | jq '.executionResult.steps | length'
```

**Expected**: No questions asked, execution completes successfully.

#### Test 1.2: Facility by Name (Triggers Coordinator)

**Query**: "Get facility Hannover and show its details"

**Steps**:

```bash
REQUEST_ID="test-1.2-$(date +%s)"
REQUEST_CONTEXT='{"requestId":"'$REQUEST_ID'","createdAt":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","agentChain":[],"status":"pending","userQuery":"Get facility Hannover and show its details"}'

# Step 1: Generate thoughts
curl -X POST "${BASE_URL}/api/agents/thought-agent" \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "Get facility Hannover and show its details",
    "requestContext": '"$REQUEST_CONTEXT"'
  }' | jq > thought-response.json

REQUEST_CONTEXT=$(cat thought-response.json | jq -c '.requestContext')

# Step 2: Generate plan
curl -X POST "${BASE_URL}/api/agents/planner-agent" \
  -H "Content-Type: application/json" \
  -d '{
    "thoughts": '"$(cat thought-response.json | jq -c '.thoughts')"',
    "userQuery": "Get facility Hannover and show its details",
    "requestContext": '"$REQUEST_CONTEXT"'
  }' | jq > plan-response.json

REQUEST_CONTEXT=$(cat plan-response.json | jq -c '.requestContext')
PLAN=$(cat plan-response.json | jq -c '.plan')

# Step 3: Critique plan
curl -X POST "${BASE_URL}/api/agents/critic-agent" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": '"$PLAN"',
    "userQuery": "Get facility Hannover and show its details",
    "requestContext": '"$REQUEST_CONTEXT"'
  }' | jq > critique-response.json

# Check if questions asked
QUESTIONS_COUNT=$(cat critique-response.json | jq '.critique.followUpQuestions | length')
if [ "$QUESTIONS_COUNT" -gt 0 ]; then
  echo "Questions asked. Providing feedback..."
  
  # Extract question IDs and construct feedback
  # Manual step: Review questions and construct appropriate answers
  USER_FEEDBACK=$(cat critique-response.json | jq -c '[.critique.followUpQuestions[] | {questionId: .id, answer: "Hannover"}]')
  
  # Re-critique with feedback
  curl -X POST "${BASE_URL}/api/agents/critic-agent" \
    -H "Content-Type: application/json" \
    -d '{
      "plan": '"$PLAN"',
      "userQuery": "Get facility Hannover and show its details",
      "requestContext": '"$REQUEST_CONTEXT"',
      "userFeedback": '"$USER_FEEDBACK"'
    }' | jq > critique-response-2.json
  
  REQUEST_CONTEXT=$(cat critique-response-2.json | jq -c '.requestContext')
fi

# Step 4: Execute plan
curl -X POST "${BASE_URL}/api/agents/executor-agent" \
  -H "Content-Type: application/json" \
  -d '{
    "requestContext": '"$REQUEST_CONTEXT"',
    "userQuery": "Get facility Hannover and show its details"
  }' | jq > execution-response.json

# Verify coordinator extracted facilityId
echo "Checking coordinator extractions:"
cat execution-response.json | jq '.executionResult.planUpdates[]? | select(.updatedParameters.facilityId != null)'
```

**Expected**: Coordinator extracts facility ID from list results, correct facility retrieved.

#### Test 1.3: Facility Health Report

**Query**: "Generate health report for facility with shortCode NYC"

Follow similar pattern as Test 1.2, checking for questions from both critic and executor.

#### Test 1.4: Create and Update Facility

**Query**: "Create a facility called 'Test Facility' with shortCode 'TEST' in location 'Test City', then update its location to 'Updated City'"

**Expected**: Multi-step execution with parameter coordination between steps.

### Category 2: Contamination Tracking

#### Test 2.1: List Contaminants

**Query**: "Show me all contaminants"

Similar to Test 1.1 - should complete without questions.

#### Test 2.2: Contaminants by Facility Name

**Query**: "Get contaminants for facility Berlin"

**Expected**: Executor coordinates facilityId from previous step (list facilities).

#### Test 2.3: Create Contaminant with Missing Parameters

**Query**: "Create a contaminant for facility New York"

**Steps**:
```bash
# After critique, if questions asked:
USER_FEEDBACK='[
  {"questionId": "critic-q-1", "answer": "Plastic"},
  {"questionId": "critic-q-2", "answer": "Bottle"},
  {"questionId": "critic-q-3", "answer": "low"},
  {"questionId": "critic-q-4", "answer": "low"},
  {"questionId": "critic-q-5", "answer": "low"},
  {"questionId": "critic-q-6", "answer": "5.0"},
  {"questionId": "critic-q-7", "answer": "2024-01-15T10:00:00Z"}
]'

# Re-critique with all required parameters
```

**Expected**: Critique asks for material, wasteItemDetected, explosive_level, hcl_level, so2_level, estimated_size, detection_time.

### Category 3: Shipment Management

#### Test 3.1: Shipment by License Plate

**Query**: "Show shipments for license plate ABC-123"

**Expected**: Coordinator extracts shipmentId from list results.

#### Test 3.2: Complex Shipment Analysis

**Query**: "Create a shipment for facility Boston, then analyze its risk"

**Expected**: Multi-step with parameter extraction from created shipment.

### Category 4: Inspection Workflows

#### Test 4.1: Suggest Inspection Questions

**Query**: "Suggest inspection questions for facility Chicago"

**Expected**: Facility ID coordination, questions generated.

#### Test 4.2: Create Inspection with Missing Data

**Query**: "Create an inspection for facility Miami"

**Expected**: Critique identifies missing params (waste types, heating value, etc.), provide feedback with all required data.

### Category 5: Contract Management

#### Test 5.1: Filter Contracts

**Query**: "Find contracts for producer ABC Corp"

**Expected**: Simple execution with filter parameter.

#### Test 5.2: Create Contract and Link to Shipment

**Query**: "Create contract for producer XYZ, debitor DEF, wasteCode W001, then create shipment using this contract"

**Expected**: Multi-step with parameter extraction (contractId from step 1 → contractId in step 2).

### Category 6: Complex Multi-Step Queries

#### Test 6.1: Multi-Facility Analysis

**Query**: "Get all facilities in New York and show me their contamination rates"

**Expected**: List facilities, then for each facility get contaminants (dependency coordination).

#### Test 6.2: Risk Analysis Workflow

**Query**: "Show me shipments for facility Hannover with high risk, then generate facility health report"

**Expected**: 
1. List shipments (filter by facility name)
2. Coordinator extracts facilityId
3. Analyze each shipment risk
4. Filter high-risk shipments
5. Generate health report

#### Test 6.3: Cross-Entity Query

**Query**: "Find contracts for producer ABC and list all associated shipments"

**Expected**: List contracts (filter by producer), then for each contract list shipments (filter by contractId).

## Verification Checklist

### Pipeline Completeness
- [ ] Thought agent generates insights
- [ ] Planner generates valid plans using only actual MCP tools
- [ ] Critic evaluates plans and generates questions when needed
- [ ] User feedback properly integrated into critique regeneration
- [ ] Executor receives critique and respects recommendations
- [ ] Executor asks questions when parameters missing
- [ ] User feedback properly integrated into execution resumption

### Coordinator Intelligence
- [ ] Coordinator correctly extracts IDs from array results
- [ ] Coordinator handles empty arrays properly (no "null" extraction)
- [ ] Parameter coordination works across all tool types
- [ ] Name→ID resolution works (e.g., "Hannover" → facility ID)

### Execution Quality
- [ ] Execution succeeds for all valid queries
- [ ] Error handling works for invalid queries
- [ ] Plan updates tracked when parameters extracted
- [ ] Multi-step dependencies resolved correctly

### Parameter Handling
- [ ] Required parameters provided when questions asked
- [ ] Feedback answers correctly applied to plan regeneration
- [ ] Feedback answers correctly applied to execution resumption
- [ ] Missing params trigger questions, not silent failures

## Helper Functions (for bash testing)

Save these in your terminal session or as functions:

```bash
# Extract requestContext from response
extract_request_context() {
  local file=$1
  cat "$file" | jq -c '.requestContext'
}

# Extract plan from response
extract_plan() {
  local file=$1
  cat "$file" | jq -c '.plan'
}

# Extract thoughts from response
extract_thoughts() {
  local file=$1
  cat "$file" | jq -c '.thoughts'
}

# Check if questions were asked (critic)
has_critic_questions() {
  local file=$1
  local count=$(cat "$file" | jq '.critique.followUpQuestions | length')
  [ "$count" -gt 0 ]
}

# Check if questions were asked (executor)
has_executor_questions() {
  local file=$1
  local count=$(cat "$file" | jq '.executionResult.questionsAsked | length')
  [ "$count" -gt 0 ]
}

# Generate request ID
generate_request_id() {
  echo "test-$(date +%s)-$$"
}
```

## Test Documentation Template

For each test, document:

1. **Test Name**: Category X.Y - Test Name
2. **Query**: Exact user query
3. **Steps Executed**: All curl commands used
4. **Questions Asked**: List of questions from critic/executor
5. **Feedback Provided**: JSON feedback arrays used
6. **Results**: Execution success/failure, steps executed
7. **Coordinator Extractions**: Any IDs extracted from previous steps
8. **Observations**: Notes about behavior, issues found
9. **Pass/Fail**: Overall test result

## Notes

- Always use `jq` for formatting JSON responses
- Save intermediate responses to files for reference
- Extract `requestContext` from each response to pass to next step
- Manually review questions before constructing feedback
- Verify coordinator extractions in `planUpdates` array
- Check `executionVersion` and `critiqueVersion` for version tracking

## Missing Executor Features (To Implement After Tests)

1. **Better question handling**: More intelligent extraction of answers from feedback into plan parameters
2. **Partial execution state management**: When pausing for feedback, better state preservation
3. **Adaptive plan modification**: More sophisticated plan updates when feedback changes requirements
4. **Multi-turn feedback loops**: Handle cases where executor asks follow-up questions after receiving initial feedback
5. **Error recovery with feedback**: When errors occur, ask user for guidance rather than just retrying

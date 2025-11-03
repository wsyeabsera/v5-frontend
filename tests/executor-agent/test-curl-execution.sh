#!/bin/bash

# Test 1: Simple Execution
# Tests basic plan execution without coordination

BASE_URL="http://localhost:3001"
FIXTURES_DIR="tests/executor-agent/fixtures"

echo "🧪 Testing Simple Execution"
echo "=================================="

# First, generate a plan
echo "📝 Step 1: Generating plan..."
PLAN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/agents/planner-agent" \
  -H "Content-Type: application/json" \
  -d @$FIXTURES_DIR/simple-execution.json)

REQUEST_ID=$(echo $PLAN_RESPONSE | jq -r '.requestContext.requestId')

if [ -z "$REQUEST_ID" ] || [ "$REQUEST_ID" == "null" ]; then
  echo "❌ Failed to generate plan"
  exit 1
fi

echo "✅ Plan generated (requestId: $REQUEST_ID)"

# Execute the plan
echo "🚀 Step 2: Executing plan..."
EXEC_RESPONSE=$(curl -s -X POST "$BASE_URL/api/agents/executor-agent" \
  -H "Content-Type: application/json" \
  -d "{
    \"requestContext\": {
      \"requestId\": \"$REQUEST_ID\",
      \"createdAt\": \"2024-01-01T00:00:00.000Z\",
      \"agentChain\": [],
      \"status\": \"pending\"
    },
    \"userQuery\": \"List all facilities\"
  }")

SUCCESS=$(echo $EXEC_RESPONSE | jq -r '.executionResult.overallSuccess // false')
STEPS=$(echo $EXEC_RESPONSE | jq -r '.executionResult.steps | length')

if [ "$SUCCESS" == "true" ]; then
  echo "✅ Execution succeeded"
  echo "   Steps executed: $STEPS"
  echo "   Result: $EXEC_RESPONSE" | jq '.executionResult.steps[0].result' | head -5
else
  echo "❌ Execution failed"
  echo "$EXEC_RESPONSE" | jq '.executionResult.errors'
  exit 1
fi

echo "✅ Simple execution test passed"


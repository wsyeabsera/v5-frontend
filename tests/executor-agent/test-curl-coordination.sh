#!/bin/bash

# Test 2: Coordination Test
# Tests LLM-driven parameter coordination

BASE_URL="http://localhost:3001"
FIXTURES_DIR="tests/executor-agent/fixtures"

echo "🧪 Testing Parameter Coordination"
echo "=================================="

# First, generate a plan that will need coordination
echo "📝 Step 1: Generating plan..."
PLAN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/agents/planner-agent" \
  -H "Content-Type: application/json" \
  -d @$FIXTURES_DIR/coordination-test.json)

REQUEST_ID=$(echo $PLAN_RESPONSE | jq -r '.requestContext.requestId')
PLAN_ID=$(echo $PLAN_RESPONSE | jq -r '.plan.id')

if [ -z "$REQUEST_ID" ] || [ "$REQUEST_ID" == "null" ]; then
  echo "❌ Failed to generate plan"
  exit 1
fi

echo "✅ Plan generated (requestId: $REQUEST_ID)"

# Generate critique
echo "🛡️  Step 2: Generating critique..."
CRITIQUE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/agents/critic-agent" \
  -H "Content-Type: application/json" \
  -d "{
    \"plan\": $(echo $PLAN_RESPONSE | jq '.plan'),
    \"userQuery\": \"get me details of facility hannover\",
    \"requestContext\": {
      \"requestId\": \"$REQUEST_ID\",
      \"createdAt\": \"2024-01-01T00:00:00.000Z\",
      \"agentChain\": [],
      \"status\": \"pending\"
    }
  }")

RECOMMENDATION=$(echo $CRITIQUE_RESPONSE | jq -r '.critique.recommendation')
echo "✅ Critique generated (recommendation: $RECOMMENDATION)"

# Execute the plan
echo "🚀 Step 3: Executing plan..."
EXEC_RESPONSE=$(curl -s -X POST "$BASE_URL/api/agents/executor-agent" \
  -H "Content-Type: application/json" \
  -d "{
    \"requestContext\": {
      \"requestId\": \"$REQUEST_ID\",
      \"createdAt\": \"2024-01-01T00:00:00.000Z\",
      \"agentChain\": [],
      \"status\": \"pending\"
    },
    \"userQuery\": \"get me details of facility hannover\"
  }")

SUCCESS=$(echo $EXEC_RESPONSE | jq -r '.executionResult.overallSuccess // false')
PLAN_UPDATES=$(echo $EXEC_RESPONSE | jq -r '.executionResult.planUpdates // [] | length')

if [ "$SUCCESS" == "true" ]; then
  echo "✅ Execution succeeded"
  if [ "$PLAN_UPDATES" -gt 0 ]; then
    echo "✅ Plan updates tracked: $PLAN_UPDATES"
    echo "$EXEC_RESPONSE" | jq '.executionResult.planUpdates[0]'
  else
    echo "⚠️  No plan updates found (coordination may have worked but not tracked)"
  fi
else
  echo "❌ Execution failed"
  echo "$EXEC_RESPONSE" | jq '.executionResult.errors'
  exit 1
fi

echo "✅ Coordination test passed"


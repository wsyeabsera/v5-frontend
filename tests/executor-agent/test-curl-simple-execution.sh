#!/bin/bash

# Test: Simple Execution (no coordination needed)
# Tests basic execution flow

echo "🧪 Test: Simple Execution (list all facilities)"
echo "=================================================================================="
echo ""

REQUEST_ID="test-simple-$(date +%s)"

# Step 1: Generate thoughts
echo "Step 1: Generating thoughts..."
THOUGHT_RESPONSE=$(curl -s -X POST http://localhost:3001/api/agents/thought-agent \
  -H "Content-Type: application/json" \
  -d "{
    \"userQuery\": \"list all facilities\",
    \"requestContext\": {
      \"requestId\": \"$REQUEST_ID\",
      \"createdAt\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",
      \"agentChain\": [],
      \"status\": \"pending\"
    }
  }")

REQUEST_CONTEXT=$(echo $THOUGHT_RESPONSE | jq -r '.requestContext')

echo "✅ Thoughts generated"
echo ""

# Step 2: Generate plan
echo "Step 2: Generating plan..."
PLAN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/agents/planner-agent \
  -H "Content-Type: application/json" \
  -d "{
    \"thoughts\": $(echo $THOUGHT_RESPONSE | jq '.thoughts'),
    \"userQuery\": \"list all facilities\",
    \"requestContext\": $REQUEST_CONTEXT
  }")

PLAN=$(echo $PLAN_RESPONSE | jq '.plan')
echo "✅ Plan generated ($(echo $PLAN | jq '.steps | length') steps)"
echo ""

# Step 3: Execute plan
echo "Step 3: Executing plan..."
EXEC_RESPONSE=$(curl -s -X POST http://localhost:3001/api/agents/executor-agent \
  -H "Content-Type: application/json" \
  -d "{
    \"requestContext\": $REQUEST_CONTEXT,
    \"userQuery\": \"list all facilities\"
  }")

SUCCESS=$(echo $EXEC_RESPONSE | jq -r '.executionResult.overallSuccess')
STEPS=$(echo $EXEC_RESPONSE | jq '.executionResult.steps | length')
STEPS_SUCCEEDED=$(echo $EXEC_RESPONSE | jq '[.executionResult.steps[] | select(.success == true)] | length')

echo "✅ Execution completed"
echo ""
echo "Results:"
echo "  Success: $SUCCESS"
echo "  Steps: $STEPS_SUCCEEDED/$STEPS succeeded"
echo ""

if [ "$SUCCESS" = "true" ]; then
  echo "✅ Test PASSED"
  exit 0
else
  echo "❌ Test FAILED"
  echo $EXEC_RESPONSE | jq '.executionResult.errors // []'
  exit 1
fi


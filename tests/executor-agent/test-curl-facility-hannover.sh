#!/bin/bash

# Test: Facility Name to ID Resolution
# This tests the main fix - extracting ID from list results

echo "🧪 Test: Get facility details for 'hannover' (name → ID resolution)"
echo "=================================================================================="
echo ""

REQUEST_ID="test-hannover-$(date +%s)"

# Step 1: Generate thoughts
echo "Step 1: Generating thoughts..."
THOUGHT_RESPONSE=$(curl -s -X POST http://localhost:3001/api/agents/thought-agent \
  -H "Content-Type: application/json" \
  -d "{
    \"userQuery\": \"get me details of facility hannover\",
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
    \"userQuery\": \"get me details of facility hannover\",
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
    \"userQuery\": \"get me details of facility hannover\"
  }")

SUCCESS=$(echo $EXEC_RESPONSE | jq -r '.executionResult.overallSuccess')
STEPS=$(echo $EXEC_RESPONSE | jq '.executionResult.steps | length')
PLAN_UPDATES=$(echo $EXEC_RESPONSE | jq '.executionResult.planUpdates // [] | length')

echo "✅ Execution completed"
echo ""
echo "Results:"
echo "  Success: $SUCCESS"
echo "  Steps executed: $STEPS"
echo "  Plan updates: $PLAN_UPDATES"
echo ""

if [ "$PLAN_UPDATES" -gt 0 ]; then
  echo "📊 Plan Updates:"
  echo $EXEC_RESPONSE | jq -r '.executionResult.planUpdates[] | "  Step \(.stepOrder):\n    Original: \(.originalParameters)\n    Updated:  \(.updatedParameters)\n    Reason:   \(.reason)"'
  echo ""
fi

if [ "$SUCCESS" = "true" ]; then
  echo "✅ Test PASSED"
  exit 0
else
  echo "❌ Test FAILED"
  echo $EXEC_RESPONSE | jq '.executionResult.errors // []'
  exit 1
fi


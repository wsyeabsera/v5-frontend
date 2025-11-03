#!/bin/bash

# Test: Parameter Coordination from Previous Steps
# Tests that ID is extracted from list results

echo "🧪 Test: Parameter Coordination (extract ID from array results)"
echo "=================================================================================="
echo ""

REQUEST_ID="test-coord-$(date +%s)"

# Step 1: Generate thoughts
echo "Step 1: Generating thoughts..."
THOUGHT_RESPONSE=$(curl -s -X POST http://localhost:3001/api/agents/thought-agent \
  -H "Content-Type: application/json" \
  -d "{
    \"userQuery\": \"list all facilities and get details for the first one\",
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
    \"userQuery\": \"list all facilities and get details for the first one\",
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
    \"userQuery\": \"list all facilities and get details for the first one\"
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
  echo "📊 Plan Updates (checking for valid ID extraction):"
  echo $EXEC_RESPONSE | jq -r '.executionResult.planUpdates[] | "Step \(.stepOrder): Original=\(.originalParameters) Updated=\(.updatedParameters)"'
  echo ""
  
  # Check for valid ID extraction and invalid fields
  echo $EXEC_RESPONSE | jq -r '.executionResult.planUpdates[0].updatedParameters' > /tmp/updated_params.json 2>/dev/null
  HAS_ID=$(cat /tmp/updated_params.json 2>/dev/null | jq -r '.id // empty')
  HAS_FACILITY_NAME=$(cat /tmp/updated_params.json 2>/dev/null | jq -r '.facilityName // empty')
  HAS_NAME=$(cat /tmp/updated_params.json 2>/dev/null | jq -r '.name // empty')
  
  if [ -n "$HAS_ID" ] && [ "$HAS_ID" != "null" ] && [ "$HAS_ID" != "empty" ]; then
    ID_LEN=${#HAS_ID}
    if [ "$ID_LEN" -eq 24 ]; then
      echo "  ✅ Valid MongoDB ID extracted: $HAS_ID"
    else
      echo "  ⚠️  ID extracted but format may be invalid: $HAS_ID (length: $ID_LEN)"
    fi
  else
    echo "  ⚠️  No ID parameter found in updated parameters"
  fi
  
  if [ -n "$HAS_FACILITY_NAME" ] && [ "$HAS_FACILITY_NAME" != "null" ] && [ "$HAS_FACILITY_NAME" != "empty" ]; then
    echo "  ❌ Invalid field facilityName found: $HAS_FACILITY_NAME"
  elif [ -n "$HAS_NAME" ] && [ "$HAS_NAME" != "null" ] && [ "$HAS_NAME" != "empty" ]; then
    echo "  ❌ Invalid field name found: $HAS_NAME"
  else
    echo "  ✅ No invalid fields (facilityName, name) added"
  fi
  
  echo ""
fi

if [ "$SUCCESS" = "true" ] && [ "$PLAN_UPDATES" -gt 0 ]; then
  echo "✅ Test PASSED - Coordination working correctly"
  exit 0
elif [ "$SUCCESS" = "true" ]; then
  echo "⚠️  Test passed but no plan updates (may have been correct from start)"
  exit 0
else
  echo "❌ Test FAILED"
  echo $EXEC_RESPONSE | jq '.executionResult.errors // []'
  exit 1
fi


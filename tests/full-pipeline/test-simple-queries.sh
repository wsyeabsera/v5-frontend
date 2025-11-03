#!/bin/bash

# Simple focused tests for specific scenarios

BASE_URL="http://localhost:3001"

test_query() {
  local query="$1"
  local test_name="$2"
  local request_id="simple-test-$(date +%s)-${test_name}"
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🧪 $test_name"
  echo "Query: \"$query\""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Full pipeline
  THOUGHT=$(curl -s -X POST "${BASE_URL}/api/agents/thought-agent" \
    -H "Content-Type: application/json" \
    -d "{\"userQuery\":\"$query\",\"requestContext\":{\"requestId\":\"$request_id\",\"createdAt\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",\"agentChain\":[],\"status\":\"pending\"}}")
  
  REQUEST_CTX=$(echo $THOUGHT | jq -c '.requestContext')
  
  PLAN=$(curl -s -X POST "${BASE_URL}/api/agents/planner-agent" \
    -H "Content-Type: application/json" \
    -d "{\"thoughts\":$(echo $THOUGHT | jq -c '.thoughts'),\"userQuery\":\"$query\",\"requestContext\":$REQUEST_CTX}")
  
  CRITIQUE=$(curl -s -X POST "${BASE_URL}/api/agents/critic-agent" \
    -H "Content-Type: application/json" \
    -d "{\"plan\":$(echo $PLAN | jq -c '.plan'),\"userQuery\":\"$query\",\"requestContext\":$REQUEST_CTX}")
  
  EXEC=$(curl -s -X POST "${BASE_URL}/api/agents/executor-agent" \
    -H "Content-Type: application/json" \
    -d "{\"requestContext\":$REQUEST_CTX,\"userQuery\":\"$query\"}")
  
  SUCCESS=$(echo $EXEC | jq -r '.executionResult.overallSuccess // false')
  STEPS=$(echo $EXEC | jq '[.executionResult.steps[] | select(.success == true)] | length')
  TOTAL=$(echo $EXEC | jq '.executionResult.steps | length')
  UPDATES=$(echo $EXEC | jq '.executionResult.planUpdates // [] | length')
  
  echo "  Success: $SUCCESS"
  echo "  Steps: $STEPS/$TOTAL"
  echo "  Plan Updates: $UPDATES"
  
  if [ "$UPDATES" -gt 0 ]; then
    echo ""
    echo "  Plan Updates Details:"
    echo $EXEC | jq -r '.executionResult.planUpdates[] | "    Step \(.stepOrder): \(.originalParameters) → \(.updatedParameters)"'
  fi
  
  if [ "$SUCCESS" = "true" ]; then
    echo ""
    echo "  ✅ PASSED"
    return 0
  else
    echo ""
    echo "  ❌ FAILED"
    echo $EXEC | jq -r '.executionResult.errors[]? // empty' | sed 's/^/    /'
    return 1
  fi
}

echo "═══════════════════════════════════════════════════════════════════════════"
echo "SIMPLE QUERY TESTS"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

test_query "get me details of facility hannover" "Facility by Name"
echo ""
sleep 2

test_query "list all facilities" "List Facilities"
echo ""
sleep 2

test_query "what contaminants are at hannover facility" "Contaminants by Facility Name"
echo ""
sleep 2

test_query "show me the shipment with license plate ABC-123" "Shipment by License Plate"
echo ""
sleep 2

test_query "generate a health report for hannover facility" "Health Report"
echo ""

echo "═══════════════════════════════════════════════════════════════════════════"
echo "TESTS COMPLETE"
echo "═══════════════════════════════════════════════════════════════════════════"


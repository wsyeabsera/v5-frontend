#!/bin/bash

# Comprehensive MCP Tool and Agent Pipeline Test
# Tests realistic queries that the AI should answer using MCP tools

BASE_URL="http://localhost:3001"
REQUEST_ID_PREFIX="test-mcp-$(date +%s)"

echo "═══════════════════════════════════════════════════════════════════════════"
echo "MCP TOOL & AI AGENT PIPELINE TEST SUITE"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo "Testing realistic queries that should use MCP tools"
echo ""

# Helper function to run full pipeline
run_pipeline() {
  local query="$1"
  local test_name="$2"
  local request_id="${REQUEST_ID_PREFIX}-${test_name}"
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Test: $test_name"
  echo "Query: \"$query\""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  # Step 1: Generate thoughts
  echo "1️⃣  Generating thoughts..."
  THOUGHT=$(curl -s -X POST "${BASE_URL}/api/agents/thought-agent" \
    -H "Content-Type: application/json" \
    -d "{
      \"userQuery\": \"$query\",
      \"requestContext\": {
        \"requestId\": \"$request_id\",
        \"createdAt\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",
        \"agentChain\": [],
        \"status\": \"pending\"
      }
    }")
  
  if [ $? -ne 0 ] || [ -z "$THOUGHT" ]; then
    echo "❌ Failed to generate thoughts"
    return 1
  fi
  
  REQUEST_CTX=$(echo $THOUGHT | jq -c '.requestContext')
  echo "✅ Thoughts generated"
  echo ""
  
  # Step 2: Generate plan
  echo "2️⃣  Generating plan..."
  PLAN=$(curl -s -X POST "${BASE_URL}/api/agents/planner-agent" \
    -H "Content-Type: application/json" \
    -d "{
      \"thoughts\": $(echo $THOUGHT | jq -c '.thoughts'),
      \"userQuery\": \"$query\",
      \"requestContext\": $REQUEST_CTX
    }")
  
  if [ $? -ne 0 ] || [ -z "$PLAN" ]; then
    echo "❌ Failed to generate plan"
    return 1
  fi
  
  PLAN_STEPS=$(echo $PLAN | jq '.plan.steps | length')
  echo "✅ Plan generated ($PLAN_STEPS steps)"
  
  # Show plan steps
  echo $PLAN | jq -r '.plan.steps[] | "  Step \(.order): \(.action) - \(.description)"'
  echo ""
  
  # Step 3: Generate critique
  echo "3️⃣  Generating critique..."
  CRITIQUE=$(curl -s -X POST "${BASE_URL}/api/agents/critic-agent" \
    -H "Content-Type: application/json" \
    -d "{
      \"plan\": $(echo $PLAN | jq -c '.plan'),
      \"userQuery\": \"$query\",
      \"requestContext\": $REQUEST_CTX
    }")
  
  if [ $? -ne 0 ] || [ -z "$CRITIQUE" ]; then
    echo "❌ Failed to generate critique"
    return 1
  fi
  
  CRITIQUE_REC=$(echo $CRITIQUE | jq -r '.critique.recommendation')
  echo "✅ Critique: $CRITIQUE_REC"
  echo ""
  
  # Step 4: Execute plan
  echo "4️⃣  Executing plan..."
  EXEC=$(curl -s -X POST "${BASE_URL}/api/agents/executor-agent" \
    -H "Content-Type: application/json" \
    -d "{
      \"requestContext\": $REQUEST_CTX,
      \"userQuery\": \"$query\"
    }")
  
  if [ $? -ne 0 ] || [ -z "$EXEC" ]; then
    echo "❌ Failed to execute plan"
    return 1
  fi
  
  SUCCESS=$(echo $EXEC | jq -r '.executionResult.overallSuccess // false')
  STEPS_EXEC=$(echo $EXEC | jq '.executionResult.steps | length')
  STEPS_SUCC=$(echo $EXEC | jq '[.executionResult.steps[] | select(.success == true)] | length')
  
  echo "✅ Execution completed"
  echo ""
  echo "📊 Results:"
  echo "  Success: $SUCCESS"
  echo "  Steps: $STEPS_SUCC/$STEPS_EXEC succeeded"
  
  # Show executed steps
  echo ""
  echo "Executed Steps:"
  echo $EXEC | jq -r '.executionResult.steps[] | "  Step \(.stepOrder): \(.toolCalled // .action) - \(if .success then "✅" else "❌" end) \(.error // "")"'
  
  # Show plan updates if any
  PLAN_UPDATES=$(echo $EXEC | jq '.executionResult.planUpdates // [] | length')
  if [ "$PLAN_UPDATES" -gt 0 ]; then
    echo ""
    echo "📝 Plan Updates:"
    echo $EXEC | jq -r '.executionResult.planUpdates[] | "  Step \(.stepOrder): \(.originalParameters) → \(.updatedParameters)"'
  fi
  
  # Show errors if any
  ERRORS=$(echo $EXEC | jq '.executionResult.errors // [] | length')
  if [ "$ERRORS" -gt 0 ]; then
    echo ""
    echo "⚠️  Errors:"
    echo $EXEC | jq -r '.executionResult.errors[] | "  - \(.)"'
  fi
  
  echo ""
  
  if [ "$SUCCESS" = "true" ]; then
    echo "✅ Test PASSED"
    return 0
  else
    echo "❌ Test FAILED"
    return 1
  fi
}

# Test 1: Facility health report (should use intelligent report tool)
echo "🧪 Test 1: Facility Health Report"
run_pipeline "Generate a health report for the Hannover facility" "facility-report"
echo ""

sleep 2

# Test 2: List facilities with analysis
echo "🧪 Test 2: List and Analyze Facilities"
run_pipeline "List all facilities and show me which one has the most shipments" "facilities-analysis"
echo ""

sleep 2

# Test 3: Contamination tracking
echo "🧪 Test 3: Contamination Analysis"
run_pipeline "What contaminants have been detected at the Hannover facility?" "contamination-check"
echo ""

sleep 2

# Test 4: Shipment inspection review
echo "🧪 Test 4: Shipment Review"
run_pipeline "Show me details about the shipment with license plate ABC-123" "shipment-review"
echo ""

sleep 2

# Test 5: Multi-step facility coordination
echo "🧪 Test 5: Facility Details (Name → ID Resolution)"
run_pipeline "Get me detailed information about the facility in New York called Central Waste Processing Hub" "facility-details-ny"
echo ""

sleep 2

# Test 6: Contract analysis
echo "🧪 Test 6: Contract Information"
run_pipeline "List all contracts and show me which producer has the most contracts" "contract-analysis"
echo ""

sleep 2

echo "═══════════════════════════════════════════════════════════════════════════"
echo "TEST SUITE COMPLETE"
echo "═══════════════════════════════════════════════════════════════════════════"


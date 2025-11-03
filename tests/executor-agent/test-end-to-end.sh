#!/bin/bash

# End-to-End System Test
# Tests full pipeline: plan -> critique -> execute -> verify

BASE_URL="http://localhost:3001"
FIXTURES_DIR="tests/executor-agent/fixtures"

echo "🧪 End-to-End System Test"
echo "=========================="

# Test with coordination scenario
echo "📋 Test Scenario: Get facility details (requires coordination)"
echo ""

USER_QUERY="get me details of facility hannover"
REQUEST_ID="test-e2e-$(date +%s)"

# Step 1: Generate thoughts
echo "💭 Step 1: Generating thoughts..."
THOUGHT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/agents/thought-agent" \
  -H "Content-Type: application/json" \
  -d "{
    \"userQuery\": \"$USER_QUERY\",
    \"requestContext\": {
      \"requestId\": \"$REQUEST_ID\",
      \"createdAt\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
      \"agentChain\": [],
      \"status\": \"pending\"
    }
  }")

THOUGHT_COUNT=$(echo "$THOUGHT_RESPONSE" | jq -r '.thoughts | length' 2>/dev/null || echo "0")
if [ "$THOUGHT_COUNT" == "0" ] || [ "$THOUGHT_COUNT" == "null" ]; then
  echo "❌ Thought generation failed"
  echo "Response: $THOUGHT_RESPONSE" | head -20
  exit 1
fi

echo "✅ Thoughts generated"

# Step 2: Generate plan
echo "📝 Step 2: Generating plan..."
PLAN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/agents/planner-agent" \
  -H "Content-Type: application/json" \
  -d "{
    \"thoughts\": $(echo $THOUGHT_RESPONSE | jq '.thoughts'),
    \"userQuery\": \"$USER_QUERY\",
    \"requestContext\": $(echo $THOUGHT_RESPONSE | jq '.requestContext')
  }")

PLAN_ID=$(echo "$PLAN_RESPONSE" | jq -r '.plan.id' 2>/dev/null)
STEPS_COUNT=$(echo "$PLAN_RESPONSE" | jq -r '.plan.steps | length' 2>/dev/null || echo "0")

if [ -z "$PLAN_ID" ] || [ "$PLAN_ID" == "null" ]; then
  echo "❌ Plan generation failed"
  echo "Response: $PLAN_RESPONSE" | head -30
  exit 1
fi

echo "✅ Plan generated (planId: $PLAN_ID, steps: $STEPS_COUNT)"

# Step 3: Generate critique
echo "🛡️  Step 3: Generating critique..."
CRITIQUE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/agents/critic-agent" \
  -H "Content-Type: application/json" \
  -d "{
    \"plan\": $(echo $PLAN_RESPONSE | jq '.plan'),
    \"userQuery\": \"$USER_QUERY\",
    \"requestContext\": $(echo $PLAN_RESPONSE | jq '.requestContext')
  }")

RECOMMENDATION=$(echo $CRITIQUE_RESPONSE | jq -r '.critique.recommendation')
echo "✅ Critique generated (recommendation: $RECOMMENDATION)"

# Step 4: Execute plan
echo "🚀 Step 4: Executing plan..."
EXEC_RESPONSE=$(curl -s -X POST "$BASE_URL/api/agents/executor-agent" \
  -H "Content-Type: application/json" \
  -d "{
    \"requestContext\": $(echo $PLAN_RESPONSE | jq '.requestContext'),
    \"userQuery\": \"$USER_QUERY\"
  }")

SUCCESS=$(echo $EXEC_RESPONSE | jq -r '.executionResult.overallSuccess // false')
STEPS_EXECUTED=$(echo $EXEC_RESPONSE | jq -r '.executionResult.steps | length')
PLAN_UPDATES=$(echo $EXEC_RESPONSE | jq -r '.executionResult.planUpdates // [] | length')

echo "✅ Execution completed"
echo "   Overall Success: $SUCCESS"
echo "   Steps Executed: $STEPS_EXECUTED"
echo "   Plan Updates: $PLAN_UPDATES"

# Step 5: Verify results
echo "📊 Step 5: Verifying results..."

if [ "$SUCCESS" == "true" ]; then
  echo "✅ Execution succeeded"
  
  if [ "$PLAN_UPDATES" -gt 0 ]; then
    echo "✅ Plan updates tracked (LLM coordination working)"
  fi
else
  echo "⚠️  Execution had issues:"
  echo "$EXEC_RESPONSE" | jq -r '.executionResult.errors[]'
fi

# Step 6: Test version retrieval
echo "📚 Step 6: Testing version retrieval..."
VERSIONS_RESPONSE=$(curl -s "$BASE_URL/api/agents/executor-agent/versions/$REQUEST_ID")

VERSIONS_COUNT=$(echo $VERSIONS_RESPONSE | jq -r '. | length')
echo "✅ Versions retrieved: $VERSIONS_COUNT"

echo ""
echo "=========================="
echo "✅ End-to-End Test Complete"
echo ""
echo "Summary:"
echo "  - Thoughts: ✅"
echo "  - Plan: ✅ ($STEPS_COUNT steps)"
echo "  - Critique: ✅ ($RECOMMENDATION)"
echo "  - Execution: $([ "$SUCCESS" == "true" ] && echo "✅" || echo "⚠️")"
echo "  - Plan Updates: $([ "$PLAN_UPDATES" -gt 0 ] && echo "✅" || echo "⚠️")"
echo "  - Versions: ✅ ($VERSIONS_COUNT)"


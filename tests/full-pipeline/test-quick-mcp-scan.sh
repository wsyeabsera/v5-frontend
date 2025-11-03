#!/bin/bash

# Quick MCP Server Scan and Tool Test
# Quickly tests available tools and creates a summary

echo "═══════════════════════════════════════════════════════════════════════════"
echo "MCP SERVER SCAN & TOOL INVENTORY"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

MCP_URL="http://localhost:3000/sse"

# Get all tools
echo "📋 Fetching MCP Tools..."
TOOLS_RESPONSE=$(curl -s -X POST "$MCP_URL" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}')

echo "$TOOLS_RESPONSE" | jq -r '.result.tools[] | "\(.name) - \(.description)"' > /tmp/tools_list.txt
TOOL_COUNT=$(echo "$TOOLS_RESPONSE" | jq '.result.tools | length')
echo "✅ Found $TOOL_COUNT tools"
echo ""

# Get all prompts
echo "📋 Fetching MCP Prompts..."
PROMPTS_RESPONSE=$(curl -s -X POST "$MCP_URL" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"prompts/list","params":{}}')

echo "$PROMPTS_RESPONSE" | jq -r '.result.prompts[] | "\(.name) - \(.description)"' > /tmp/prompts_list.txt
PROMPT_COUNT=$(echo "$PROMPTS_RESPONSE" | jq '.result.prompts | length')
echo "✅ Found $PROMPT_COUNT prompts"
echo ""

# Test sample tools
echo "🧪 Testing Sample Tools..."
echo ""

echo "1. Testing list_facilities..."
FACILITIES=$(curl -s -X POST "$MCP_URL" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_facilities","arguments":{}}}')

FAC_COUNT=$(echo "$FACILITIES" | jq '.result.content | if type=="array" then length else 0 end')
echo "   ✅ Found $FAC_COUNT facilities"
echo ""

echo "2. Testing list_contracts..."
CONTRACTS=$(curl -s -X POST "$MCP_URL" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"list_contracts","arguments":{}}}')

CONT_COUNT=$(echo "$CONTRACTS" | jq '.result.content | if type=="array" then length else 0 end')
echo "   ✅ Found $CONT_COUNT contracts"
echo ""

echo "3. Testing intelligent facility report..."
HANNOVER_ID="6905db9211cc522275d5f013"
REPORT=$(curl -s -X POST "$MCP_URL" \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":5,\"method\":\"tools/call\",\"params\":{\"name\":\"generate_intelligent_facility_report\",\"arguments\":{\"facilityId\":\"$HANNOVER_ID\",\"includeRecommendations\":true}}}")

REPORT_EXISTS=$(echo "$REPORT" | jq -r '.result.content.reportId // empty')
if [ -n "$REPORT_EXISTS" ]; then
  echo "   ✅ Generated facility report: $REPORT_EXISTS"
else
  echo "   ⚠️  Report generation may have failed"
fi
echo ""

echo "═══════════════════════════════════════════════════════════════════════════"
echo "TOOL INVENTORY SUMMARY"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo "Available Tools ($TOOL_COUNT):"
cat /tmp/tools_list.txt | sed 's/^/  • /'
echo ""
echo "Available Prompts ($PROMPT_COUNT):"
cat /tmp/prompts_list.txt | sed 's/^/  • /'
echo ""
echo "═══════════════════════════════════════════════════════════════════════════"


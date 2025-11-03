# MCP Prompts Integration Plan

## Current State Analysis

### What's Working
✅ MCP prompts are listed in thought/planner agent system prompts  
✅ 4 MCP prompts available on server:
- `analyze-facility-compliance` - Compliance analysis
- `generate-contamination-report` - Contamination reports
- `review-shipment-inspection` - Shipment reviews
- `compare-facilities-performance` - Multi-facility comparison

### What's Missing
❌ **MCP prompts are NEVER invoked** - They're only shown as metadata  
❌ `getMCPPrompt()` exists but is unused  
❌ Thought agent doesn't use prompts even when complexity is high  
❌ Agent system prompts show prompts without arguments  

### The Gap
Looking at MCP prompt response structure:
```json
{
  "description": "Analyze a facility's compliance...",
  "messages": [
    {
      "role": "user",
      "content": {
        "type": "text",
        "text": "Please analyze the compliance status of facility ID: ... Use the available tools to gather this information: ... Provide a comprehensive analysis with: ..."
      }
    }
  ]
}
```

**MCP prompts are context-rich, structured instructions** that should replace or enhance simple user queries when:
1. Query complexity is high (reasoningPasses > 1)
2. Query matches a prompt's domain (facility compliance, contamination, shipments, performance)
3. More structured analysis is needed

## Proposed Solution

### Phase 1: Thought Agent Enhancement (High Priority)

**When to Use MCP Prompts:**
- Query complexity score > 0.5 OR reasoningPasses > 1
- User query semantically matches a prompt's domain
- Available tools match the prompt's requirements

**Implementation Strategy:**

#### Option A: Replace User Query with MCP Prompt Messages (Recommended)
```typescript
// In buildThoughtPrompt()
if (shouldUseMCPPrompt(query, context)) {
  const prompt = await findBestMCPPrompt(query, mcpContext)
  if (prompt) {
    // Get the prompt content
    const promptContent = await getMCPPrompt(prompt.name, extractArgs(query, prompt))
    // Use prompt messages instead of raw user query
    return buildPromptFromMCPMessages(promptContent.messages)
  }
}
```

**Benefits:**
- Rich, structured instructions from domain experts
- Tool usage guidance built-in
- Consistent analysis frameworks

**Challenges:**
- Need to extract arguments from user query
- Must match query to appropriate prompt
- Balance between structured prompts vs. natural queries

#### Option B: Enhance User Query with MCP Prompt Context
```typescript
// In buildThoughtPrompt()
if (shouldUseMCPPrompt(query, context)) {
  const prompt = await findBestMCPPrompt(query, mcpContext)
  if (prompt) {
    // Add MCP prompt context to query
    const promptDescription = `Suggested analysis framework: ${prompt.description}`
    return `${promptDescription}\n\nUser Query: ${query}\n\nUse this framework to guide your reasoning.`
  }
}
```

**Benefits:**
- Preserves user's natural language
- Adds structural guidance
- Less intrusive

**Challenges:**
- May dilute the structured guidance from MCP prompts
- LLM might ignore or misinterpret the framework

### Phase 2: Additional MCP Prompts (Medium Priority)

**Current:** 4 prompts  
**Gap:** Need 8-10 prompts for comprehensive coverage

**Missing Prompt Categories:**
1. Risk Assessment (general, not just shipments)
2. Trend Analysis (temporal patterns)
3. Compliance Gap Analysis (what's missing)
4. Facility Comparison (detailed side-by-side)
5. Contamination Source Tracking
6. Predictive Analytics
7. Regulatory Reporting
8. Incident Investigation

**Recommendation:** Work with MCP server team to add these prompts

### Phase 3: Coordinator Examples (Low Priority)

**Current:** Coordinator uses LLM-driven extraction with no examples  
**Enhancement:** Add vector-based examples for:
- Successful ID extractions
- Failed extractions (anti-patterns)
- Complex parameter transformations
- Error recovery patterns

**Expected Impact:** Medium - May reduce 20-30% of coordination failures

## Implementation Priority

### High Priority (Implement Now)
1. ✅ Import `getMCPPrompt` in thought agent
2. ✅ Create `findBestMCPPrompt()` - semantic matching
3. ✅ Create `extractPromptArguments()` - parse user query
4. ✅ Integrate MCP prompt invocation in `buildThoughtPrompt()`
5. ✅ Update system prompt to show prompt arguments

### Medium Priority (Next Sprint)
1. Add 6 more MCP prompts to server
2. Seed MCP prompt examples in Pinecone
3. Add coordinator vector examples

### Low Priority (Future Enhancement)
1. Dynamic prompt selection UI
2. Prompt effectiveness tracking
3. A/B testing between natural queries vs. prompts

## Success Metrics

**Phase 1 Success:**
- MCP prompts invoked for 40%+ of complex queries (score > 0.5)
- Zero additional coordination failures introduced
- Plan quality improves (critic approval rate increases)

**Overall Success:**
- 10/11 demo tests passing (currently 3 failing due to coordination)
- System leverages MCP capabilities fully
- Production-ready for complex workflows

## Next Steps

1. Get user confirmation on Option A vs. Option B
2. Implement `findBestMCPPrompt()` logic
3. Update `buildThoughtPrompt()` to invoke prompts
4. Test with existing demo queries
5. Document approach for future reference


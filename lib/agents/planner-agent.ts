/**
 * Planner Agent
 * 
 * Converts reasoning thoughts into structured, executable action plans.
 * Think of this as the "project manager" breaking down work.
 * 
 * How it works:
 * 1. Receives thoughts from Thought Agent (with Request ID)
 * 2. Uses LLM to generate structured plan
 * 3. Parses plan into ordered steps with dependencies
 * 4. Validates plan structure
 * 5. Returns plan with Request ID for chaining
 */

import { BaseAgent } from './base-agent'
import { Thought, Plan, PlanStep, PlannerAgentOutput, RequestContext, MCPContext, PlanExample, ToolMemoryOutput, ComplexityScore, ThoughtAgentOutput } from '@/types'
import { logger } from '@/utils/logger'
import { listMCPPrompts, listMCPTools, getMCPPrompt } from '@/lib/mcp-prompts'
import { querySimilarPlanExamples, incrementPlanExampleUsage } from '@/lib/pinecone/planner-examples'
import { generateEmbedding } from '@/lib/ollama/embeddings'
import { ToolMemoryAgent } from './tool-memory-agent'
import { contextCompressor, CompressionConfig } from '@/lib/utils/context-compressor'

/**
 * Planner Agent Class
 * 
 * Extends BaseAgent to provide plan generation capabilities.
 */
export class PlannerAgent extends BaseAgent {
  /**
   * Base system prompt that guides the Planner Agent's behavior
   * 
   * This is enhanced with dynamic context (MCP tools, similar examples, etc.)
   */
  private readonly baseSystemPrompt = `You are a Planner Agent - your job is to convert reasoning thoughts into structured, executable action plans.

Your planning should be:
- Actionable: Each step should be clear and executable
- Ordered: Steps should be in the correct sequence
- Tool-aware: Leverage available MCP tools with EXACT parameter names from schemas
- Dependency-aware: Identify which steps depend on others
- Realistic: Consider constraints and limitations
- Parameter-extracting: Extract values from user query and thoughts (e.g., "facility ABC" → shortCode="ABC")

CRITICAL FORMAT REQUIREMENTS:
1. Tool Names: MUST use EXACT tool names from the "Available MCP Tools" list below. 
   - ✅ CORRECT: "list_facilities", "get_facility", "generate_intelligent_facility_report"
   - ❌ WRONG: "multi_tool_use.parallel", "functions.analyze_contract_producers", "tool.xyz"
   - If a tool is not in the available tools list, DO NOT use it
2. Parameter Names: MUST use EXACT parameter names from tool schemas (e.g., use "facilityId", not "id" or "facility_id")
3. Parameter Extraction: Extract values from user query, BUT distinguish carefully:
   - **shortCode values**: Short, uppercase codes (typically 2-4 chars, e.g., "HAN", "ABC", "CWP", "NYC") → use shortCode parameter
     * ONLY use shortCode when the value looks like a code (short, uppercase/alphanumeric, no spaces)
   - **name values**: Full facility names (longer, mixed case, may contain spaces, e.g., "Hannover", "Central Waste Processing Hub", "Boston Facility") → DO NOT use ANY filter for list_facilities
     * Task 2.1: When user mentions facility by NAME (not shortCode, not location):
       → For list_facilities: Use NO filters (empty parameters {}) - let the coordinator find the match by name in the results
       → DO NOT use shortCode filter for facility names (names are NOT shortCodes)
       → DO NOT use location filter for facility names (names are NOT locations)
       → This allows the coordinator to extract the correct ID from the full list by matching the name
   - **location values**: Geographic locations (e.g., "New York", "Amsterdam", "Los Angeles", "Boston") → use location parameter
     * Task 2.1: Use location filter ONLY when user explicitly mentions a geographic location
     * Phrases like "in [city]", "at [city]", "facilities in [city]" indicate location
     * Common city names: New York, Boston, Chicago, Los Angeles, Amsterdam, Berlin, etc.
   - **CRITICAL DISTINCTION - Task 2.1 Enhancement**:
     * "Hannover", "Boston", "Berlin" can be EITHER facility names OR cities
     * → If user says "facility Hannover" (singular, specific facility) → it's a NAME → use NO filters
     * → If user says "facilities in Hannover" or "facilities at Hannover" → it's a LOCATION → use location: "Hannover"
     * → If user says "Hannover facility" → it's a NAME → use NO filters
     * → If user says "facility code HAN" → it's a shortCode → use shortCode: "HAN"
     * → When uncertain whether it's a name or location:
       * Default to treating it as a NAME (use no filters) if singular "facility X"
       * Default to treating it as a LOCATION if plural "facilities in X" or "facilities at X"
   - Examples:
     * "facility ABC" → shortCode: "ABC" (if ABC is short, looks like code)
     * "facility Hannover" → list_facilities with NO filters ({}), coordinator matches by name
     * "facilities in New York" → location: "New York" (geographic location)
     * "facilities in Boston" → location: "Boston" (geographic location)
     * "facility Boston" (singular) → list_facilities with NO filters ({}), coordinator matches by name
     * "facility code HAN" → shortCode: "HAN"
     * "facility ID 123" → facilityId: "123" or id: "123" (check schema)
4. JSON Format: Parameters must be valid JSON objects with exact parameter names
5. Dependencies: Reference step numbers (e.g., "1, 2" or [])
6. Optional Filter Parameters - CRITICAL: DO NOT SET TO NULL:
   - **Optional filter parameters** (like shortCode, location) must be **OMITTED entirely** if not needed
   - **DO NOT set filter parameters to null** - omit them from the parameters object instead
   - MCP tools reject null values with validation errors
   - Examples:
     * "List all facilities" → parameters: {} (empty object, no filters)
     * "List facilities in Berlin" → parameters: { location: "Berlin" }
     * "List facility HAN" → parameters: { shortCode: "HAN" }
     * WRONG: { shortCode: null } → will cause validation error
7. Required Parameters: Task 2.2 - Handle missing required parameters correctly:
   - **DO NOT fill parameters with generic placeholder text** like "Detected Waste Item", "Contaminant Material", "Shipment123", etc.
   - **DO NOT use default/example values** like "Test Facility", "Example Value", "Default Material"
   - **Instead, use structured placeholders**:
     * If parameter can be extracted from previous step: use "EXTRACT_FROM_STEP_X" where X is the step number
     * If parameter requires user input: use "REQUIRED" or leave as null
     * If parameter value is truly unknown: use null
   - **Only fill parameters when you can extract the actual value** from the user query or thoughts
   - Examples:
     * WRONG: {"material": "Contaminant Material", "wasteItemDetected": "Detected Waste Item"}
     * CORRECT: {"material": null, "wasteItemDetected": "REQUIRED"}
     * CORRECT: {"facilityId": "EXTRACT_FROM_STEP_1"} (if step 1 can provide it)
     * CORRECT: {"material": "Plastic"} (if user query mentions "plastic")

8. CRITICAL - Response Fields vs Filter Parameters:
   - **Response fields** (like explosive_level, hcl_level, so2_level) are data that comes BACK from the tool, NOT filter parameters you send TO the tool
   - **DO NOT use response fields as filter parameters** - they will cause validation errors
   - **For list_contaminants**: Valid filter parameters are ONLY: facilityId, shipment_id, material
   - **If user wants "high risk contaminants"**: Use list_contaminants with valid filters (facilityId, shipment_id, material), then filter results in the description
   - Examples:
     * ❌ WRONG: {"explosive_level": "high", "hcl_level": "high"} → These are NOT valid parameters
     * ✅ CORRECT: {"facilityId": "EXTRACT_FROM_STEP_1"} → Use valid filter parameters
     * ✅ CORRECT: {"material": "Plastic"} → Use valid filter parameters
     * ✅ CORRECT: {} → No filters, get all contaminants, then describe filtering for high-risk in the step description

TOOL USAGE CONSTRAINT - CRITICAL - READ THIS MULTIPLE TIMES:
🚨 **NEVER INVENT TOOL NAMES** 🚨
- ONLY use tools that appear EXACTLY as shown in the "Available MCP Tools" section below
- DO NOT create new tool names, even if they seem logical (e.g., "find-high-risk-contaminants-and-facilities" does NOT exist)
- DO NOT use patterns like "multi_tool_use.*" or "functions.*" - these are NOT valid tools
- DO NOT use abstract tool names like "analyze", "calculate", "count", "find" - these don't exist
- DO NOT create compound/hyphenated tool names like "find-high-risk-contaminants" or "analyze-facility-compliance"
- DO NOT use workflow template names as tool names - workflow templates are prompts, not tools

✅ Valid tool examples (copy EXACTLY from the list below):
  - "list_facilities", "get_facility", "list_shipments", "list_contaminants"
  - "generate_intelligent_facility_report", "analyze_shipment_risk", "suggest_inspection_questions"
  - "create_contaminant", "get_contaminant", "update_contaminant"

❌ Invalid tool examples (DO NOT USE THESE):
  - "find-high-risk-contaminants-and-facilities" (doesn't exist - use list_contaminants + filter)
  - "analyze-facility-compliance" (doesn't exist - use generate_intelligent_facility_report)
  - "multi_tool_use.parallel" (doesn't exist)
  - "functions.analyze_contract_producers" (doesn't exist)

**If you need to perform an operation:**
1. Check if an exact tool exists in the "Available MCP Tools" list below
2. If no exact tool exists, break it down into steps using existing tools:
   - Example: "find high risk contaminants" → use "list_contaminants" then filter results
   - Example: "analyze facility" → use "generate_intelligent_facility_report"
3. NEVER invent a tool name - if a tool doesn't exist in the list, use multiple existing tools in sequence

**MANDATORY VERIFICATION STEP:**
Before finalizing your plan, check EVERY tool name in your steps:
1. Open the "Available MCP Tools" section below
2. Search for each tool name you used
3. If you cannot find it EXACTLY as written, REPLACE it with an existing tool
4. If you're unsure, use a simpler tool like "list_contaminants" or "list_facilities" and filter results in subsequent steps

You MUST respond with ONLY a valid JSON object in this exact format:

{
  "goal": "Clear statement of the objective based on user query and thoughts",
  "steps": [
    {
      "order": 1,
      "description": "Clear step description",
      "action": "exact_tool_name_from_available_tools",
      "parameters": {
        "exact_parameter_name": "extracted_value"
      },
      "expectedOutcome": "What should happen",
      "dependencies": ["step-2"] or []
    }
  ],
  "rationale": "Why this plan will work",
  "confidence": 0.0-1.0,
  "estimatedComplexity": 0.0-1.0
}

Example of CORRECT JSON response:
{
  "goal": "Analyze facility ABC",
  "steps": [
    {
      "order": 1,
      "description": "Get facility details",
      "action": "list_facilities",
      "parameters": {
        "shortCode": "ABC"
      },
      "expectedOutcome": "Retrieve facility information",
      "dependencies": []
    },
    {
      "order": 2,
      "description": "Generate comprehensive facility report",
      "action": "generate_intelligent_facility_report",
      "parameters": {
        "facilityId": "extracted_from_step_1",
        "includeRecommendations": true
      },
      "expectedOutcome": "Detailed facility analysis with AI recommendations",
      "dependencies": ["step-1"]
    }
  ],
  "rationale": "First retrieve facility data, then generate comprehensive analysis",
  "confidence": 0.85,
  "estimatedComplexity": 0.6
}

Example of INCORRECT format:
{
  "steps": [
    {
      "action": "get_facility",
      "parameters": {"value": "ABC"}
    }
  ]
}
❌ WRONG - "value" is not a valid parameter name, missing required fields

Remember: You are outputting JSON only, no text before or after the JSON object.`

  constructor() {
    super('planner-agent')
  }

  /**
   * Fetch MCP context (tools, resources, prompts)
   * 
   * @returns MCP context information
   */
  async fetchMCPContext(): Promise<MCPContext> {
    try {
      const [tools, prompts] = await Promise.all([
        listMCPTools().catch(() => []),
        listMCPPrompts().catch(() => []),
      ])

      // Resources can be added later when MCP server supports it
      const resources: any[] = []

      logger.debug(`[PlannerAgent] Fetched MCP context`, {
        toolsCount: tools.length,
        promptsCount: prompts.length,
      })

      return {
        tools,
        resources,
        prompts,
      }
    } catch (error: any) {
      logger.error(`[PlannerAgent] Failed to fetch MCP context:`, error)
      return { tools: [], resources: [], prompts: [] }
    }
  }

  /**
   * Fetch semantic context from Pinecone
   * 
   * Queries for similar plan examples based on user query.
   * 
   * @param userQuery - User query to find similar examples for
   * @returns Array of similar examples with similarity scores
   */
  async fetchSemanticContext(userQuery: string): Promise<Array<{ example: PlanExample; similarity: number }>> {
    try {
      const embedding = await generateEmbedding(userQuery)
      const results = await querySimilarPlanExamples(embedding, 3, 0.7)
      
      // Increment usage count for matched examples
      for (const result of results) {
        try {
          await incrementPlanExampleUsage(result.example.id)
        } catch (err) {
          logger.warn(`[PlannerAgent] Failed to increment usage for example ${result.example.id}:`, err)
        }
      }

      logger.debug(`[PlannerAgent] Found similar examples`, {
        count: results.length,
        similarities: results.map(r => r.similarity.toFixed(2)),
      })

      return results
    } catch (error: any) {
      logger.error(`[PlannerAgent] Failed to fetch semantic context:`, error)
      return []
    }
  }

  /**
   * Fetch tool recommendations from Tool Memory Agent
   * 
   * @param userQuery - Original user query
   * @param requestContext - Request context
   * @param complexityScore - Optional complexity score
   * @returns Tool recommendations or null if unavailable
   */
  private async fetchToolRecommendations(
    userQuery: string,
    requestContext: RequestContext,
    complexityScore?: ComplexityScore
  ): Promise<ToolMemoryOutput | null> {
    try {
      const toolMemoryAgent = new ToolMemoryAgent()
      
      // Try to initialize (may fail if not configured)
      try {
        await toolMemoryAgent.initialize()
      } catch (error: any) {
        logger.debug(`[PlannerAgent] Tool Memory Agent not available:`, error.message)
        return null
      }

      const mcpContext = await this.fetchMCPContext()
      const recommendations = await toolMemoryAgent.recommendTools(
        userQuery,
        requestContext,
        complexityScore,
        mcpContext
      )

      logger.debug(`[PlannerAgent] Fetched tool recommendations`, {
        toolsRecommended: recommendations.recommendedTools.length,
      })

      return recommendations
    } catch (error: any) {
      logger.warn(`[PlannerAgent] Failed to fetch tool recommendations:`, error.message)
      return null
    }
  }

  /**
   * Build enhanced system prompt with context
   * 
   * Dynamically constructs system prompt with MCP context and similar examples.
   * Optionally compresses context to reduce token usage.
   * 
   * @param mcpContext - MCP tools/resources/prompts
   * @param similarExamples - Similar plan examples from Pinecone
   * @param toolRecommendations - Optional tool recommendations from Tool Memory Agent
   * @param compressionConfig - Optional compression configuration
   * @returns Enhanced system prompt
   */
  private buildEnhancedSystemPrompt(
    mcpContext: MCPContext,
    similarExamples: Array<{ example: PlanExample; similarity: number }> = [],
    toolRecommendations?: ToolMemoryOutput,
    compressionConfig?: CompressionConfig,
    expandedPromptSteps: PlanStep[] = []
  ): string {
    let prompt = this.baseSystemPrompt + '\n\n'

    // Apply compression to context if needed
    const shouldCompress = compressionConfig !== undefined
    let finalMCPContext = mcpContext
    let finalExamples = similarExamples
    let finalToolRecommendations = toolRecommendations

    if (shouldCompress && compressionConfig) {
      // Compress MCP context
      const { context: compressedContext, actions: contextActions } = contextCompressor.compressMCPContext(
        mcpContext,
        compressionConfig
      )
      finalMCPContext = compressedContext
      if (contextActions.length > 0) {
        logger.debug(`[PlannerAgent] Compressed MCP context`, { actions: contextActions })
      }

      // Compress similar examples
      const { examples: compressedExamples, actions: exampleActions } = contextCompressor.compressSimilarExamples(
        similarExamples,
        compressionConfig
      )
      finalExamples = compressedExamples
      if (exampleActions.length > 0) {
        logger.debug(`[PlannerAgent] Compressed similar examples`, { actions: exampleActions })
      }

      // Compress tool recommendations
      const { recommendations: compressedRecs, actions: recActions } = contextCompressor.compressToolRecommendations(
        toolRecommendations,
        compressionConfig
      )
      finalToolRecommendations = compressedRecs
      if (recActions.length > 0) {
        logger.debug(`[PlannerAgent] Compressed tool recommendations`, { actions: recActions })
      }
    }

    // Add MCP tools context (critical for planning)
    if (finalMCPContext.tools.length > 0) {
      const categorized = this.categorizeTools(finalMCPContext.tools)
      
      prompt += '## Available MCP Tools\n\n'
      prompt += '🚨🚨🚨 CRITICAL - READ THIS MULTIPLE TIMES 🚨🚨🚨\n'
      prompt += 'THIS IS THE COMPLETE LIST OF VALID TOOLS - USE ONLY THESE:\n'
      prompt += '1. ONLY use tool names that appear EXACTLY as shown in this list below\n'
      prompt += '2. DO NOT invent, create, or guess tool names - if a tool is not listed here, it DOES NOT EXIST\n'
      prompt += '3. DO NOT use tool names starting with "multi_tool_use", "functions", or any pattern\n'
      prompt += '4. DO NOT create compound/hyphenated tool names like "find-high-risk-contaminants" or "analyze-facility-compliance"\n'
      prompt += '5. DO NOT use abstract tool names like "analyze", "calculate", "count", "find" - these don\'t exist\n'
      prompt += '6. DO NOT use workflow template/prompt names as tools - prompts are not tools\n'
      prompt += '7. Valid tool format: lowercase with underscores (e.g., "list_facilities", "get_facility")\n'
      prompt += '8. Invalid tool examples (DO NOT USE): "find-high-risk-contaminants", "analyze-facility", "multi_tool_use.*"\n'
      prompt += '9. If you need functionality not covered by a single tool, create a multi-step plan using EXISTING tools ONLY\n'
      prompt += '\n⚠️ MANDATORY VERIFICATION: Before finalizing your plan:\n'
      prompt += '   - Check each tool name in your steps against this list\n'
      prompt += '   - If you cannot find it EXACTLY as written, replace it with an existing tool\n'
      prompt += '   - If unsure, use "list_contaminants" or "list_facilities" and filter results in subsequent steps\n\n'
      
      for (const [category, tools] of Object.entries(categorized)) {
        if (tools.length > 0) {
          prompt += `### ${category}\n`
          for (const tool of tools) {
            prompt += `**${tool.name}**\n`
            prompt += `Description: ${tool.description}\n`
            
            // Add input schema with enhanced formatting
            if (tool.inputSchema?.properties) {
              const requiredParams: string[] = tool.inputSchema.required || []
              const allParams = Object.entries(tool.inputSchema.properties)
              
              if (allParams.length > 0) {
                prompt += `Parameters:\n`
                
                for (const [paramName, paramSchema] of allParams) {
                  const schema = paramSchema as any
                  const isRequired = requiredParams.includes(paramName)
                  const paramType = schema.type || 'any'
                  const paramDesc = schema.description || ''
                  const requiredMark = isRequired ? ' ⚠️ REQUIRED' : ' (optional)'
                  
                  prompt += `  • ${paramName}${requiredMark} [${paramType}]`
                  if (paramDesc) {
                    prompt += ` - ${paramDesc}`
                  }
                  prompt += `\n`
                  
                  // Add example value based on parameter name
                  let exampleValue = ''
                  if (paramName === 'id' || paramName === 'facilityId') {
                    exampleValue = '6905db9211cc522275d5f013'
                  } else if (paramName === 'shortCode') {
                    exampleValue = 'ABC'
                  } else if (paramName === 'location') {
                    exampleValue = 'Amsterdam'
                  } else if (paramType === 'boolean') {
                    exampleValue = 'true'
                  } else if (paramType === 'number') {
                    exampleValue = '100'
                  } else if (paramType === 'string') {
                    exampleValue = '"example_string"'
                  }
                  
                  if (exampleValue) {
                    prompt += `    Example: ${exampleValue}\n`
                  }
                }
                
                // Show example JSON call
                const exampleParams: Record<string, any> = {}
                for (const [paramName, paramSchema] of allParams) {
                  const schema = paramSchema as any
                  const isRequired = requiredParams.includes(paramName)
                  // Only include required params in example, or all if no required
                  if (isRequired || requiredParams.length === 0) {
                    if (paramName === 'id' || paramName === 'facilityId') {
                      exampleParams[paramName] = '6905db9211cc522275d5f013'
                    } else if (paramName === 'shortCode') {
                      exampleParams[paramName] = 'ABC'
                    } else if (paramName === 'location') {
                      exampleParams[paramName] = 'Amsterdam'
                    } else if (schema.type === 'boolean') {
                      exampleParams[paramName] = true
                    } else if (schema.type === 'number') {
                      exampleParams[paramName] = 100
                    } else {
                      exampleParams[paramName] = 'example_value'
                    }
                  }
                }
                
                if (Object.keys(exampleParams).length > 0) {
                  prompt += `  Example Parameters JSON: ${JSON.stringify(exampleParams)}\n`
                }
              } else {
                prompt += `  No parameters required\n`
              }
            } else {
              prompt += `  No parameters defined\n`
            }
            
            prompt += '\n'
          }
          prompt += '\n'
        }
      }

      prompt += '⚠️ TOOL USAGE RULES:\n'
      prompt += '1. Use EXACT tool names as shown (case-sensitive)\n'
      prompt += '2. Use EXACT parameter names from schemas (e.g., "facilityId", not "facility_id")\n'
      prompt += '3. Include ALL required parameters (marked ⚠️ REQUIRED)\n'
      prompt += '4. Extract parameter values from user query (see parameter extraction hints)\n'
      prompt += '5. Chain tools: list_facilities → get results → use facilityId in subsequent calls\n'
      prompt += '6. Do NOT use generic parameter names like "value", "data", "id" unless schema specifies it\n\n'
    }

    // Add MCP prompts context
    if (finalMCPContext.prompts.length > 0) {
      prompt += '## Available Workflow Templates\n\n'
      prompt += 'These are pre-built analysis workflows you can leverage:\n\n'
      
      for (const mcpPrompt of finalMCPContext.prompts) {
        prompt += `- **${mcpPrompt.name}**: ${mcpPrompt.description}\n`
      }

      prompt += '\n'
    }

    // Add tool memory recommendations if available
    if (finalToolRecommendations && finalToolRecommendations.recommendedTools.length > 0) {
      prompt += '## AI-Powered Tool Recommendations\n\n'
      prompt += '🚨 IMPORTANT: These tools have been intelligently recommended based on similar successful patterns.\n\n'
      prompt += 'Prioritize these tools when creating your plan:\n\n'
      
      // Sort by priority
      const sortedTools = [...finalToolRecommendations.recommendedTools].sort(
        (a, b) => b.priority - a.priority
      )
      
      for (const rec of sortedTools) {
        prompt += `- **${rec.toolName}** (Priority: ${(rec.priority * 100).toFixed(0)}%)\n`
        prompt += `  Rationale: ${rec.rationale}\n`
        if (rec.exampleUsage) {
          prompt += `  Example: "${rec.exampleUsage}"\n`
        }
        if (rec.toolChain && rec.toolChain.length > 0) {
          prompt += `  Works well with: ${rec.toolChain.join(', ')}\n`
        }
        prompt += '\n'
      }

      if (finalToolRecommendations.toolChains.length > 0) {
        prompt += '### Recommended Tool Chains\n\n'
        for (const chain of finalToolRecommendations.toolChains) {
          prompt += `- ${chain.sequence.join(' → ')}\n`
          prompt += `  Rationale: ${chain.rationale}\n`
          if (chain.successRate !== undefined) {
            prompt += `  Success Rate: ${(chain.successRate * 100).toFixed(0)}%\n`
          }
          prompt += '\n'
        }
      }

      prompt += '\n'
    }

    // Add expanded prompt steps if available
    if (expandedPromptSteps.length > 0) {
      prompt += '## Expanded Workflow Steps (From Recommended Prompts)\n\n'
      prompt += '🚨 HIGH PRIORITY: These steps have been automatically generated from recommended MCP prompts.\n'
      prompt += 'You should prioritize incorporating these steps into your plan when they align with the user query.\n\n'
      
      for (const step of expandedPromptSteps) {
        prompt += `**Step ${step.order}: ${step.description}**\n`
        prompt += `- Action: ${step.action}\n`
        if (step.parameters && Object.keys(step.parameters).length > 0) {
          prompt += `- Parameters: ${JSON.stringify(step.parameters)}\n`
        }
        prompt += `- Expected Outcome: ${step.expectedOutcome}\n`
        if (step.dependencies && step.dependencies.length > 0) {
          prompt += `- Dependencies: ${step.dependencies.join(', ')}\n`
        }
        prompt += '\n'
      }
      
      prompt += '⚠️ IMPORTANT: When creating your plan, consider these expanded steps and integrate them appropriately.\n'
      prompt += 'You can modify, reorder, or combine them with other steps as needed.\n\n'
    }

    // Add similar examples context (vector-based learning)
    if (finalExamples.length > 0) {
      prompt += '## Similar Successful Plans\n\n'
      prompt += 'Learn parameter extraction patterns from these proven examples:\n\n'

      for (const { example, similarity } of finalExamples) {
        prompt += `### Example (${(similarity * 100).toFixed(0)}% similar): "${example.query}"\n`
        prompt += `Goal: ${example.goal}\n`
        
        if (example.steps && example.steps.length > 0) {
          prompt += 'Steps with parameters:\n'
          for (const step of example.steps) {
            prompt += `  ${step.action}${step.parameters && Object.keys(step.parameters).length > 0 ? `: ${JSON.stringify(step.parameters)}` : ' (no params)'}\n`
          }
        }
        
        if (example.successRating >= 0.9) {
          prompt += `✅ Highly successful (${(example.successRating * 100).toFixed(0)}% success rate)\n`
        }

        prompt += '\n'
      }
    }

    // Add domain knowledge
    prompt += '## Domain Knowledge\n\n'
    prompt += '- Waste management facility operations\n'
    prompt += '- Contamination detection and analysis\n'
    prompt += '- Inspection workflows and compliance\n'
    prompt += '- Shipment tracking and risk assessment\n'
    prompt += '- Contract management and validation\n\n'

    prompt += '## Your Task\n\n'
    prompt += 'Given the reasoning thoughts and examples above, create a structured plan that:\n'
    prompt += '1. Breaks down the goal into clear, ordered steps\n'
    prompt += '2. Uses appropriate MCP tools with EXACT parameter names from schemas\n'
    prompt += '3. Extracts parameter values from user query (learn from examples)\n'
    prompt += '4. Identifies dependencies between steps\n'
    prompt += '5. Specifies expected outcomes for each step\n'

    return prompt
  }

  /**
   * Categorize MCP tools by type
   * 
   * Groups tools into logical categories for better LLM context.
   * 
   * @param tools - Array of MCP tools
   * @returns Categorized tools object
   */
  private categorizeTools(tools: any[]): Record<string, any[]> {
    const categories: Record<string, any[]> = {
      'Data Retrieval': [],
      'Analysis & Intelligence': [],
      'Operations': [],
      'Other': [],
    }

    for (const tool of tools) {
      const name = tool.name.toLowerCase()
      
      if (name.includes('get') || name.includes('list') || name.includes('read')) {
        categories['Data Retrieval'].push(tool)
      } else if (name.includes('generate') || name.includes('analyze') || name.includes('suggest') || name.includes('intelligent')) {
        categories['Analysis & Intelligence'].push(tool)
      } else if (name.includes('create') || name.includes('update') || name.includes('delete')) {
        categories['Operations'].push(tool)
      } else {
        categories['Other'].push(tool)
      }
    }

    // Remove empty categories
    return Object.fromEntries(
      Object.entries(categories).filter(([_, tools]) => tools.length > 0)
    )
  }

  /**
   * Fetch prompt content from MCP server
   * 
   * @param promptName - Name of the prompt to fetch
   * @param args - Optional arguments for the prompt
   * @returns Prompt content or null if fetch fails
   */
  private async fetchPromptContent(
    promptName: string,
    args: Record<string, any> = {}
  ): Promise<any | null> {
    try {
      const promptContent = await getMCPPrompt(promptName, args)
      logger.debug(`[PlannerAgent] Fetched prompt content`, {
        promptName,
        hasContent: !!promptContent,
      })
      return promptContent
    } catch (error: any) {
      logger.warn(`[PlannerAgent] Failed to fetch prompt content`, {
        promptName,
        error: error.message,
      })
      return null
    }
  }

  /**
   * Expand any prompt actions found in the plan into tool steps
   * 
   * This is a safety mechanism to ensure prompts are always expanded,
   * even if the LLM used a prompt name directly instead of using expanded steps.
   * 
   * @param plan - Plan that may contain prompt actions
   * @param userQuery - User query for context
   * @param mcpContext - MCP context with available prompts
   * @returns Plan with prompt actions replaced by tool steps
   */
  private async expandPromptActionsInPlan(
    plan: Plan,
    userQuery: string,
    mcpContext: MCPContext
  ): Promise<Plan> {
    // Build prompt map for quick lookup
    const promptMap = new Map(mcpContext.prompts.map(p => [p.name, p]))
    const toolMap = new Map(mcpContext.tools.map(t => [t.name, t]))
    
    // Find steps that are prompts (not tools)
    const promptSteps: Array<{ step: PlanStep; index: number }> = []
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i]
      // Skip if it's a tool or manual action
      if (toolMap.has(step.action) || 
          step.action.toLowerCase().includes('manual') ||
          step.action === 'unknown') {
        continue
      }
      
      // Check if it's a prompt
      if (promptMap.has(step.action)) {
        promptSteps.push({ step, index: i })
      }
    }
    
    // If no prompt actions found, return plan as-is
    if (promptSteps.length === 0) {
      return plan
    }
    
    logger.info(`[PlannerAgent] Found ${promptSteps.length} prompt action(s) in plan, expanding them`, {
      promptActions: promptSteps.map(p => p.step.action),
    })
    
    // Expand each prompt step and replace in plan
    const newSteps: PlanStep[] = []
    let currentOrder = 1
    
    for (let i = 0; i < plan.steps.length; i++) {
      const promptStep = promptSteps.find(p => p.index === i)
      
      if (promptStep) {
        // This step is a prompt - expand it
        try {
          const expanded = await this.expandPromptsToToolSteps(
            [promptStep.step.action],
            userQuery,
            mcpContext
          )
          
          if (expanded.length > 0) {
            const baseStepOrder = currentOrder
            const expandedStepsToAdd: PlanStep[] = []
            
            // First pass: normalize and filter expanded steps
            for (let idx = 0; idx < expanded.length; idx++) {
              const expStep = expanded[idx]
              
              // Skip MANUAL_STEP actions - they're not executable
              if (expStep.action === 'MANUAL_STEP' || expStep.action.toLowerCase().includes('manual')) {
                logger.debug(`[PlannerAgent] Skipping manual step in expanded prompt`, {
                  stepDescription: expStep.description,
                })
                continue
              }
              
              // Normalize dependencies to step-X format
              // Dependencies in expanded steps can be:
              // 1. Numbers (1, 2, 3) - these are absolute step order references in the final plan
              // 2. Strings like "step-1", "step-2" - already in correct format
              // 3. Number strings like "1", "2" - convert to step-X format
              const normalizedDependencies = (expStep.dependencies || []).map((dep: any) => {
                if (typeof dep === 'number') {
                  // Convert number to step-X format (assume absolute step order reference)
                  return `step-${dep}`
                } else if (typeof dep === 'string') {
                  // If already in step-X format, keep it
                  if (dep.startsWith('step-')) {
                    return dep
                  }
                  // If it's just a number string, convert it
                  const numMatch = dep.match(/^(\d+)$/)
                  if (numMatch) {
                    return `step-${numMatch[1]}`
                  }
                  return dep
                }
                return dep
              }).filter((dep: string) => typeof dep === 'string' && dep.length > 0)
              
              expandedStepsToAdd.push({
                ...expStep,
                id: `step-${currentOrder}`, // Always use step-X format
                order: currentOrder++,
                dependencies: normalizedDependencies,
              })
            }
            
            // Add all expanded steps
            newSteps.push(...expandedStepsToAdd)
            
            logger.info(`[PlannerAgent] Expanded prompt "${promptStep.step.action}" into ${expandedStepsToAdd.length} tool steps`, {
              originalStep: promptStep.step.order,
              expandedSteps: expandedStepsToAdd.length,
              filteredOut: expanded.length - expandedStepsToAdd.length,
              finalStepRange: `${baseStepOrder} to ${currentOrder - 1}`,
            })
          } else {
            // Expansion failed, keep original step but log warning
            logger.warn(`[PlannerAgent] Failed to expand prompt "${promptStep.step.action}", keeping original step`, {
              stepOrder: promptStep.step.order,
            })
            newSteps.push({
              ...promptStep.step,
              id: promptStep.step.id || `step-${currentOrder}`,
              order: currentOrder++,
            })
          }
        } catch (error: any) {
          logger.error(`[PlannerAgent] Error expanding prompt "${promptStep.step.action}"`, {
            error: error.message,
            stepOrder: promptStep.step.order,
          })
          // Keep original step on error
          newSteps.push({
            ...promptStep.step,
            id: promptStep.step.id || `step-${currentOrder}`,
            order: currentOrder++,
          })
        }
      } else {
        // Regular step - keep it but adjust order
        newSteps.push({
          ...plan.steps[i],
          id: plan.steps[i].id || `step-${currentOrder}`,
          order: currentOrder++,
        })
      }
    }
    
    return {
      ...plan,
      steps: newSteps,
    }
  }

  /**
   * Expand MCP prompts into concrete tool steps
   * 
   * Fetches prompt content and uses LLM to convert workflow templates
   * into executable plan steps using actual MCP tools.
   * 
   * @param promptNames - Array of prompt names to expand
   * @param userQuery - Original user query for context
   * @param mcpContext - MCP context with available tools
   * @returns Array of plan steps derived from prompts
   */
  private async expandPromptsToToolSteps(
    promptNames: string[],
    userQuery: string,
    mcpContext: MCPContext
  ): Promise<PlanStep[]> {
    if (promptNames.length === 0) {
      return []
    }

    const expandedSteps: PlanStep[] = []
    let stepOrder = 1

    for (const promptName of promptNames) {
      try {
        // Fetch prompt content
        const promptContent = await this.fetchPromptContent(promptName)
        if (!promptContent) {
          logger.warn(`[PlannerAgent] Skipping prompt expansion for ${promptName} - content not available`)
          continue
        }

        // Use LLM to convert prompt workflow into concrete tool steps
        const expansionPrompt = `You are a plan expansion assistant. Your job is to convert an MCP prompt workflow into concrete tool steps.

User Query: "${userQuery}"

MCP Prompt Name: "${promptName}"
Prompt Content:
${typeof promptContent === 'string' ? promptContent : JSON.stringify(promptContent, null, 2)}

Available MCP Tools:
${mcpContext.tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

Convert this prompt workflow into concrete plan steps using ONLY the available MCP tools listed above.

Respond with ONLY a JSON array of plan steps in this format:
[
  {
    "order": 1,
    "description": "Clear step description",
    "action": "exact_tool_name_from_available_tools",
    "parameters": {
      "exact_parameter_name": "extracted_value_or_placeholder"
    },
    "expectedOutcome": "What should happen",
    "dependencies": []
  }
]

CRITICAL RULES:
1. Use EXACT tool names from the available tools list above
2. Use EXACT parameter names from tool schemas
3. Extract parameter values from user query when possible
4. Use placeholders like "REQUIRED" or "EXTRACT_FROM_STEP_X" when values are unknown
5. Set proper dependencies between steps using "step-X" format (e.g., ["step-1", "step-2"])
6. DO NOT invent tool names or use tools not in the available list
7. DO NOT use "MANUAL_STEP" or any manual actions - all steps must be executable tools
8. DO NOT create manual/correlation steps - use actual tools or omit the step`

        const messages = [
          {
            role: 'system' as const,
            content: 'You are a plan expansion assistant. Convert prompt workflows into executable tool steps. Respond with ONLY valid JSON arrays.',
          },
          {
            role: 'user' as const,
            content: expansionPrompt,
          },
        ]

        const response = await this.callLLM(messages, {
          temperature: 0.3, // Low temperature for structured output
          maxTokens: 2000,
          // Note: We want JSON array, not json_object, so don't use responseFormat
        })

        // Parse response to extract steps
        let parsedSteps: any[] = []
        try {
          // Try to extract JSON array from response
          const jsonMatch = response.match(/\[[\s\S]*\]/)?.[0]
          if (jsonMatch) {
            parsedSteps = JSON.parse(jsonMatch)
          } else {
            // Try parsing entire response as JSON
            const parsed = JSON.parse(response)
            if (Array.isArray(parsed)) {
              parsedSteps = parsed
            } else if (parsed.steps && Array.isArray(parsed.steps)) {
              parsedSteps = parsed.steps
            }
          }
        } catch (parseError: any) {
          logger.warn(`[PlannerAgent] Failed to parse expanded steps for prompt ${promptName}`, {
            error: parseError.message,
            response: response.substring(0, 200),
          })
          continue
        }

        // Convert parsed steps to PlanStep format
        for (const step of parsedSteps) {
          if (!step.action || !step.description) {
            continue // Skip invalid steps
          }
          
          // Skip MANUAL_STEP actions - they're not executable
          if (step.action === 'MANUAL_STEP' || step.action.toLowerCase().includes('manual')) {
            logger.debug(`[PlannerAgent] Skipping manual step in prompt expansion`, {
              promptName,
              stepDescription: step.description,
            })
            continue
          }

          // Normalize dependencies to step-X format
          const normalizedDependencies = (step.dependencies || []).map((dep: any) => {
            if (typeof dep === 'number') {
              return `step-${dep}`
            } else if (typeof dep === 'string') {
              if (dep.startsWith('step-')) {
                return dep
              }
              const numMatch = dep.match(/^(\d+)$/)
              if (numMatch) {
                return `step-${numMatch[1]}`
              }
              return dep
            }
            return dep
          })

          expandedSteps.push({
            id: `expanded-${promptName}-${stepOrder}`, // Temporary ID, will be normalized later
            order: stepOrder++,
            description: step.description,
            action: step.action,
            parameters: step.parameters || {},
            expectedOutcome: step.expectedOutcome || 'Execute workflow step',
            dependencies: normalizedDependencies,
            status: 'pending' as const,
          })
        }

        logger.debug(`[PlannerAgent] Expanded prompt to steps`, {
          promptName,
          stepsGenerated: parsedSteps.length,
        })
      } catch (error: any) {
        logger.warn(`[PlannerAgent] Failed to expand prompt ${promptName}`, {
          error: error.message,
        })
        // Continue with other prompts even if one fails
      }
    }

    return expandedSteps
  }

  /**
   * Generate a plan from thoughts
   * 
   * Enhanced with MCP context and semantic memory.
   * 
   * @param thoughts - Thoughts from Thought Agent
   * @param userQuery - Original user query
   * @param requestContext - Request ID context from Thought Agent
   * @param mcpContext - Optional MCP context (will be fetched if not provided)
   * @param similarExamples - Optional similar examples (will be fetched if not provided)
   * @param toolRecommendations - Optional tool recommendations (will be fetched if not provided)
   * @param complexityScore - Optional complexity score for tool recommendations
   * @param thoughtOutput - Optional ThoughtAgentOutput containing recommendedPrompts
   * @returns PlannerAgentOutput with structured plan
   */
  async generatePlan(
    thoughts: Thought[],
    userQuery: string,
    requestContext: RequestContext,
    mcpContext?: MCPContext,
    similarExamples?: Array<{ example: PlanExample; similarity: number }>,
    toolRecommendations?: ToolMemoryOutput,
    complexityScore?: ComplexityScore,
    thoughtOutput?: ThoughtAgentOutput
  ): Promise<PlannerAgentOutput> {
    // Step 1: Add this agent to the request chain
    const updatedContext = this.addToChain(requestContext)

    // Step 2: Fetch context if not provided
    const contextToUse = mcpContext || await this.fetchMCPContext()
    const examplesToUse = similarExamples || await this.fetchSemanticContext(userQuery)

    // Step 2.5: Fetch tool recommendations if not provided
    let toolRecs = toolRecommendations
    if (!toolRecs) {
      // Extract complexity from request context if available
      const complexity = complexityScore || ((requestContext as any).metadata?.complexity as ComplexityScore | undefined)
      toolRecs = await this.fetchToolRecommendations(userQuery, updatedContext, complexity) || undefined
    }

    // Step 2.6: Expand recommended prompts into tool steps
    let expandedPromptSteps: PlanStep[] = []
    if (thoughtOutput?.recommendedPrompts && thoughtOutput.recommendedPrompts.length > 0) {
      logger.debug(`[PlannerAgent] Expanding recommended prompts to tool steps`, {
        requestId: updatedContext.requestId,
        promptCount: thoughtOutput.recommendedPrompts.length,
        prompts: thoughtOutput.recommendedPrompts,
      })
      expandedPromptSteps = await this.expandPromptsToToolSteps(
        thoughtOutput.recommendedPrompts,
        userQuery,
        contextToUse
      )
      logger.info(`[PlannerAgent] Expanded prompts into tool steps`, {
        requestId: updatedContext.requestId,
        promptsExpanded: thoughtOutput.recommendedPrompts.length,
        stepsGenerated: expandedPromptSteps.length,
      })
    }

    // Step 3: Build enhanced system prompt with optional compression
    // Check if compression should be applied based on agent config or provider
    const forceCompression = this.agentConfig?.parameters?.forceCompression || false
    
    // Always compress for Groq (strict token limits)
    if (!this.apiConfig) {
      throw new Error('Agent not initialized')
    }
    const { getProviderForModel } = await import('@/lib/ai-config')
    const provider = getProviderForModel(this.apiConfig.modelId)
    const isGroq = provider === 'groq'
    
    // Only compress if forced OR if we're actually near token limits
    // Don't compress just because we're using Groq - only compress when needed
    const shouldCompress = forceCompression
    
    const compressionConfig: CompressionConfig | undefined = shouldCompress ? {
      maxTools: isGroq ? 12 : 15,  // Less aggressive - preserve more tools
      maxExamples: isGroq ? 3 : 4, // Less aggressive - preserve more examples
      maxRecommendations: isGroq ? 4 : 5,
      truncateDescriptions: true,
      maxDescriptionLength: isGroq ? 200 : 250, // Longer descriptions to preserve context
      keepOnlyRequiredParams: false,  // Keep important optional params (filters, etc.)
    } : undefined

    const enhancedSystemPrompt = this.buildEnhancedSystemPrompt(
      contextToUse,
      examplesToUse,
      toolRecs || undefined,
      compressionConfig,
      expandedPromptSteps
    )

    // Step 4: Build the prompt for the LLM
    const prompt = this.buildPlanningPrompt(thoughts, userQuery, contextToUse)

    // Step 5: Call LLM with enhanced context
    const messages = [
      { role: 'system' as const, content: enhancedSystemPrompt },
      { role: 'user' as const, content: prompt },
    ]

    logger.debug(`[PlannerAgent] Generating plan`, {
      requestId: updatedContext.requestId,
      thoughtsCount: thoughts.length,
      toolsCount: contextToUse.tools.length,
      similarExamplesCount: examplesToUse.length,
    })

    const response = await this.callLLM(messages, {
      temperature: 0.5, // More structured, less creative
      maxTokens: 2000,
      responseFormat: { type: 'json_object' } // Force JSON output
    })

    // Step 6: Parse the structured response
    const plan = this.parsePlanResponse(response, userQuery, thoughts)

    // Step 6.5: Normalize invalid tool names (e.g., functions.get_facility -> get_facility)
    const normalizedPlan = this.normalizeToolNames(plan, contextToUse)

    // Step 6.6: Expand any prompt actions that made it into the plan
    // This ensures prompts are always expanded into tool steps, never passed to executor
    const finalPlan = await this.expandPromptActionsInPlan(normalizedPlan, userQuery, contextToUse)

    // Step 7: Validate plan against MCP tool schemas
    const validationResults = this.validatePlan(finalPlan, contextToUse)
    if (validationResults.warnings.length > 0 || validationResults.errors.length > 0) {
      logger.warn(`[PlannerAgent] Plan validation issues`, {
        requestId: updatedContext.requestId,
        warnings: validationResults.warnings,
        errors: validationResults.errors,
      })
      
      // Log warnings but don't fail - allow plan to proceed
      // In future, could auto-correct or request refinement
    }

    // Step 8: Extract rationale
    const rationale = this.extractSection(response, 'RATIONALE') || 'Plan created based on reasoning thoughts.'

    // Step 9: Build output with Request ID
    const output: PlannerAgentOutput = {
      // Agent output base
      requestId: updatedContext.requestId,
      agentName: 'planner-agent',
      timestamp: new Date(),
      requestContext: updatedContext,

      // Planner-specific output
      plan: finalPlan,
      rationale,
      basedOnThoughts: thoughts.map(t => t.id),
    }

    logger.info(`[PlannerAgent] Generated plan`, {
      requestId: output.requestId,
      stepsCount: finalPlan.steps.length,
      confidence: finalPlan.confidence.toFixed(2),
      complexity: finalPlan.estimatedComplexity.toFixed(2),
    })

    return output
  }

  /**
   * Refine an existing plan based on feedback
   * 
   * When a plan is criticized or needs improvement, this method refines it.
   * 
   * @param originalPlan - Plan to refine
   * @param feedback - Feedback from Critic Agent or user
   * @param requestContext - Request ID context
   * @returns Refined plan
   */
  async refinePlan(
    originalPlan: Plan,
    feedback: {
      issues?: string[]
      newRequirements?: string[]
    },
    requestContext: RequestContext
  ): Promise<PlannerAgentOutput> {
    const updatedContext = this.addToChain(requestContext)

    // Fetch MCP context
    const mcpContext = await this.fetchMCPContext()
    const enhancedSystemPrompt = this.buildEnhancedSystemPrompt(mcpContext)

    // Build refinement prompt
    const prompt = `Original Plan:
${this.formatPlanForPrompt(originalPlan)}

Feedback/Issues:
${feedback.issues?.join('\n') || 'None'}

New Requirements:
${feedback.newRequirements?.join('\n') || 'None'}

Refine this plan. Fix issues. Incorporate new requirements. Maintain the structured format.`

    const messages = [
      { role: 'system' as const, content: enhancedSystemPrompt },
      { role: 'user' as const, content: prompt },
    ]

    logger.debug(`[PlannerAgent] Refining plan`, {
      requestId: updatedContext.requestId,
      issuesCount: feedback.issues?.length || 0,
    })

    const response = await this.callLLM(messages, {
      temperature: 0.4, // Even more focused for refinement
      maxTokens: 2000,
    })

    const plan = this.parsePlanResponse(response, originalPlan.goal)
    const rationale = this.extractSection(response, 'RATIONALE') || 'Plan refined based on feedback.'

    const output: PlannerAgentOutput = {
      requestId: updatedContext.requestId,
      agentName: 'planner-agent',
      timestamp: new Date(),
      requestContext: updatedContext,
      plan,
      rationale,
      basedOnThoughts: [], // Refined plans aren't based on original thoughts
    }

    logger.info(`[PlannerAgent] Refined plan`, {
      requestId: output.requestId,
      stepsCount: plan.steps.length,
    })

    return output
  }

  /**
   * Build the planning prompt sent to the LLM
   * 
   * @param thoughts - Thoughts from Thought Agent
   * @param userQuery - Original user query
   * @param mcpContext - MCP context for recommended tools
   * @returns Formatted prompt string
   */
  private buildPlanningPrompt(
    thoughts: Thought[],
    userQuery: string,
    mcpContext?: MCPContext
  ): string {
    const primaryThought = thoughts[thoughts.length - 1] // Use most recent

    let prompt = `User Query: "${userQuery}"\n\n`

    // Add parameter extraction hints
    prompt += `PARAMETER EXTRACTION HINTS:\n`
    prompt += `Extract values from the user query above:\n`
    
    // Try to extract common patterns
    const facilityMatch = userQuery.match(/facility\s+([A-Z0-9]+)/i)
    if (facilityMatch) {
      prompt += `- Found facility identifier: "${facilityMatch[1]}" → use shortCode: "${facilityMatch[1]}" or find facilityId first\n`
    }
    
    const locationMatch = userQuery.match(/(?:in|at|from)\s+([A-Z][a-z]+)/i)
    if (locationMatch) {
      prompt += `- Found location: "${locationMatch[1]}" → use location: "${locationMatch[1]}"\n`
    }
    
    const idMatch = userQuery.match(/(?:id|ID)\s+([a-f0-9]{24}|[A-Z0-9-]+)/i)
    if (idMatch) {
      prompt += `- Found ID: "${idMatch[1]}" → use facilityId or id: "${idMatch[1]}" (check tool schema for exact parameter name)\n`
    }
    
    prompt += `\n`

    prompt += `Thought Agent Reasoning:\n${primaryThought.reasoning}\n\n`

    // Highlight recommended tools prominently
    if (primaryThought.approaches.length > 0) {
      prompt += `RECOMMENDED APPROACHES (prioritize these):\n`
      for (let i = 0; i < primaryThought.approaches.length; i++) {
        prompt += `${i + 1}. ${primaryThought.approaches[i]}\n`
      }
      prompt += `\n`
    }

    if (primaryThought.constraints.length > 0) {
      prompt += `CONSTRAINTS:\n${primaryThought.constraints.join('\n')}\n\n`
    }

    if (primaryThought.assumptions.length > 0) {
      prompt += `ASSUMPTIONS:\n${primaryThought.assumptions.join('\n')}\n\n`
    }

    if (primaryThought.uncertainties.length > 0) {
      prompt += `UNCERTAINTIES TO RESOLVE:\n${primaryThought.uncertainties.join('\n')}\n\n`
    }

    // Add tool usage examples if MCP context is available
    if (mcpContext && mcpContext.tools.length > 0) {
      prompt += `EXAMPLE TOOL USAGE:\n`
      
      // Find example tools from recommended approaches
      const exampleTools = ['get_facility', 'list_facilities', 'generate_intelligent_facility_report']
      for (const toolName of exampleTools) {
        const tool = mcpContext.tools.find(t => t.name === toolName)
        if (tool && tool.inputSchema?.properties) {
          prompt += `\n${tool.name}:\n`
          prompt += `  Description: ${tool.description}\n`
          prompt += `  Required parameters: ${tool.inputSchema.required?.join(', ') || 'none'}\n`
          prompt += `  Example call:\n`
          
          const exampleParams: Record<string, any> = {}
          for (const [paramName, paramSchema] of Object.entries(tool.inputSchema.properties)) {
            const schema = paramSchema as any
            if (paramName === 'id' || paramName === 'facilityId') {
              exampleParams[paramName] = '6905db9211cc522275d5f013'
            } else if (paramName === 'shortCode') {
              exampleParams[paramName] = 'ABC'
            } else if (paramName === 'location') {
              exampleParams[paramName] = 'Amsterdam'
            } else if (schema.type === 'boolean') {
              exampleParams[paramName] = true
            } else {
              exampleParams[paramName] = 'example_value'
            }
          }
          prompt += `    Parameters: ${JSON.stringify(exampleParams, null, 2)}\n`
        }
      }
      prompt += `\n`
    }

    prompt += `YOUR TASK:\n`
    prompt += `Create a detailed action plan using the EXACT tool names and parameter names from the available tools list.\n`
    prompt += `1. Extract parameter values from the user query (see hints above)\n`
    prompt += `2. Use recommended approaches from Thought Agent\n`
    prompt += `3. Use EXACT parameter names from tool schemas\n`
    prompt += `4. Include all required parameters\n`
    prompt += `5. Chain tools properly (e.g., list_facilities first to get facilityId, then use facilityId in subsequent calls)\n`

    return prompt
  }

  /**
   * Parse LLM response into Plan object
   * 
   * The LLM is instructed to format its response in sections.
   * This method extracts each section and builds a Plan object.
   * 
   * @param response - Raw LLM response
   * @param goal - Goal statement (extracted or fallback)
   * @param thoughts - Optional thoughts for confidence calculation
   * @returns Structured Plan object
   */
  private parsePlanResponse(
    response: string,
    goal: string,
    thoughts?: Thought[]
  ): Plan {
    // Try to parse as JSON first (for JSON mode responses)
    try {
      const cleanResponse = response.trim()
      logger.info(`[PlannerAgent] Attempting to parse JSON response`, {
        responseLength: cleanResponse.length,
        responsePreview: cleanResponse.substring(0, 500)
      })
      
      // Try to find the first complete JSON object
      // This handles cases where there might be extra characters after the JSON
      let jsonStart = cleanResponse.indexOf('{')
      if (jsonStart === -1) {
        throw new Error('No JSON object found in response')
      }
      
      // Find the matching closing brace
      let braceCount = 0
      let jsonEnd = -1
      for (let i = jsonStart; i < cleanResponse.length; i++) {
        if (cleanResponse[i] === '{') braceCount++
        if (cleanResponse[i] === '}') {
          braceCount--
          if (braceCount === 0) {
            jsonEnd = i + 1
            break
          }
        }
      }
      
      if (jsonEnd === -1) {
        throw new Error('Incomplete JSON object in response')
      }
      
      const jsonStr = cleanResponse.substring(jsonStart, jsonEnd)
      logger.debug(`[PlannerAgent] Extracted JSON string`, {
        jsonLength: jsonStr.length,
        jsonPreview: jsonStr.substring(0, 200)
      })
      
      const parsed = JSON.parse(jsonStr)
        
        // Validate and construct Plan from JSON
        if (parsed.goal && parsed.steps && Array.isArray(parsed.steps)) {
          logger.debug(`[PlannerAgent] Successfully parsed JSON plan`, {
            stepsCount: parsed.steps.length
          })
          
          return {
            id: `plan-${Date.now()}`,
            goal: parsed.goal,
            steps: parsed.steps.map((s: any, idx: number) => ({
              id: `step-${idx + 1}`,
              order: s.order || idx + 1,
              description: s.description || '',
              action: s.action || 'unknown',
              parameters: s.parameters || {},
              expectedOutcome: s.expectedOutcome || 'Success',
              dependencies: Array.isArray(s.dependencies) ? s.dependencies : [],
              status: 'pending' as const,
            })),
            estimatedComplexity: typeof parsed.estimatedComplexity === 'number' 
              ? parsed.estimatedComplexity 
              : this.estimateComplexity(parsed.steps),
            confidence: typeof parsed.confidence === 'number' 
              ? parsed.confidence 
              : (thoughts?.length ? thoughts.reduce((sum, t) => sum + t.confidence, 0) / thoughts.length : 0.7) * 0.9,
            dependencies: parsed.steps.flatMap((s: any) => 
              Array.isArray(s.dependencies) ? s.dependencies : []
            ),
            createdAt: new Date(),
          }
        }
    } catch (parseError: any) {
      // JSON parsing failed, fall back to text parsing
      logger.warn(`[PlannerAgent] JSON parse failed, falling back to text parsing: ${parseError?.message}`)
    }

    // Fallback to original text-based parsing
    logger.info(`[PlannerAgent] Using fallback text parsing`, {
      responseLength: response.length,
      responsePreview: response.substring(0, 500)
    })
    const goalMatch = this.extractSection(response, 'GOAL')
    const stepsText = this.extractSection(response, 'STEPS') || response
    const steps = this.parseSteps(stepsText)

    // Calculate confidence from thoughts if available
    const baseConfidence = thoughts?.length
      ? thoughts.reduce((sum, t) => sum + t.confidence, 0) / thoughts.length
      : 0.7

    return {
      id: `plan-${Date.now()}`,
      goal: goalMatch || goal,
      steps,
      estimatedComplexity: this.estimateComplexity(steps),
      confidence: baseConfidence * 0.9, // Slightly lower than thought confidence
      dependencies: this.extractDependencies(steps),
      createdAt: new Date(),
    }
  }

  /**
   * Parse steps from text
   * 
   * Extracts structured steps from LLM response text.
   * Handles various formats and extracts action, parameters, dependencies.
   * 
   * @param stepsText - Text containing step definitions
   * @returns Array of PlanStep objects
   */
  private parseSteps(stepsText: string): PlanStep[] {
    // Match step patterns - more flexible regex
    // Format: "1. Description\n   Action: ...\n   Parameters: ...\n   Expected: ...\n   Depends on: ..."
    const stepRegex = /(\d+)\.\s*([^\n]+)(?:\n\s*Action:\s*([^\n]+))?(?:\n\s*Parameters:\s*([^\n]+))?(?:\n\s*Expected:\s*([^\n]+))?(?:\n\s*Depends on:\s*([^\n]+))?/gi
    
    const matches = Array.from(stepsText.matchAll(stepRegex))

    if (matches.length === 0) {
      // Fallback: try to extract numbered list items
      const fallbackRegex = /(\d+)\.\s*([^\n]+(?:\n(?!\d+\.)[^\n]+)*)/g
      const fallbackMatches = Array.from(stepsText.matchAll(fallbackRegex))
      
      return fallbackMatches.map((match, index) => {
        const order = parseInt(match[1]) || index + 1
        const description = match[2]?.trim() || ''
        
        // Try to extract action from description
        const actionMatch = description.match(/(?:use|call|execute)\s+([a-z_]+)/i)
        const action = actionMatch ? actionMatch[1] : 'unknown'
        
        return {
          id: `step-${order}`,
          order,
          description,
          action,
          parameters: {},
          expectedOutcome: 'Success',
          dependencies: [],
          status: 'pending' as const,
        }
      })
    }

    return matches.map((match, index) => {
      const order = parseInt(match[1]) || index + 1
      const description = match[2]?.trim() || ''
      const action = match[3]?.trim() || 'unknown'
      const parametersText = match[4]?.trim()
      const expectedOutcome = match[5]?.trim() || 'Success'
      const dependenciesText = match[6]?.trim()

      // Parse parameters (try JSON first, handle nested JSON strings, then fallback)
      let parameters: Record<string, any> = {}
      if (parametersText) {
        try {
          // First attempt: parse as direct JSON
          parameters = JSON.parse(parametersText)
          
          // If we got a "value" key with a JSON string inside, parse that too
          if (parameters.value && typeof parameters.value === 'string') {
            try {
              const innerJson = JSON.parse(parameters.value)
              // If inner JSON is valid, use it instead of the wrapper
              if (typeof innerJson === 'object' && innerJson !== null) {
                parameters = innerJson
              }
            } catch {
              // Keep the outer parameters if inner parse fails
            }
          }
        } catch {
          // If not JSON, try to extract key-value pairs
          const kvPairs = parametersText.match(/(\w+):\s*([^\n,]+)/g)
          if (kvPairs) {
            for (const pair of kvPairs) {
              const [key, value] = pair.split(':').map(s => s.trim())
              if (key && value) {
                // Try to parse value as JSON if it looks like JSON
                try {
                  parameters[key] = JSON.parse(value)
                } catch {
                  parameters[key] = value.replace(/^["']|["']$/g, '') // Remove quotes
                }
              }
            }
          } else {
            // Last resort: try to extract any JSON-like structure from the text
            const jsonMatch = parametersText.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              try {
                parameters = JSON.parse(jsonMatch[0])
              } catch {
                // If all parsing fails, log but don't use generic "value"
                logger.warn(`[PlannerAgent] Failed to parse parameters for step ${order}: ${parametersText.substring(0, 50)}`)
                parameters = {} // Empty instead of generic "value"
              }
            }
          }
        }
      }

      // Parse dependencies
      const dependencies: string[] = []
      if (dependenciesText && dependenciesText.toLowerCase() !== 'none' && dependenciesText.toLowerCase() !== 'n/a') {
        const depNumbers = dependenciesText.split(',').map(d => d.trim()).filter(Boolean)
        dependencies.push(...depNumbers.map(d => `step-${d}`))
      }

      return {
        id: `step-${order}`,
        order,
        description,
        action,
        parameters,
        expectedOutcome,
        dependencies,
        status: 'pending' as const,
      }
    })
  }

  /**
   * Extract dependencies from steps
   * 
   * @param steps - Array of plan steps
   * @returns Array of unique dependency step IDs
   */
  private extractDependencies(steps: PlanStep[]): string[] {
    const deps = new Set<string>()
    steps.forEach(step => {
      step.dependencies?.forEach(dep => deps.add(dep))
    })
    return Array.from(deps)
  }

  /**
   * Estimate complexity from step count
   * 
   * @param steps - Array of plan steps
   * @returns Complexity score 0-1
   */
  private estimateComplexity(steps: PlanStep[]): number {
    // Simple heuristic: more steps = more complex, capped at 10 steps = max complexity
    return Math.min(1, steps.length / 10)
  }

  /**
   * Validate plan steps against MCP tool schemas
   * 
   * Checks that tool names exist and parameter names match schemas.
   * 
   * @param plan - Plan to validate
   * @param mcpContext - MCP context with available tools
   * @returns Validation results with warnings and errors
   */
  private validatePlan(
    plan: Plan,
    mcpContext: MCPContext
  ): { warnings: string[]; errors: string[] } {
    const warnings: string[] = []
    const errors: string[] = []
    
    // Build tool map for quick lookup
    const toolMap = new Map(mcpContext.tools.map(t => [t.name, t]))
    
    for (const step of plan.steps) {
      // Skip validation for non-tool actions
      if (step.action.toLowerCase().includes('manual') || 
          step.action.toLowerCase().includes('review') ||
          step.action === 'unknown') {
        continue
      }
      
      // Check if tool exists
      const tool = toolMap.get(step.action)
      if (!tool) {
        warnings.push(
          `Step ${step.order}: Tool "${step.action}" not found in available MCP tools. Available tools: ${Array.from(toolMap.keys()).slice(0, 5).join(', ')}...`
        )
        continue
      }
      
      // Validate parameters if tool has schema
      if (tool.inputSchema?.properties && step.parameters) {
        const schemaParams = Object.keys(tool.inputSchema.properties)
        const requiredParams = tool.inputSchema.required || []
        const stepParamKeys = Object.keys(step.parameters)
        
        // Check for invalid parameter names
        for (const paramKey of stepParamKeys) {
          if (!schemaParams.includes(paramKey)) {
            warnings.push(
              `Step ${step.order} (${step.action}): Parameter "${paramKey}" is not valid. Valid parameters: ${schemaParams.join(', ')}`
            )
          }
        }
        
        // Check for missing required parameters
        for (const requiredParam of requiredParams) {
          if (!stepParamKeys.includes(requiredParam)) {
            errors.push(
              `Step ${step.order} (${step.action}): Missing required parameter "${requiredParam}"`
            )
          }
        }
        
        // Warn if using generic parameter names
        const genericNames = ['value', 'data', 'input', 'params', 'args']
        for (const paramKey of stepParamKeys) {
          if (genericNames.includes(paramKey.toLowerCase()) && schemaParams.length > 0) {
            warnings.push(
              `Step ${step.order} (${step.action}): Using generic parameter name "${paramKey}". Consider using specific parameter names: ${schemaParams.join(', ')}`
            )
          }
        }
      }
    }
    
    return { warnings, errors }
  }

  /**
   * Normalize invalid tool names (e.g., functions.get_facility -> get_facility)
   * 
   * Fixes common patterns where LLM adds prefixes/suffixes to tool names
   * 
   * @param plan - Plan with potentially invalid tool names
   * @param mcpContext - MCP context with available tools
   * @returns Plan with normalized tool names
   */
  private normalizeToolNames(plan: Plan, mcpContext: MCPContext): Plan {
    // Build lookup map of available tools
    const toolMap = new Map(mcpContext.tools.map(t => [t.name.toLowerCase(), t.name]))
    
    // Normalize each step's action
    const normalizedSteps = plan.steps.map(step => {
      const originalAction = step.action
      let normalizedAction = originalAction
      
      // Skip if already a valid tool name
      if (toolMap.has(originalAction.toLowerCase())) {
        return step
      }
      
      // Try to fix common patterns
      // Pattern 1: functions.get_facility -> get_facility
      if (originalAction.startsWith('functions.')) {
        normalizedAction = originalAction.substring('functions.'.length)
        if (toolMap.has(normalizedAction.toLowerCase())) {
          logger.info(`[PlannerAgent] Normalized tool name: ${originalAction} -> ${normalizedAction}`)
          return { ...step, action: toolMap.get(normalizedAction.toLowerCase())! }
        }
      }
      
      // Pattern 2: multi_tool_use.parallel - this doesn't exist, can't normalize
      if (originalAction.startsWith('multi_tool_use.')) {
        logger.warn(`[PlannerAgent] Invalid tool pattern: ${originalAction} cannot be normalized`)
        return step // Leave as is, will be caught by validation
      }
      
      // Pattern 3: tool.get_facility -> get_facility
      if (originalAction.startsWith('tool.')) {
        normalizedAction = originalAction.substring('tool.'.length)
        if (toolMap.has(normalizedAction.toLowerCase())) {
          logger.info(`[PlannerAgent] Normalized tool name: ${originalAction} -> ${normalizedAction}`)
          return { ...step, action: toolMap.get(normalizedAction.toLowerCase())! }
        }
      }
      
      return step
    })
    
    return {
      ...plan,
      steps: normalizedSteps,
    }
  }

  /**
   * Format plan for prompt (used in refinement)
   * 
   * @param plan - Plan object to format
   * @returns Formatted string for LLM prompt
   */
  private formatPlanForPrompt(plan: Plan): string {
    let formatted = `GOAL: ${plan.goal}\n\nSTEPS:\n`
    
    for (const step of plan.steps) {
      formatted += `${step.order}. ${step.description}\n`
      formatted += `   Action: ${step.action}\n`
      if (step.parameters && Object.keys(step.parameters).length > 0) {
        formatted += `   Parameters: ${JSON.stringify(step.parameters)}\n`
      }
      formatted += `   Expected: ${step.expectedOutcome}\n`
      if (step.dependencies && step.dependencies.length > 0) {
        const depNumbers = step.dependencies.map(d => d.replace('step-', '')).join(', ')
        formatted += `   Depends on: ${depNumbers}\n`
      }
      formatted += '\n'
    }

    return formatted
  }
}


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
import { Thought, Plan, PlanStep, PlannerAgentOutput, RequestContext, MCPContext, PlanExample } from '@/types'
import { logger } from '@/utils/logger'
import { listMCPPrompts, listMCPTools } from '@/lib/mcp-prompts'
import { querySimilarPlanExamples, incrementPlanExampleUsage } from '@/lib/pinecone/planner-examples'
import { generateEmbedding } from '@/lib/ollama/embeddings'

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
1. Parameter Names: MUST use EXACT parameter names from tool schemas (e.g., use "facilityId", not "id" or "facility_id")
2. Parameter Extraction: Extract values from user query:
   - "facility ABC" → shortCode: "ABC"
   - "facility ID 123" → facilityId: "123" or id: "123" (check schema)
   - "location Amsterdam" → location: "Amsterdam"
3. JSON Format: Parameters must be valid JSON objects with exact parameter names
4. Tool Names: Use exact tool names as shown in available tools list
5. Dependencies: Reference step numbers (e.g., "1, 2" or [])
6. Required Parameters: All required parameters from tool schema MUST be included

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
   * Build enhanced system prompt with context
   * 
   * Dynamically constructs system prompt with MCP context and similar examples.
   * 
   * @param mcpContext - MCP tools/resources/prompts
   * @param similarExamples - Similar plan examples from Pinecone
   * @returns Enhanced system prompt
   */
  private buildEnhancedSystemPrompt(
    mcpContext: MCPContext,
    similarExamples: Array<{ example: PlanExample; similarity: number }> = []
  ): string {
    let prompt = this.baseSystemPrompt + '\n\n'

    // Add MCP tools context (critical for planning)
    if (mcpContext.tools.length > 0) {
      const categorized = this.categorizeTools(mcpContext.tools)
      
      prompt += '## Available MCP Tools\n\n'
      prompt += '⚠️ CRITICAL: Use EXACT tool names and parameter names shown below. Do NOT invent parameter names.\n\n'
      
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
    if (mcpContext.prompts.length > 0) {
      prompt += '## Available Workflow Templates\n\n'
      prompt += 'These are pre-built analysis workflows you can leverage:\n\n'
      
      for (const mcpPrompt of mcpContext.prompts) {
        prompt += `- **${mcpPrompt.name}**: ${mcpPrompt.description}\n`
      }

      prompt += '\n'
    }

    // Add similar examples context (vector-based learning)
    if (similarExamples.length > 0) {
      prompt += '## Similar Successful Plans\n\n'
      prompt += 'Learn parameter extraction patterns from these proven examples:\n\n'

      for (const { example, similarity } of similarExamples) {
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
   * Generate a plan from thoughts
   * 
   * Enhanced with MCP context and semantic memory.
   * 
   * @param thoughts - Thoughts from Thought Agent
   * @param userQuery - Original user query
   * @param requestContext - Request ID context from Thought Agent
   * @param mcpContext - Optional MCP context (will be fetched if not provided)
   * @param similarExamples - Optional similar examples (will be fetched if not provided)
   * @returns PlannerAgentOutput with structured plan
   */
  async generatePlan(
    thoughts: Thought[],
    userQuery: string,
    requestContext: RequestContext,
    mcpContext?: MCPContext,
    similarExamples?: Array<{ example: PlanExample; similarity: number }>
  ): Promise<PlannerAgentOutput> {
    // Step 1: Add this agent to the request chain
    const updatedContext = this.addToChain(requestContext)

    // Step 2: Fetch context if not provided
    const contextToUse = mcpContext || await this.fetchMCPContext()
    const examplesToUse = similarExamples || await this.fetchSemanticContext(userQuery)

    // Step 3: Build enhanced system prompt
    const enhancedSystemPrompt = this.buildEnhancedSystemPrompt(contextToUse, examplesToUse)

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

    // Step 7: Validate plan against MCP tool schemas
    const validationResults = this.validatePlan(plan, contextToUse)
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
      plan,
      rationale,
      basedOnThoughts: thoughts.map(t => t.id),
    }

    logger.info(`[PlannerAgent] Generated plan`, {
      requestId: output.requestId,
      stepsCount: plan.steps.length,
      confidence: plan.confidence.toFixed(2),
      complexity: plan.estimatedComplexity.toFixed(2),
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


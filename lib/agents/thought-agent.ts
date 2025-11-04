/**
 * Thought Agent
 * 
 * Generates internal reasoning and explores multiple solution approaches.
 * Think of this as the "brainstorming" phase before planning.
 * 
 * How it works:
 * 1. Receives user query and Request ID from Complexity Detector
 * 2. Fetches MCP context (tools, resources, prompts)
 * 3. Queries Pinecone for similar thought examples
 * 4. Uses LLM with rich context to generate deep reasoning thoughts
 * 5. Explores multiple approaches with tool recommendations
 * 6. Stores output with Request ID for chaining
 */

import { BaseAgent } from './base-agent'
import { Thought, ThoughtAgentOutput, RequestContext, MCPContext, ThoughtExample, ToolMemoryOutput, ComplexityScore } from '@/types'
import { logger } from '@/utils/logger'
import { listMCPPrompts, listMCPTools } from '@/lib/mcp-prompts'
import { querySimilarThoughtExamples, incrementThoughtExampleUsage } from '@/lib/pinecone/thought-examples'
import { generateEmbedding } from '@/lib/ollama/embeddings'
import { ToolMemoryAgent } from './tool-memory-agent'

/**
 * Thought Agent Class
 * 
 * Extends BaseAgent to provide thought generation capabilities.
 */
export class ThoughtAgent extends BaseAgent {
  /**
   * Base system prompt that guides the Thought Agent's behavior
   * 
   * This is enhanced with dynamic context (MCP tools, similar examples, etc.)
   */
  private readonly baseSystemPrompt = `You are an advanced Thought Agent - your job is to think through problems deeply before taking action.

Your thinking should be:
- Thorough: Consider multiple angles and approaches
- Practical: Focus on actionable solutions
- Tool-aware: Leverage available tools and resources
- Context-aware: Learn from similar past queries
- Structured: Provide clear reasoning and recommendations

When given a user query, think like a senior engineer planning a solution. Be thorough but concise.
Provide your reasoning in this structured format:

REASONING: [Your detailed reasoning about the problem]

APPROACHES:
1. [First possible approach]
2. [Second possible approach]
3. [Alternative approach if applicable]

CONSTRAINTS: [Key constraints, requirements, limitations]

ASSUMPTIONS: [Assumptions you're making]

UNCERTAINTIES: [What you're uncertain about]

TOOLS: [Which specific tools and workflow templates might help, with rationale]

When recommending tools and workflows:
- **For Tools**: Provide specific function calls with example arguments
  - Example: "Use generate_intelligent_facility_report(facilityId: 'ABC') to get comprehensive analysis"
  - Chain tools when needed: "First list_facilities(), then for each facility call analyze_shipment_risk(shipmentId: ...)"
- **For Workflow Templates/Prompts**: Mention the exact prompt name when a pre-built workflow is relevant
  - Example: "Use the compare-facilities-performance workflow template to analyze multiple facilities"
  - Example: "Leverage the analyze-facility-compliance prompt for comprehensive compliance analysis"
  - When a workflow template matches the query, mention it by its exact name (e.g., "compare-facilities-performance", "analyze-facility-compliance")
- Explain why each tool or workflow template is appropriate for the query
- **IMPORTANT**: If a workflow template from the "Available Workflow Templates" section matches your query, include its exact name in the TOOLS section`

  constructor() {
    super('thought-agent')
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

      logger.debug(`[ThoughtAgent] Fetched MCP context`, {
        toolsCount: tools.length,
        promptsCount: prompts.length,
      })

      return {
        tools,
        resources,
        prompts,
      }
    } catch (error: any) {
      logger.error(`[ThoughtAgent] Failed to fetch MCP context:`, error)
      return { tools: [], resources: [], prompts: [] }
    }
  }

  /**
   * Fetch semantic context from Pinecone
   * 
   * Queries for similar thought examples based on user query.
   * 
   * @param userQuery - User query to find similar examples for
   * @returns Array of similar examples with similarity scores
   */
  async fetchSemanticContext(userQuery: string): Promise<Array<{ example: ThoughtExample; similarity: number }>> {
    try {
      const embedding = await generateEmbedding(userQuery)
      const results = await querySimilarThoughtExamples(embedding, 3, 0.7)
      
      // Increment usage count for matched examples
      for (const result of results) {
        try {
          await incrementThoughtExampleUsage(result.example.id)
        } catch (err) {
          logger.warn(`[ThoughtAgent] Failed to increment usage for example ${result.example.id}:`, err)
        }
      }

      logger.debug(`[ThoughtAgent] Found similar examples`, {
        count: results.length,
        similarities: results.map(r => r.similarity.toFixed(2)),
      })

      return results
    } catch (error: any) {
      logger.error(`[ThoughtAgent] Failed to fetch semantic context:`, error)
      return []
    }
  }

  /**
   * Build enhanced system prompt with context
   * 
   * Dynamically constructs system prompt with MCP context, similar examples, and tool recommendations.
   * 
   * @param mcpContext - MCP tools/resources/prompts
   * @param similarExamples - Similar thought examples from Pinecone
   * @param toolRecommendations - Optional tool memory recommendations
   * @returns Enhanced system prompt
   */
  private buildEnhancedSystemPrompt(
    mcpContext: MCPContext,
    similarExamples: Array<{ example: ThoughtExample; similarity: number }>,
    toolRecommendations?: ToolMemoryOutput
  ): string {
    let prompt = this.baseSystemPrompt + '\n\n'

    // Add MCP tools context
    if (mcpContext.tools.length > 0) {
      const categorized = this.categorizeTools(mcpContext.tools)
      
      prompt += '## Available MCP Tools\n\n'
      
      for (const [category, tools] of Object.entries(categorized)) {
        if (tools.length > 0) {
          prompt += `### ${category}\n`
          for (const tool of tools) {
            prompt += `- **${tool.name}**: ${tool.description}\n`
            
            // Add input schema if available
            if (tool.inputSchema?.properties) {
              const params = Object.entries(tool.inputSchema.properties)
                .map(([key, schema]: [string, any]) => {
                  const required = tool.inputSchema.required?.includes(key) ? ' (required)' : ''
                  return `  - ${key}${required}: ${schema.description || schema.type}`
                })
                .join('\n')
              if (params) {
                prompt += `  Parameters:\n${params}\n`
              }
            }
          }
          prompt += '\n'
        }
      }

      prompt += 'Provide specific tool calls with arguments, not just tool names.\n\n'
    }

    // Add MCP prompts context
    if (mcpContext.prompts.length > 0) {
      prompt += '## Available Workflow Templates\n\n'
      prompt += '🚨 IMPORTANT: These are pre-built analysis workflows you can leverage.\n'
      prompt += '**When a workflow template matches the user query, mention its EXACT name in the TOOLS section.**\n\n'
      
      for (const mcpPrompt of mcpContext.prompts) {
        prompt += `- **${mcpPrompt.name}**: ${mcpPrompt.description}\n`
      }

      prompt += '\n'
      prompt += '**Examples of when to recommend workflow templates:**\n'
      prompt += '- Query mentions "compare" or "performance" → consider "compare-facilities-performance"\n'
      prompt += '- Query mentions "compliance" or "inspection" → consider "analyze-facility-compliance"\n'
      prompt += '- Query mentions "contamination" or "report" → consider "generate-contamination-report"\n'
      prompt += '- Query mentions "shipment" and "review" → consider "review-shipment-inspection"\n'
      prompt += '\n'
      prompt += '**When recommending a workflow template, use this format in TOOLS section:**\n'
      prompt += '  "Use the [exact-prompt-name] workflow template to [what it does]"\n'
      prompt += '  Example: "Use the compare-facilities-performance workflow template to analyze and compare multiple facilities"\n\n'
    }

    // Add similar examples context
    if (similarExamples.length > 0) {
      prompt += '## Similar Successful Examples\n\n'
      prompt += 'Learn from these proven patterns:\n\n'

      for (const { example, similarity } of similarExamples) {
        prompt += `### Example (${(similarity * 100).toFixed(0)}% similar): "${example.query}"\n`
        
        if (example.reasoning) {
          prompt += `Reasoning: ${example.reasoning.substring(0, 200)}${example.reasoning.length > 200 ? '...' : ''}\n`
        }
        
        if (example.approaches.length > 0) {
          prompt += `Approach: ${example.approaches[0]}\n`
        }
        
        if (example.recommendedTools.length > 0) {
          prompt += `Tools: ${example.recommendedTools.join(', ')}\n`
        }

        if (example.successRating >= 0.9) {
          prompt += `✅ Highly successful pattern (${(example.successRating * 100).toFixed(0)}% success rate)\n`
        }

        prompt += '\n'
      }
    }

    // Add tool memory recommendations if available
    if (toolRecommendations && toolRecommendations.recommendedTools.length > 0) {
      prompt += '## AI-Powered Tool Recommendations\n\n'
      prompt += '🚨 IMPORTANT: These tools have been intelligently recommended based on similar successful patterns.\n\n'
      prompt += 'Prioritize these tools in your TOOLS section:\n\n'
      
      // Sort by priority
      const sortedTools = [...toolRecommendations.recommendedTools].sort(
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

      if (toolRecommendations.toolChains.length > 0) {
        prompt += '### Recommended Tool Chains\n\n'
        for (const chain of toolRecommendations.toolChains) {
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

    // Add domain knowledge
    prompt += '## Domain Knowledge\n\n'
    prompt += '- Waste management facility operations\n'
    prompt += '- Contamination detection and analysis\n'
    prompt += '- Inspection workflows and compliance\n'
    prompt += '- Shipment tracking and risk assessment\n'
    prompt += '- Contract management and validation\n\n'

    prompt += '## Your Task\n\n'
    prompt += 'Given the context above, think deeply about the user query. Consider:\n'
    
    if (toolRecommendations) {
      prompt += '1. Use the AI-recommended tools above (they are prioritized for this query)\n'
      prompt += '2. Which specific tools/resources would be most helpful (provide arguments)\n'
      prompt += '3. What similar queries succeeded before\n'
      prompt += '4. Domain-specific constraints and best practices\n'
      prompt += '5. Multiple solution approaches with trade-offs\n'
      prompt += '6. Tool chains and workflows\n'
    } else {
      prompt += '1. Which specific tools/resources would be most helpful (provide arguments)\n'
      prompt += '2. What similar queries succeeded before\n'
      prompt += '3. Domain-specific constraints and best practices\n'
      prompt += '4. Multiple solution approaches with trade-offs\n'
      prompt += '5. Tool chains and workflows\n'
    }

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
   * Fetch tool recommendations from Tool Memory Agent
   * 
   * @param userQuery - User query
   * @param requestContext - Request context
   * @param complexityScore - Optional complexity score
   * @returns Tool recommendations or null if agent is not available
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
        logger.debug(`[ThoughtAgent] Tool Memory Agent not available:`, error.message)
        return null
      }

      const mcpContext = await this.fetchMCPContext()
      const recommendations = await toolMemoryAgent.recommendTools(
        userQuery,
        requestContext,
        complexityScore,
        mcpContext
      )

      logger.debug(`[ThoughtAgent] Fetched tool recommendations`, {
        toolsRecommended: recommendations.recommendedTools.length,
      })

      return recommendations
    } catch (error: any) {
      logger.warn(`[ThoughtAgent] Failed to fetch tool recommendations:`, error.message)
      return null
    }
  }

  /**
   * Generate initial thoughts for a user query
   * 
   * Enhanced with MCP context, semantic memory, and tool recommendations.
   * 
   * @param userQuery - User's query
   * @param requestContext - Request ID context from Complexity Detector
   * @param context - Additional context (previous thoughts, complexity score, etc.)
   * @param mcpContext - Optional MCP context (will be fetched if not provided)
   * @param similarExamples - Optional similar examples (will be fetched if not provided)
   * @param toolRecommendations - Optional tool recommendations (will be fetched if not provided)
   * @returns ThoughtAgentOutput with reasoning thoughts
   */
  async generateThought(
    userQuery: string,
    requestContext: RequestContext,
    context: {
      previousThoughts?: Thought[]
      complexityScore?: number
      reasoningPasses?: number
      complexity?: ComplexityScore
    } = {},
    mcpContext?: MCPContext,
    similarExamples?: Array<{ example: ThoughtExample; similarity: number }>,
    toolRecommendations?: ToolMemoryOutput
  ): Promise<ThoughtAgentOutput> {
    // Step 1: Add this agent to the request chain
    const updatedContext = this.addToChain(requestContext)

    // Step 2: Fetch context if not provided
    const contextToUse = mcpContext || await this.fetchMCPContext()
    const examplesToUse = similarExamples || await this.fetchSemanticContext(userQuery)

    // Step 3: Fetch tool recommendations if not provided
    let toolRecs = toolRecommendations
    if (!toolRecs && context.complexity) {
      // Try to fetch from Tool Memory Agent
      const fetched = await this.fetchToolRecommendations(
        userQuery,
        updatedContext,
        context.complexity
      )
      toolRecs = fetched || undefined
    }

    // Step 4: Build enhanced system prompt
    const enhancedSystemPrompt = this.buildEnhancedSystemPrompt(
      contextToUse,
      examplesToUse,
      toolRecs || undefined
    )

    // Step 4: Build the prompt for the LLM
    const prompt = this.buildThoughtPrompt(userQuery, context)

    // Step 5: Call LLM with enhanced context
    const messages = [
      { role: 'system' as const, content: enhancedSystemPrompt },
      { role: 'user' as const, content: prompt },
    ]

    logger.debug(`[ThoughtAgent] Generating thought for query`, {
      requestId: updatedContext.requestId,
      queryLength: userQuery.length,
      hasComplexityScore: context.complexityScore !== undefined,
      toolsCount: contextToUse.tools.length,
      similarExamplesCount: examplesToUse.length,
    })

    const response = await this.callLLM(messages, {
      temperature: 0.7, // Creative thinking - explore multiple approaches
      maxTokens: 2000, // More tokens for richer context
    })

    // Step 6: Parse the structured response
    const thought = this.parseThoughtResponse(response, userQuery, 1)

    // Step 7: Extract recommended tools and prompts (match against actual MCP resources)
    const recommendations = this.extractToolSuggestions(response, contextToUse, userQuery)

    // Step 8: Build output with Request ID
    const output: ThoughtAgentOutput = {
      // Agent output base
      requestId: updatedContext.requestId,
      agentName: 'thought-agent',
      timestamp: new Date(),
      requestContext: updatedContext,

      // Thought-specific output
      thoughts: [thought],
      primaryApproach: thought.approaches[0] || 'Unknown approach',
      keyInsights: this.extractKeyInsights(thought.reasoning),
      recommendedTools: recommendations.tools,
      recommendedPrompts: recommendations.prompts.length > 0 ? recommendations.prompts : undefined,
      complexityScore: context.complexityScore,
      reasoningPass: 1,
      totalPasses: context.reasoningPasses || 1,
    }

    logger.info(`[ThoughtAgent] Generated thought`, {
      requestId: output.requestId,
      approaches: thought.approaches.length,
      confidence: thought.confidence.toFixed(2),
      similarExamplesUsed: examplesToUse.length,
    })

    return output
  }

  /**
   * Generate thoughts in a multi-pass reasoning loop
   * 
   * Enhanced passes with deeper context.
   * 
   * @param userQuery - Original user query
   * @param previousThought - Thought from previous pass
   * @param passNumber - Which pass this is (2 or 3)
   * @param totalPasses - Total passes planned
   * @param requestContext - Request ID context
   * @param toolRecommendations - Optional tool recommendations
   * @returns ThoughtAgentOutput with refined thoughts
   */
  async generateThoughtLoop(
    userQuery: string,
    previousThought: Thought,
    passNumber: number,
    totalPasses: number,
    requestContext: RequestContext,
    toolRecommendations?: ToolMemoryOutput
  ): Promise<ThoughtAgentOutput> {
    // Add to chain
    const updatedContext = this.addToChain(requestContext)

    // Fetch context for enhanced reasoning
    const mcpContext = await this.fetchMCPContext()
    const similarExamples = await this.fetchSemanticContext(userQuery)
    
    // Build enhanced system prompt (include tool recommendations if available)
    const enhancedSystemPrompt = this.buildEnhancedSystemPrompt(
      mcpContext,
      similarExamples,
      toolRecommendations
    )

    // Build prompt that references previous thought
    const prompt = `Previous thought (pass ${passNumber - 1}/${totalPasses}):
${previousThought.reasoning}

Approaches considered:
${previousThought.approaches.join('\n')}

Uncertainties identified:
${previousThought.uncertainties.join('\n')}

Original user query: ${userQuery}

Think deeper. Refine your reasoning. Address the uncertainties. Consider alternative angles.
Challenge your assumptions. Explore edge cases.`

    const messages = [
      { role: 'system' as const, content: enhancedSystemPrompt },
      { role: 'user' as const, content: prompt },
    ]

    logger.debug(`[ThoughtAgent] Generating thought loop`, {
      requestId: updatedContext.requestId,
      passNumber,
      totalPasses,
    })

    // Later passes: more focused, less creative
    const response = await this.callLLM(messages, {
      temperature: passNumber === 2 ? 0.6 : 0.5, // More focused as passes increase
      maxTokens: 2000,
    })

    const thought = this.parseThoughtResponse(response, userQuery, passNumber)

    // Extract recommended tools and prompts
    const recommendations = this.extractToolSuggestions(response, mcpContext, userQuery)

    const output: ThoughtAgentOutput = {
      requestId: updatedContext.requestId,
      agentName: 'thought-agent',
      timestamp: new Date(),
      requestContext: updatedContext,
      thoughts: [thought],
      primaryApproach: thought.approaches[0] || 'Unknown',
      keyInsights: this.extractKeyInsights(thought.reasoning),
      recommendedTools: recommendations.tools,
      recommendedPrompts: recommendations.prompts.length > 0 ? recommendations.prompts : undefined,
      reasoningPass: passNumber,
      totalPasses,
    }

    logger.info(`[ThoughtAgent] Generated thought loop`, {
      requestId: output.requestId,
      passNumber,
      confidence: thought.confidence.toFixed(2),
    })

    return output
  }

  /**
   * Build the prompt sent to the LLM
   * 
   * This method constructs a clear prompt that gives the LLM
   * all the context it needs to generate good reasoning.
   * 
   * @param query - User query
   * @param context - Additional context
   * @returns Formatted prompt string
   */
  private buildThoughtPrompt(
    query: string,
    context: {
      previousThoughts?: Thought[]
      complexityScore?: number
    }
  ): string {
    let prompt = `User Query: ${query}\n\n`

    // Include complexity info if available
    if (context.complexityScore !== undefined) {
      prompt += `Complexity Score: ${(context.complexityScore * 100).toFixed(0)}%\n\n`
    }

    // Include previous thoughts if this is a follow-up
    if (context.previousThoughts && context.previousThoughts.length > 0) {
      prompt += `Previous Thoughts:\n${context.previousThoughts
        .map(t => `- ${t.reasoning.substring(0, 200)}...`)
        .join('\n')}\n\n`
    }

    prompt += `Think through this problem deeply. Provide your reasoning in the structured format.`

    return prompt
  }

  /**
   * Parse LLM response into structured Thought object
   * 
   * The LLM is instructed to format its response in sections.
   * This method extracts each section and builds a Thought object.
   * 
   * @param response - Raw LLM response
   * @param userQuery - Original user query
   * @param passNumber - Which pass this is
   * @returns Structured Thought object
   */
  private parseThoughtResponse(
    response: string,
    userQuery: string,
    passNumber: number
  ): Thought {
    return {
      id: `thought-${Date.now()}-${passNumber}`,
      timestamp: new Date(),
      reasoning: this.extractSection(response, 'REASONING') || response,
      approaches: this.extractList(response, 'APPROACHES'),
      constraints: this.extractList(response, 'CONSTRAINTS'),
      assumptions: this.extractList(response, 'ASSUMPTIONS'),
      uncertainties: this.extractList(response, 'UNCERTAINTIES'),
      confidence: this.estimateConfidence(response),
    }
  }

  /**
   * Match prompts semantically based on user query
   * 
   * Uses keyword matching to find relevant prompts when they're not explicitly mentioned.
   * 
   * @param userQuery - User's query
   * @param mcpContext - MCP context with available prompts
   * @returns Array of prompt names that semantically match the query
   */
  private matchPromptsSemantically(
    userQuery: string,
    mcpContext: MCPContext
  ): string[] {
    if (mcpContext.prompts.length === 0) {
      return []
    }

    const queryLower = userQuery.toLowerCase()
    const matchedPrompts: string[] = []

    // Define keyword mappings for each prompt
    const promptKeywords: Record<string, string[]> = {
      'compare-facilities-performance': ['compare', 'comparison', 'performance', 'benchmark', 'metrics', 'multiple facilities', 'across facilities'],
      'analyze-facility-compliance': ['compliance', 'inspection', 'regulatory', 'violation', 'meets conditions', 'accepted'],
      'generate-contamination-report': ['contamination', 'contaminant', 'report', 'waste item', 'detected'],
      'review-shipment-inspection': ['shipment', 'review', 'inspection', 'delivery', 'accept'],
      'analyze-facility-with-risks': ['risk', 'risky', 'hazard', 'danger', 'safety'],
      'facility-report-with-recommendations': ['report', 'recommendation', 'suggest', 'advice', 'improve'],
      'analyze-source-shipment-risks': ['source', 'origin', 'shipment risk', 'where from'],
      'find-high-risk-contaminants-and-facilities': ['high risk', 'dangerous', 'explosive', 'hazardous', 'critical'],
      'contaminant-to-shipment-analysis': ['contaminant', 'shipment', 'trace', 'track'],
      'assess-facility-shipment-risks': ['assess', 'evaluate', 'risk assessment', 'facility risk'],
      'assess-source-risk-profile': ['source risk', 'origin risk', 'profile'],
      'analyze-high-explosive-contaminants': ['explosive', 'explosion', 'high explosive', 'bomb'],
      'analyze-facilities-by-location': ['location', 'by location', 'in', 'at', 'facilities in', 'facilities at'],
    }

    // Check each prompt for keyword matches
    for (const prompt of mcpContext.prompts) {
      const promptName = prompt.name.toLowerCase()
      const keywords = promptKeywords[prompt.name] || []
      
      // Check if query contains any keywords for this prompt
      const hasKeywordMatch = keywords.some(keyword => queryLower.includes(keyword))
      
      // Also check if prompt description matches
      const descriptionLower = prompt.description.toLowerCase()
      const descriptionWords = descriptionLower.split(/\s+/)
      const queryWords = queryLower.split(/\s+/)
      
      // Check for significant word overlap (at least 2 words)
      const commonWords = descriptionWords.filter(word => 
        word.length > 3 && queryWords.includes(word)
      )
      
      if (hasKeywordMatch || commonWords.length >= 2) {
        matchedPrompts.push(prompt.name)
        logger.debug(`[ThoughtAgent] Semantically matched prompt`, {
          promptName: prompt.name,
          hasKeywordMatch,
          commonWordsCount: commonWords.length,
        })
      }
    }

    return matchedPrompts
  }

  /**
   * Extract tool suggestions from LLM response
   * 
   * The LLM might mention tools and prompts in its response.
   * This extracts them separately for use by later agents.
   * Also includes semantic matching as fallback for prompts.
   * 
   * @param response - LLM response
   * @param mcpContext - MCP context to match against
   * @param userQuery - Original user query for semantic matching fallback
   * @returns Object with separate arrays for tools and prompts
   */
  private extractToolSuggestions(
    response: string,
    mcpContext: MCPContext,
    userQuery?: string
  ): { tools: string[]; prompts: string[] } {
    const toolsSection = this.extractSection(response, 'TOOLS')
    
    const toolRecommendations = new Set<string>()
    const promptRecommendations = new Set<string>()
    
    // Build lookup maps (case-insensitive) from actual MCP server data
    const toolMap = new Map(mcpContext.tools.map(t => [t.name.toLowerCase(), t.name]))
    const promptMap = new Map(mcpContext.prompts.map(p => [p.name.toLowerCase(), p.name]))
    const resourceMap = new Map(
      mcpContext.resources
        .map(r => [r.name?.toLowerCase(), r.name])
        .filter(([k, v]) => k && v) as Array<[string, string]>
    )
    
    // Extract from TOOLS section if it exists
    if (toolsSection) {
      const toolsSectionLower = toolsSection.toLowerCase()
      
      // First, check for exact matches of tool/prompt names in the text
      // This handles hyphenated names like "compare-facilities-performance"
      for (const [lowerName, originalName] of Array.from(toolMap.entries())) {
        if (toolsSectionLower.includes(lowerName)) {
          toolRecommendations.add(originalName)
        }
      }
      
      for (const [lowerName, originalName] of Array.from(promptMap.entries())) {
        if (toolsSectionLower.includes(lowerName)) {
          promptRecommendations.add(originalName)
        }
      }
      
      for (const [lowerName, originalName] of Array.from(resourceMap.entries())) {
        if (lowerName && toolsSectionLower.includes(lowerName)) {
          toolRecommendations.add(originalName)
        }
      }
      
      // Also extract individual words for potential partial matches
      // This helps catch cases where the LLM mentions just part of a name
      const words = toolsSectionLower.match(/\b[a-z][a-z0-9_]*[a-z0-9]\b/g) || []
      for (const word of words) {
        // Skip if already matched as full name
        if (toolMap.has(word) && !toolRecommendations.has(toolMap.get(word)!)) {
          toolRecommendations.add(toolMap.get(word)!)
        } else if (promptMap.has(word) && !promptRecommendations.has(promptMap.get(word)!)) {
          promptRecommendations.add(promptMap.get(word)!)
        } else if (resourceMap.has(word) && !toolRecommendations.has(resourceMap.get(word)!)) {
          toolRecommendations.add(resourceMap.get(word)!)
        }
      }
    }
    
    // Semantic matching fallback: ALWAYS try semantic matching if userQuery is provided
    // This ensures prompts are found even if LLM doesn't include TOOLS section or doesn't mention prompts explicitly
    if (userQuery && (promptRecommendations.size === 0 || !toolsSection)) {
      const semanticMatches = this.matchPromptsSemantically(userQuery, mcpContext)
      for (const promptName of semanticMatches) {
        promptRecommendations.add(promptName)
      }
      
      if (semanticMatches.length > 0) {
        logger.debug(`[ThoughtAgent] Used semantic matching to find prompts`, {
          promptsFound: semanticMatches,
          userQuery,
          hadToolsSection: !!toolsSection,
        })
      }
    }
    
    return {
      tools: Array.from(toolRecommendations),
      prompts: Array.from(promptRecommendations),
    }
  }

  /**
   * Extract key insights from reasoning text
   * 
   * Insights are important points extracted from the reasoning.
   * This is a simple extraction - could be enhanced with NLP.
   * 
   * @param reasoning - Full reasoning text
   * @returns Array of key insights
   */
  private extractKeyInsights(reasoning: string): string[] {
    // Simple approach: split by sentences and take important ones
    const sentences = reasoning.split(/[.!?]+/).filter(Boolean)
    
    // Filter for sentences that seem like insights (contain keywords)
    const insightKeywords = ['important', 'key', 'critical', 'note', 'must', 'should', 'requires']
    return sentences
      .filter(s => {
        const lower = s.toLowerCase()
        return insightKeywords.some(keyword => lower.includes(keyword))
      })
      .slice(0, 5) // Limit to 5 insights
      .map(s => s.trim())
  }

  /**
   * Estimate confidence based on response
   * 
   * More uncertainties = lower confidence.
   * This is a heuristic - could be enhanced with LLM confidence scoring.
   * 
   * @param response - LLM response
   * @returns Confidence score 0-1
   */
  private estimateConfidence(response: string): number {
    const uncertainties = this.extractList(response, 'UNCERTAINTIES')
    const baseConfidence = 0.7
    const uncertaintyPenalty = Math.min(0.3, uncertainties.length * 0.1)
    return Math.max(0.3, baseConfidence - uncertaintyPenalty)
  }
}

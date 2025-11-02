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
import { Thought, ThoughtAgentOutput, RequestContext, MCPContext, ThoughtExample } from '@/types'
import { logger } from '@/utils/logger'
import { listMCPPrompts, listMCPTools } from '@/lib/mcp-prompts'
import { querySimilarThoughtExamples, incrementThoughtExampleUsage } from '@/lib/pinecone/thought-examples'
import { generateEmbedding } from '@/lib/ollama/embeddings'

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

TOOLS: [Which specific tools might help, with rationale]

When recommending tools:
- Provide specific function calls with example arguments
- Example: "Use generate_intelligent_facility_report(facilityId: 'ABC') to get comprehensive analysis"
- Chain tools when needed: "First list_facilities(), then for each facility call analyze_shipment_risk(shipmentId: ...)"
- Explain why each tool is appropriate for the query`

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
   * Dynamically constructs system prompt with MCP context and similar examples.
   * 
   * @param mcpContext - MCP tools/resources/prompts
   * @param similarExamples - Similar thought examples from Pinecone
   * @returns Enhanced system prompt
   */
  private buildEnhancedSystemPrompt(
    mcpContext: MCPContext,
    similarExamples: Array<{ example: ThoughtExample; similarity: number }>
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
      prompt += 'These are pre-built analysis workflows you can leverage:\n\n'
      
      for (const mcpPrompt of mcpContext.prompts) {
        prompt += `- **${mcpPrompt.name}**: ${mcpPrompt.description}\n`
      }

      prompt += '\n'
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

    // Add domain knowledge
    prompt += '## Domain Knowledge\n\n'
    prompt += '- Waste management facility operations\n'
    prompt += '- Contamination detection and analysis\n'
    prompt += '- Inspection workflows and compliance\n'
    prompt += '- Shipment tracking and risk assessment\n'
    prompt += '- Contract management and validation\n\n'

    prompt += '## Your Task\n\n'
    prompt += 'Given the context above, think deeply about the user query. Consider:\n'
    prompt += '1. Which specific tools/resources would be most helpful (provide arguments)\n'
    prompt += '2. What similar queries succeeded before\n'
    prompt += '3. Domain-specific constraints and best practices\n'
    prompt += '4. Multiple solution approaches with trade-offs\n'
    prompt += '5. Tool chains and workflows\n'

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
   * Generate initial thoughts for a user query
   * 
   * Enhanced with MCP context and semantic memory.
   * 
   * @param userQuery - User's query
   * @param requestContext - Request ID context from Complexity Detector
   * @param context - Additional context (previous thoughts, complexity score, etc.)
   * @param mcpContext - Optional MCP context (will be fetched if not provided)
   * @param similarExamples - Optional similar examples (will be fetched if not provided)
   * @returns ThoughtAgentOutput with reasoning thoughts
   */
  async generateThought(
    userQuery: string,
    requestContext: RequestContext,
    context: {
      previousThoughts?: Thought[]
      complexityScore?: number
      reasoningPasses?: number
    } = {},
    mcpContext?: MCPContext,
    similarExamples?: Array<{ example: ThoughtExample; similarity: number }>
  ): Promise<ThoughtAgentOutput> {
    // Step 1: Add this agent to the request chain
    const updatedContext = this.addToChain(requestContext)

    // Step 2: Fetch context if not provided
    const contextToUse = mcpContext || await this.fetchMCPContext()
    const examplesToUse = similarExamples || await this.fetchSemanticContext(userQuery)

    // Step 3: Build enhanced system prompt
    const enhancedSystemPrompt = this.buildEnhancedSystemPrompt(contextToUse, examplesToUse)

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

    // Step 7: Extract recommended tools (match against actual MCP resources)
    const recommendedTools = this.extractToolSuggestions(response, contextToUse)

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
      recommendedTools,
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
   * @returns ThoughtAgentOutput with refined thoughts
   */
  async generateThoughtLoop(
    userQuery: string,
    previousThought: Thought,
    passNumber: number,
    totalPasses: number,
    requestContext: RequestContext
  ): Promise<ThoughtAgentOutput> {
    // Add to chain
    const updatedContext = this.addToChain(requestContext)

    // Fetch context for enhanced reasoning
    const mcpContext = await this.fetchMCPContext()
    const similarExamples = await this.fetchSemanticContext(userQuery)
    
    // Build enhanced system prompt
    const enhancedSystemPrompt = this.buildEnhancedSystemPrompt(mcpContext, similarExamples)

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

    const output: ThoughtAgentOutput = {
      requestId: updatedContext.requestId,
      agentName: 'thought-agent',
      timestamp: new Date(),
      requestContext: updatedContext,
      thoughts: [thought],
      primaryApproach: thought.approaches[0] || 'Unknown',
      keyInsights: this.extractKeyInsights(thought.reasoning),
      recommendedTools: this.extractToolSuggestions(response, mcpContext),
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
   * Extract tool suggestions from LLM response
   * 
   * The LLM might mention tools in its response.
   * This extracts them for use by later agents.
   * 
   * @param response - LLM response
   * @returns Array of recommended tool names
   */
  private extractToolSuggestions(response: string, mcpContext: MCPContext): string[] {
    const toolsSection = this.extractSection(response, 'TOOLS')
    if (!toolsSection) return []

    const recommendations = new Set<string>()
    
    // Build lookup maps (case-insensitive) from actual MCP server data
    const toolMap = new Map(mcpContext.tools.map(t => [t.name.toLowerCase(), t.name]))
    const promptMap = new Map(mcpContext.prompts.map(p => [p.name.toLowerCase(), p.name]))
    const resourceMap = new Map(
      mcpContext.resources
        .map(r => [r.name?.toLowerCase(), r.name])
        .filter(([k, v]) => k && v) as Array<[string, string]>
    )
    
    // Extract all potential identifiers from the TOOLS section
    // Match: words with underscores, hyphens, or alphanumeric sequences
    const words = toolsSection.toLowerCase().match(/\b[a-z][a-z0-9_-]*[a-z0-9]\b/g) || []
    
    for (const word of words) {
      // Check against all MCP resources (tools, prompts, resources)
      if (toolMap.has(word)) {
        recommendations.add(toolMap.get(word)!)
      } else if (promptMap.has(word)) {
        recommendations.add(promptMap.get(word)!)
      } else if (resourceMap.has(word)) {
        recommendations.add(resourceMap.get(word)!)
      }
    }
    
    return Array.from(recommendations)
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

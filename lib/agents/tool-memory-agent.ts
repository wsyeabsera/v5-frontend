/**
 * Tool Memory Agent
 * 
 * Provides intelligent tool recommendations based on:
 * - User query and complexity factors
 * - Similar past tool usage patterns (Pinecone memory)
 * - Available MCP tools and prompts
 * 
 * This agent learns from successful tool usage patterns and helps other agents
 * (like Thought Agent) make better tool selection decisions.
 */

import { BaseAgent } from './base-agent'
import {
  ToolMemoryOutput,
  ToolRecommendation,
  ToolChain,
  RequestContext,
  MCPContext,
  ComplexityScore,
} from '@/types'
import { logger } from '@/utils/logger'
import { listMCPPrompts, listMCPTools } from '@/lib/mcp-prompts'
import {
  querySimilarToolUsage,
  incrementToolMemoryUsage,
} from '@/lib/pinecone/tool-memory'
import { generateEmbedding } from '@/lib/ollama/embeddings'

/**
 * Tool Memory Agent Class
 * 
 * Extends BaseAgent to provide tool recommendation capabilities.
 */
export class ToolMemoryAgent extends BaseAgent {
  /**
   * Base system prompt that guides the Tool Memory Agent's behavior
   */
  private readonly baseSystemPrompt = `You are an advanced Tool Memory Agent - your job is to recommend the best tools for a given query based on:

1. **Past Successful Patterns**: Learn from similar queries and their tool usage
2. **Query Context**: Understand what the user is trying to accomplish
3. **Complexity Factors**: Consider query complexity to recommend appropriate tools
4. **Tool Capabilities**: Match tool features to query requirements

🚨 CRITICAL RULES - READ CAREFULLY:
- ONLY recommend tools/prompts that appear in the "Available MCP Tools" and "Available MCP Prompts" lists provided below
- DO NOT invent, create, or suggest tool names that don't exist in those lists
- DO NOT use variations, abbreviations, or alternative names - use EXACT tool names as shown
- If you mention a tool/prompt NOT in the provided lists, your recommendation will be REJECTED
- When in doubt, refer back to the exact tool/prompt names in the lists provided

When recommending tools:
- Prioritize tools based on relevance (0.0 to 1.0 priority score)
- Provide clear rationale for each recommendation
- Suggest tool chains when multiple tools work well together
- Reference similar successful patterns from memory
- Consider MCP prompts as workflow templates when appropriate
- ALWAYS verify the tool/prompt name matches EXACTLY (case-insensitive) with the provided lists

Output format:
RECOMMENDED_TOOLS:
1. [tool_name] (priority: X.XX)
   Rationale: [why this tool fits]
   Example: [similar query from memory if available]

2. [tool_name] (priority: X.XX)
   Rationale: [why this tool fits]
   Example: [similar query from memory if available]

TOOL_CHAINS:
1. [tool1] -> [tool2] -> [tool3]
   Rationale: [why this sequence works well]
   Success Rate: [if available from memory]

MCP_PROMPTS:
- [prompt_name]: [when to use this prompt]

Be specific and actionable. Prioritize tools that have been successful in similar contexts. REMEMBER: Only use tools/prompts from the provided lists.`

  constructor() {
    super('tool-memory-agent')
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

      const resources: any[] = []

      logger.debug(`[ToolMemoryAgent] Fetched MCP context`, {
        toolsCount: tools.length,
        promptsCount: prompts.length,
      })

      return {
        tools,
        resources,
        prompts,
      }
    } catch (error: any) {
      logger.error(`[ToolMemoryAgent] Failed to fetch MCP context:`, error)
      return { tools: [], resources: [], prompts: [] }
    }
  }

  /**
   * Fetch semantic context from Pinecone
   * 
   * Queries for similar tool usage patterns based on user query.
   * 
   * @param userQuery - User query to find similar examples for
   * @returns Array of similar tool usage examples with similarity scores
   */
  async fetchSemanticContext(
    userQuery: string
  ): Promise<
    Array<{
      query: string
      tools: string[]
      similarity: number
    }>
  > {
    try {
      const embedding = await generateEmbedding(userQuery)
      const results = await querySimilarToolUsage(embedding, 5, 0.5, 'usage-example')

      // Increment usage count for matched examples
      for (const result of results) {
        try {
          await incrementToolMemoryUsage(result.example.id)
        } catch (err) {
          logger.warn(
            `[ToolMemoryAgent] Failed to increment usage for example ${result.example.id}:`,
            err
          )
        }
      }

      const memoryMatches = results.map((r) => ({
        query: r.example.query,
        tools: r.example.tools,
        similarity: r.similarity,
      }))

      logger.debug(`[ToolMemoryAgent] Found similar tool usage patterns`, {
        count: memoryMatches.length,
        similarities: memoryMatches.map((m) => m.similarity.toFixed(2)),
      })

      return memoryMatches
    } catch (error: any) {
      logger.error(`[ToolMemoryAgent] Failed to fetch semantic context:`, error)
      return []
    }
  }

  /**
   * Build enhanced system prompt with context
   * 
   * @param mcpContext - MCP tools/resources/prompts
   * @param memoryMatches - Similar tool usage patterns from Pinecone
   * @returns Enhanced system prompt
   */
  private buildEnhancedSystemPrompt(
    mcpContext: MCPContext,
    memoryMatches: Array<{ query: string; tools: string[]; similarity: number }>
  ): string {
    let prompt = this.baseSystemPrompt + '\n\n'

    // Add MCP tools context
    if (mcpContext.tools.length > 0) {
      const categorized = this.categorizeTools(mcpContext.tools)

      prompt += '## Available MCP Tools\n\n'
      prompt += '⚠️ YOU MUST ONLY USE THESE TOOLS - DO NOT INVENT NEW ONES:\n\n'

      // First, list all tool names explicitly for reference
      const allToolNames = mcpContext.tools.map((t) => `- ${t.name}`).join('\n')
      prompt += `**Complete List of Valid Tools:**\n${allToolNames}\n\n`

      // Then show categorized details
      for (const [category, tools] of Object.entries(categorized)) {
        if (tools.length > 0) {
          prompt += `### ${category}\n`
          for (const tool of tools) {
            prompt += `- **${tool.name}**: ${tool.description}\n`

            // Add input schema if available
            if (tool.inputSchema?.properties) {
              const params = Object.entries(tool.inputSchema.properties)
                .map(([key, schema]: [string, any]) => {
                  const required = tool.inputSchema.required?.includes(key)
                    ? ' (required)'
                    : ''
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
    }

    // Add MCP prompts context
    if (mcpContext.prompts.length > 0) {
      prompt += '## Available MCP Workflow Templates\n\n'
      prompt += '⚠️ YOU MUST ONLY USE THESE PROMPTS - DO NOT INVENT NEW ONES:\n\n'
      
      // First, list all prompt names explicitly for reference
      const allPromptNames = mcpContext.prompts
        .map((p) => `- ${p.name}`)
        .join('\n')
      prompt += `**Complete List of Valid Prompts:**\n${allPromptNames}\n\n`

      // Then show details
      for (const mcpPrompt of mcpContext.prompts) {
        prompt += `- **${mcpPrompt.name}**: ${mcpPrompt.description}\n`
        if (mcpPrompt.arguments && mcpPrompt.arguments.length > 0) {
          const args = mcpPrompt.arguments
            .map(
              (a) =>
                `${a.name}${a.required ? ' (required)' : ''}: ${a.description}`
            )
            .join(', ')
          prompt += `  Arguments: ${args}\n`
        }
      }
      prompt += '\n'
    }

    // Add similar tool usage patterns from memory
    if (memoryMatches.length > 0) {
      prompt += '## Similar Successful Tool Usage Patterns\n\n'
      prompt += 'Learn from these proven patterns:\n\n'

      for (const match of memoryMatches) {
        prompt += `### Pattern (${(match.similarity * 100).toFixed(0)}% similar)\n`
        prompt += `Query: "${match.query}"\n`
        prompt += `Tools Used: ${match.tools.join(', ')}\n\n`
      }
    }

    prompt += '## Your Task\n\n'
    prompt +=
      'Based on the user query, complexity factors, and similar patterns above, recommend the best tools.\n'
    prompt +=
      'Prioritize tools that have been successful in similar contexts.\n'
    prompt += 'Provide clear rationale for each recommendation.\n'

    return prompt
  }

  /**
   * Validate tool/prompt name against actual MCP tools and prompts
   * 
   * @param toolName - Tool or prompt name to validate
   * @param mcpContext - MCP context with tools and prompts
   * @returns Valid tool/prompt name if found, null otherwise
   */
  private validateToolName(
    toolName: string,
    mcpContext: MCPContext
  ): string | null {
    if (!toolName || typeof toolName !== 'string') {
      return null
    }

    const lowerName = toolName.toLowerCase().trim()

    // Build lookup maps (case-insensitive)
    const toolMap = new Map(
      mcpContext.tools.map((t) => [t.name.toLowerCase(), t.name])
    )
    const promptMap = new Map(
      mcpContext.prompts.map((p) => [p.name.toLowerCase(), p.name])
    )

    // Check if tool exists
    if (toolMap.has(lowerName)) {
      return toolMap.get(lowerName)!
    }

    // Check if prompt exists
    if (promptMap.has(lowerName)) {
      return promptMap.get(lowerName)!
    }

    // Not found - this is a hallucination
    return null
  }

  /**
   * Categorize MCP tools by type
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

      if (
        name.includes('get') ||
        name.includes('list') ||
        name.includes('read')
      ) {
        categories['Data Retrieval'].push(tool)
      } else if (
        name.includes('generate') ||
        name.includes('analyze') ||
        name.includes('suggest') ||
        name.includes('intelligent')
      ) {
        categories['Analysis & Intelligence'].push(tool)
      } else if (
        name.includes('create') ||
        name.includes('update') ||
        name.includes('delete')
      ) {
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
   * Recommend tools for a user query
   * 
   * Main method that generates tool recommendations based on:
   * - User query and complexity score
   * - Similar past tool usage from Pinecone
   * - Available MCP tools and prompts
   * 
   * @param userQuery - User's query
   * @param requestContext - Request ID context
   * @param complexityScore - Complexity score and factors from Complexity Detector
   * @param mcpContext - Optional MCP context (will be fetched if not provided)
   * @returns ToolMemoryOutput with recommendations
   */
  async recommendTools(
    userQuery: string,
    requestContext: RequestContext,
    complexityScore?: ComplexityScore,
    mcpContext?: MCPContext
  ): Promise<ToolMemoryOutput> {
    // Step 1: Add this agent to the request chain
    const updatedContext = this.addToChain(requestContext)

    // Step 2: Fetch context if not provided
    const contextToUse = mcpContext || (await this.fetchMCPContext())
    const memoryMatches = await this.fetchSemanticContext(userQuery)

    // Step 3: Build enhanced system prompt
    const enhancedSystemPrompt = this.buildEnhancedSystemPrompt(
      contextToUse,
      memoryMatches
    )

    // Step 4: Build the prompt for the LLM
    let prompt = `User Query: ${userQuery}\n\n`

    if (complexityScore) {
      prompt += `Complexity Score: ${(complexityScore.score * 100).toFixed(0)}%\n`
      prompt += `Reasoning Passes: ${complexityScore.reasoningPasses}\n`
      if (complexityScore.factors) {
        prompt += `Complexity Factors:\n`
        if (complexityScore.factors.involvesAnalysis)
          prompt += `- Requires analysis\n`
        if (complexityScore.factors.needsDataAggregation)
          prompt += `- Needs data aggregation\n`
        if (complexityScore.factors.requiresMultiStep)
          prompt += `- Requires multi-step execution\n`
      }
      prompt += '\n'
    }

    prompt +=
      'Based on the context above, recommend the best tools for this query.\n'
    prompt += 'Consider the complexity factors and similar successful patterns.'

    // Step 5: Call LLM with enhanced context
    const messages = [
      { role: 'system' as const, content: enhancedSystemPrompt },
      { role: 'user' as const, content: prompt },
    ]

    logger.debug(`[ToolMemoryAgent] Generating tool recommendations`, {
      requestId: updatedContext.requestId,
      queryLength: userQuery.length,
      hasComplexityScore: !!complexityScore,
      toolsCount: contextToUse.tools.length,
      memoryMatchesCount: memoryMatches.length,
    })

    const response = await this.callLLM(messages, {
      temperature: 0.7, // Balanced creativity and focus
      maxTokens: 2000,
    })

    // Step 6: Parse the structured response
    const recommendations = this.parseToolRecommendations(response, contextToUse)
    const toolChains = this.parseToolChains(response, contextToUse)

    // Step 7: Build output with Request ID
    const output: ToolMemoryOutput = {
      // Agent output base
      requestId: updatedContext.requestId,
      agentName: 'tool-memory-agent',
      timestamp: new Date(),
      requestContext: updatedContext,

      // Tool memory-specific output
      recommendedTools: recommendations,
      toolChains,
      memoryMatches,
    }

    logger.info(`[ToolMemoryAgent] Generated tool recommendations`, {
      requestId: output.requestId,
      toolsRecommended: recommendations.length,
      toolChainsCount: toolChains.length,
      memoryMatchesCount: memoryMatches.length,
    })

    return output
  }

  /**
   * Parse tool recommendations from LLM response
   * 
   * Extracts recommended tools with priorities and rationale.
   * 
   * @param response - LLM response text
   * @param mcpContext - MCP context for validation
   * @returns Array of tool recommendations
   */
  private parseToolRecommendations(
    response: string,
    mcpContext: MCPContext
  ): ToolRecommendation[] {
    const recommendations: ToolRecommendation[] = []

    // Extract RECOMMENDED_TOOLS section
    const toolsSection = this.extractSection(response, 'RECOMMENDED_TOOLS')
    if (!toolsSection) {
      logger.warn(`[ToolMemoryAgent] No RECOMMENDED_TOOLS section found`)
      return recommendations
    }

    // Build lookup maps (case-insensitive)
    const toolMap = new Map(
      mcpContext.tools.map((t) => [t.name.toLowerCase(), t.name])
    )
    const promptMap = new Map(
      mcpContext.prompts.map((p) => [p.name.toLowerCase(), p.name])
    )

    // Parse numbered list items (1. tool_name (priority: X.XX))
    const itemPattern =
      /(\d+)\.\s+([^\n]+?)\s*\(priority:\s*([\d.]+)\)\s*\n\s*Rationale:\s*([^\n]+)(?:\n\s*Example:\s*([^\n]+))?/gi
    let match

    while ((match = itemPattern.exec(toolsSection)) !== null) {
      const toolNameOrPrompt = match[2].trim()
      const priority = parseFloat(match[3])
      const rationale = match[4].trim()
      const example = match[5] ? match[5].trim() : undefined

      // Strict validation - only accept tools that exist
      const validatedName = this.validateToolName(toolNameOrPrompt, mcpContext)

      if (!validatedName) {
        // Hallucination detected - log and skip
        logger.warn(`[ToolMemoryAgent] Hallucinated tool detected and filtered: "${toolNameOrPrompt}"`, {
          suggestedTool: toolNameOrPrompt,
          availableTools: mcpContext.tools.map((t) => t.name),
          availablePrompts: mcpContext.prompts.map((p) => p.name),
        })
        continue
      }

      recommendations.push({
        toolName: validatedName,
        priority: Math.max(0, Math.min(1, priority)), // Clamp to 0-1
        rationale,
        exampleUsage: example,
      })
    }

    // If no matches, try simpler extraction (but still validate strictly)
    if (recommendations.length === 0) {
      const lines = toolsSection.split('\n').filter((l) => l.trim())
      for (const line of lines) {
        const words = line
          .toLowerCase()
          .match(/\b[a-z][a-z0-9_-]*[a-z0-9]\b/g) || []
        for (const word of words) {
          const validatedName = this.validateToolName(word, mcpContext)
          if (validatedName) {
            recommendations.push({
              toolName: validatedName,
              priority: 0.7,
              rationale: `Mentioned in recommendations`,
            })
          }
        }
      }
    }

    // Final validation pass - remove any that somehow slipped through
    const validatedRecommendations = recommendations.filter((rec) => {
      const isValid = this.validateToolName(rec.toolName, mcpContext)
      if (!isValid) {
        logger.warn(
          `[ToolMemoryAgent] Invalid tool filtered in final pass: "${rec.toolName}"`
        )
      }
      return isValid !== null
    })

    if (recommendations.length !== validatedRecommendations.length) {
      const filteredCount =
        recommendations.length - validatedRecommendations.length
      logger.warn(
        `[ToolMemoryAgent] Filtered out ${filteredCount} hallucinated tool(s)`
      )
    }

    // Remove duplicates
    const seen = new Set<string>()
    return validatedRecommendations.filter((r) => {
      if (seen.has(r.toolName)) return false
      seen.add(r.toolName)
      return true
    })
  }

  /**
   * Parse tool chains from LLM response
   * 
   * @param response - LLM response text
   * @param mcpContext - MCP context for validation
   * @returns Array of tool chains
   */
  private parseToolChains(
    response: string,
    mcpContext: MCPContext
  ): ToolChain[] {
    const chains: ToolChain[] = []

    const chainsSection = this.extractSection(response, 'TOOL_CHAINS')
    if (!chainsSection) {
      return chains
    }

    const toolMap = new Map(
      mcpContext.tools.map((t) => [t.name.toLowerCase(), t.name])
    )

    // Parse chain format: 1. tool1 -> tool2 -> tool3
    const chainPattern =
      /(\d+)\.\s+([^\n]+?)\n\s*Rationale:\s*([^\n]+)(?:\n\s*Success Rate:\s*([\d.]+))?/gi
    let match

    while ((match = chainPattern.exec(chainsSection)) !== null) {
      const sequenceStr = match[2].trim()
      const rationale = match[3].trim()
      const successRate = match[4] ? parseFloat(match[4]) : undefined

      // Parse tool sequence (tool1 -> tool2 -> tool3)
      // Strictly validate each tool
      const validatedTools: string[] = []
      const toolNames = sequenceStr.split('->').map((t) => t.trim()).filter(Boolean)

      for (const toolName of toolNames) {
        const validated = this.validateToolName(toolName, mcpContext)
        if (validated) {
          validatedTools.push(validated)
        } else {
          logger.warn(
            `[ToolMemoryAgent] Hallucinated tool in chain filtered: "${toolName}"`,
            {
              chain: sequenceStr,
              suggestedTool: toolName,
            }
          )
        }
      }

      // Only add chain if all tools are valid AND we have at least 2 tools
      if (validatedTools.length > 1) {
        chains.push({
          sequence: validatedTools,
          rationale,
          successRate,
        })
      } else if (toolNames.length > 0 && validatedTools.length < toolNames.length) {
        // Some tools were invalid - log warning
        logger.warn(
          `[ToolMemoryAgent] Tool chain rejected due to invalid tools`,
          {
            originalChain: sequenceStr,
            validatedTools,
            invalidTools: toolNames.filter(
              (t) => !this.validateToolName(t, mcpContext)
            ),
          }
        )
      }
    }

    return chains
  }
}


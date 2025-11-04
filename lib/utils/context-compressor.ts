/**
 * Context Compression Utility
 * 
 * Provides compression methods for reducing token count in LLM prompts by:
 * - Limiting number of tools, examples, recommendations
 * - Truncating descriptions and schemas
 * - Keeping only essential information
 */

import { MCPContext, PlanExample, ToolMemoryOutput } from '@/types'
import { Message, estimateTokenCount, countTokensInMessages } from './token-counter'

// Define MCPTool type locally since it's not exported from types
interface MCPTool {
  name: string
  description: string
  inputSchema?: {
    properties?: Record<string, any>
    required?: string[]
  }
}

export interface CompressionConfig {
  maxTools?: number
  maxExamples?: number
  maxRecommendations?: number
  truncateDescriptions?: boolean
  maxDescriptionLength?: number
  keepOnlyRequiredParams?: boolean
}

export interface CompressionResult {
  messages: Message[]
  originalTokenCount: number
  compressedTokenCount: number
  compressionRatio: number
  actions: string[]
}

/**
 * Context Compressor Class
 * 
 * Provides methods to compress various types of context to reduce token usage.
 */
export class ContextCompressor {
  private defaultConfig: CompressionConfig = {
    maxTools: 15,  // Increased from 10 to preserve more tools
    maxExamples: 4,  // Increased from 2 to preserve more learning examples
    maxRecommendations: 5,
    truncateDescriptions: true,
    maxDescriptionLength: 250,  // Increased from 150 to preserve more context
    keepOnlyRequiredParams: false,  // Changed to false - keep important optional params
  }

  /**
   * Compress MCP tools by limiting count and truncating descriptions/schemas
   */
  compressMCPTools(
    tools: Array<{ name: string; description: string; inputSchema?: any }>,
    config: CompressionConfig = {}
  ): { tools: Array<{ name: string; description: string; inputSchema?: any }>; actions: string[] } {
    const finalConfig = { ...this.defaultConfig, ...config }
    const actions: string[] = []
    const originalCount = tools.length

    // Limit number of tools
    let compressedTools = tools
    if (finalConfig.maxTools && tools.length > finalConfig.maxTools) {
      compressedTools = tools.slice(0, finalConfig.maxTools)
      actions.push(`Limited tools from ${originalCount} to ${finalConfig.maxTools}`)
    }

    // Compress each tool
    compressedTools = compressedTools.map(tool => {
      const compressed: { name: string; description: string; inputSchema?: any } = { ...tool }

      // Truncate description - preserve first sentence and key details
      if (finalConfig.truncateDescriptions && tool.description) {
        const maxLen = finalConfig.maxDescriptionLength || 250
        if (tool.description.length > maxLen) {
          // Try to preserve first sentence if it's informative
          const firstSentenceEnd = tool.description.indexOf('.')
          const firstSentence = firstSentenceEnd > 0 && firstSentenceEnd < maxLen * 0.6
            ? tool.description.substring(0, firstSentenceEnd + 1)
            : null
          
          if (firstSentence) {
            // Keep first sentence + truncate remainder
            const remaining = maxLen - firstSentence.length - 10 // 10 for "..."
            const truncated = tool.description.substring(
              firstSentence.length,
              firstSentence.length + remaining
            )
            compressed.description = firstSentence + ' ' + truncated + '...'
          } else {
            compressed.description = tool.description.substring(0, maxLen) + '...'
          }
        }
      }

      // Compress input schema - keep required params + important optional params
      if (tool.inputSchema?.properties) {
        const requiredParams = tool.inputSchema.required || []
        const allParams = Object.keys(tool.inputSchema.properties)
        
        // Identify important optional parameters (filters, search params, etc.)
        const importantOptionalParamPatterns = [
          /filter/i, /search/i, /query/i, /level/i, /status/i, /type/i,
          /id/i, /code/i, /name/i, /location/i, /date/i, /time/i,
          /explosive/i, /hcl/i, /so2/i  // Contaminant-specific filters
        ]
        
        const importantOptionalParams = allParams.filter(paramName => {
          if (requiredParams.includes(paramName)) return false
          return importantOptionalParamPatterns.some(pattern => pattern.test(paramName))
        })
        
        // Determine if we should compress schemas
        // Only compress if explicitly requested AND there are many parameters
        // But always preserve important optional params even when compressing
        const shouldCompress = finalConfig.keepOnlyRequiredParams === true && allParams.length > 8
        
        if (shouldCompress) {
          const compressedSchema: any = {
            ...tool.inputSchema,
            properties: {},
          }

          // Always keep required parameters
          for (const paramName of requiredParams) {
            if (tool.inputSchema.properties[paramName]) {
              compressedSchema.properties[paramName] = tool.inputSchema.properties[paramName]
            }
          }

          // Keep important optional parameters (filters, search, etc.)
          for (const paramName of importantOptionalParams) {
            if (tool.inputSchema.properties[paramName]) {
              compressedSchema.properties[paramName] = tool.inputSchema.properties[paramName]
            }
          }

          // If still not enough, keep first few remaining optional params
          if (Object.keys(compressedSchema.properties).length < 6) {
            const remainingParams = allParams.filter(
              p => !requiredParams.includes(p) && !importantOptionalParams.includes(p)
            )
            for (const paramName of remainingParams.slice(0, 6 - Object.keys(compressedSchema.properties).length)) {
              if (tool.inputSchema.properties[paramName]) {
                compressedSchema.properties[paramName] = tool.inputSchema.properties[paramName]
              }
            }
          }

          compressed.inputSchema = compressedSchema
          if (Object.keys(tool.inputSchema.properties).length > Object.keys(compressedSchema.properties).length) {
            actions.push(`Compressed schema for ${tool.name}: kept ${Object.keys(compressedSchema.properties).length} of ${Object.keys(tool.inputSchema.properties).length} params (required: ${requiredParams.length}, important optional: ${importantOptionalParams.length})`)
          }
        } else {
          // Don't compress - keep all parameters
          compressed.inputSchema = tool.inputSchema
        }
      }

      return compressed
    })

    return { tools: compressedTools, actions }
  }

  /**
   * Compress similar examples by limiting count
   */
  compressSimilarExamples(
    examples: Array<{ example: PlanExample; similarity: number }>,
    config: CompressionConfig = {}
  ): { examples: Array<{ example: PlanExample; similarity: number }>; actions: string[] } {
    const finalConfig = { ...this.defaultConfig, ...config }
    const actions: string[] = []
    const originalCount = examples.length

    // Sort by similarity (highest first) and limit
    const sorted = [...examples].sort((a, b) => b.similarity - a.similarity)
    const maxExamples = finalConfig.maxExamples || 2
    const compressed = sorted.slice(0, maxExamples)

    if (originalCount > maxExamples) {
      actions.push(`Limited examples from ${originalCount} to ${maxExamples} (kept highest similarity)`)
    }

    return { examples: compressed, actions }
  }

  /**
   * Compress tool recommendations by limiting count
   */
  compressToolRecommendations(
    recommendations: ToolMemoryOutput | undefined,
    config: CompressionConfig = {}
  ): { recommendations: ToolMemoryOutput | undefined; actions: string[] } {
    const finalConfig = { ...this.defaultConfig, ...config }
    const actions: string[] = []

    if (!recommendations) {
      return { recommendations: undefined, actions }
    }

    const compressed = { ...recommendations }

    // Limit recommended tools
    if (compressed.recommendedTools && finalConfig.maxRecommendations) {
      const originalCount = compressed.recommendedTools.length
      if (originalCount > finalConfig.maxRecommendations) {
        // Sort by priority and take top N
        compressed.recommendedTools = [...compressed.recommendedTools]
          .sort((a, b) => b.priority - a.priority)
          .slice(0, finalConfig.maxRecommendations)
        actions.push(`Limited tool recommendations from ${originalCount} to ${finalConfig.maxRecommendations}`)
      }
    }

    // Limit tool chains
    if (compressed.toolChains && finalConfig.maxRecommendations) {
      const originalCount = compressed.toolChains.length
      if (originalCount > finalConfig.maxRecommendations) {
        compressed.toolChains = compressed.toolChains.slice(0, finalConfig.maxRecommendations)
        actions.push(`Limited tool chains from ${originalCount} to ${finalConfig.maxRecommendations}`)
      }
    }

    return { recommendations: compressed, actions }
  }

  /**
   * Compress system prompt by truncating if too long
   * Uses iterative approach to get closer to target
   */
  compressSystemPrompt(
    prompt: string,
    maxTokens: number,
    config: CompressionConfig = {}
  ): { prompt: string; actions: string[] } {
    const actions: string[] = []
    let currentTokens = estimateTokenCount(prompt)

    if (currentTokens <= maxTokens) {
      return { prompt, actions }
    }

    // More aggressive compression: target 75% of maxTokens to leave buffer
    // For strict limits (Groq), target even lower (70%)
    const isStrictLimit = maxTokens <= 6000
    const targetRatio = isStrictLimit ? 0.70 : 0.75
    const targetTokens = Math.floor(maxTokens * targetRatio)
    
    // Estimate characters per token (~4 chars per token is conservative)
    // Use a more aggressive ratio for safety (3.2 chars/token for strict limits)
    const charsPerToken = isStrictLimit ? 3.2 : 3.5
    let maxChars = Math.floor((targetTokens * charsPerToken) * 0.95) // 95% safety
    
    // Iteratively adjust if still too large
    let truncated = prompt.substring(0, maxChars)
    let newTokens = estimateTokenCount(truncated)
    
    // If still over limit, reduce more aggressively
    let iterations = 0
    while (newTokens > targetTokens && iterations < 5) {
      const ratio = targetTokens / newTokens
      maxChars = Math.floor(maxChars * ratio * 0.9) // 90% of calculated ratio for safety
      truncated = prompt.substring(0, maxChars)
      newTokens = estimateTokenCount(truncated)
      iterations++
    }
    
    truncated += '\n\n[Context truncated due to token limit]'
    newTokens = estimateTokenCount(truncated)
    
    actions.push(`Truncated system prompt from ${currentTokens} to ${newTokens} tokens (target: ${targetTokens}, iterations: ${iterations})`)

    return { prompt: truncated, actions }
  }

  /**
   * Compress messages array to fit within token limit
   * 
   * This is the main compression orchestrator that applies all compression strategies.
   */
  compressMessages(
    messages: Message[],
    maxTokens: number,
    forceCompression: boolean,
    config: CompressionConfig = {}
  ): CompressionResult {
    const originalTokenCount = countTokensInMessages(messages)
    const actions: string[] = []

    // Check if compression is needed
    if (originalTokenCount <= maxTokens && !forceCompression) {
      return {
        messages,
        originalTokenCount,
        compressedTokenCount: originalTokenCount,
        compressionRatio: 1.0,
        actions: ['No compression needed']
      }
    }

    const compressedMessages: Message[] = []
    const finalConfig = { ...this.defaultConfig, ...config }

    // Compress each message
    // For Groq (maxTokens <= 10000), be more aggressive - use 55% for system
    // For others, use 70%
    const isStrictLimit = maxTokens <= 10000
    const systemPromptRatio = isStrictLimit ? 0.55 : 0.7
    
    for (const message of messages) {
      if (message.role === 'system') {
        // Compress system prompt - more aggressive for strict limits
        const systemPromptLimit = Math.floor(maxTokens * systemPromptRatio)
        const { prompt, actions: promptActions } = this.compressSystemPrompt(
          message.content,
          systemPromptLimit,
          finalConfig
        )
        compressedMessages.push({ ...message, content: prompt })
        actions.push(...promptActions)
      } else {
        // For user/assistant messages, compress if still too large
        const userMessageTokens = estimateTokenCount(message.content)
        const remainingLimit = maxTokens - countTokensInMessages(compressedMessages)
        
        if (userMessageTokens > remainingLimit && remainingLimit > 0) {
          // Truncate user message if needed - be aggressive
          const targetUserTokens = Math.floor(remainingLimit * 0.9) // 90% of remaining
          const maxChars = Math.floor((targetUserTokens * 3.5) * 0.9)
          const truncated = message.content.substring(0, maxChars) + '... [truncated]'
          compressedMessages.push({ ...message, content: truncated })
          actions.push(`Truncated ${message.role} message from ${userMessageTokens} to ${estimateTokenCount(truncated)} tokens`)
        } else {
          compressedMessages.push(message)
        }
      }
    }

    const compressedTokenCount = countTokensInMessages(compressedMessages)
    const compressionRatio = originalTokenCount > 0 
      ? compressedTokenCount / originalTokenCount 
      : 1.0

    return {
      messages: compressedMessages,
      originalTokenCount,
      compressedTokenCount,
      compressionRatio,
      actions
    }
  }

  /**
   * Compress MCP context for use in prompts
   * 
   * This is a helper that compresses the full MCP context object.
   */
  compressMCPContext(
    mcpContext: MCPContext,
    config: CompressionConfig = {}
  ): { context: MCPContext; actions: string[] } {
    const allActions: string[] = []
    const finalConfig = { ...this.defaultConfig, ...config }

    // Compress tools
    const { tools, actions: toolActions } = this.compressMCPTools(mcpContext.tools, finalConfig)
    allActions.push(...toolActions)

    // Ensure all tools have inputSchema (required by MCPTool interface)
    const toolsWithSchema = tools.map(tool => ({
      ...tool,
      inputSchema: tool.inputSchema || {}
    }))

    // Prompts are usually shorter, keep them all but truncate descriptions if needed
    const prompts = mcpContext.prompts.map(prompt => {
      if (finalConfig.truncateDescriptions && prompt.description) {
        const maxLen = finalConfig.maxDescriptionLength || 250
        if (prompt.description.length > maxLen) {
          // Try to preserve first sentence
          const firstSentenceEnd = prompt.description.indexOf('.')
          const firstSentence = firstSentenceEnd > 0 && firstSentenceEnd < maxLen * 0.6
            ? prompt.description.substring(0, firstSentenceEnd + 1)
            : null
          
          if (firstSentence) {
            const remaining = maxLen - firstSentence.length - 10
            const truncated = prompt.description.substring(
              firstSentence.length,
              firstSentence.length + remaining
            )
            return {
              ...prompt,
              description: firstSentence + ' ' + truncated + '...'
            }
          } else {
            return {
              ...prompt,
              description: prompt.description.substring(0, maxLen) + '...'
            }
          }
        }
      }
      return prompt
    })

    // Resources are usually short, keep them all
    const resources = mcpContext.resources

    return {
      context: {
        tools: toolsWithSchema,
        prompts,
        resources
      },
      actions: allActions
    }
  }
}

// Export singleton instance
export const contextCompressor = new ContextCompressor()


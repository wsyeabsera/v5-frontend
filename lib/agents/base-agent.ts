/**
 * Base Agent Class
 * 
 * Foundation for all reasoning agents. Provides:
 * - LLM calling utilities (handles streaming responses)
 * - Response parsing helpers
 * - Error handling
 * - Agent configuration resolution
 */

import { AgentConfig, RequestContext } from '@/types'
import { getAgentConfigStorage } from '@/lib/storage/agent-config-storage'
import { resolveApiConfig, ApiConfig } from '@/lib/services/api-config-resolver'
import { addAgentToChain } from '@/lib/utils/request-id'
import { logger } from '@/utils/logger'

const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:3002/stream'

export abstract class BaseAgent {
  protected agentId: string
  protected agentConfig: AgentConfig | null = null
  protected apiConfig: ApiConfig | null = null

  constructor(agentId: string) {
    this.agentId = agentId
  }

  /**
   * Initialize agent - loads config from MongoDB and resolves API config
   * Must be called before using the agent
   */
  async initialize(headers?: Headers): Promise<void> {
    const storage = getAgentConfigStorage()
    this.agentConfig = await storage.getAgentConfig(this.agentId)
    
    if (!this.agentConfig || !this.agentConfig.enabled) {
      throw new Error(`Agent '${this.agentId}' not found or disabled`)
    }

    // Check if model is configured
    if (!this.agentConfig.modelId) {
      throw new Error(
        `Agent '${this.agentId}' is not configured. Please select a model in Settings > Agent Configurations.`
      )
    }

    this.apiConfig = await resolveApiConfig(this.agentConfig, headers || new Headers())
    
    if (!this.apiConfig) {
      throw new Error(
        `Failed to resolve API config for agent '${this.agentId}'. Please check your API keys in Settings.`
      )
    }

    logger.info(`[BaseAgent] Initialized agent '${this.agentId}'`, {
      modelId: this.apiConfig.modelId,
      hasParams: !!(this.apiConfig.temperature || this.apiConfig.maxTokens)
    })
  }

  /**
   * Call LLM with messages - handles streaming response
   * 
   * @param messages - Array of system/user/assistant messages
   * @param options - Override temperature, maxTokens, etc.
   * @returns Complete LLM response as string
   */
  protected async callLLM(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      temperature?: number
      maxTokens?: number
      topP?: number
    } = {}
  ): Promise<string> {
    if (!this.apiConfig) {
      throw new Error('Agent not initialized - call initialize() first')
    }

    // Use actualModelName if available (resolved by api-config-resolver), otherwise fall back to modelId
    // This ensures the AI server gets the correct model identifier
    const modelIdToSend = this.apiConfig.actualModelName || this.apiConfig.modelId

    logger.debug(`[BaseAgent] Calling LLM for agent '${this.agentId}'`, {
      modelId: modelIdToSend,
      originalModelId: this.apiConfig.modelId,
      messageCount: messages.length
    })

    // Get provider for the model to help AI server identify it correctly
    const { getProviderForModel } = await import('@/lib/ai-config')
    const provider = getProviderForModel(this.apiConfig.modelId)

    const response = await fetch(AI_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        modelId: modelIdToSend,
        provider: provider, // Include provider to help AI server resolve the model
        apiKey: this.apiConfig.apiKey,
        systemPrompt: messages.find(m => m.role === 'system')?.content,
        temperature: options.temperature ?? this.apiConfig.temperature,
        maxTokens: options.maxTokens ?? this.apiConfig.maxTokens,
        topP: options.topP ?? this.apiConfig.topP,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`LLM call failed: ${response.status} - ${errorText}`)
    }

    // Read streaming response
    const fullText = await this.readStreamResponse(response)
    
    logger.debug(`[BaseAgent] LLM response received`, {
      agentId: this.agentId,
      responseLength: fullText.length
    })

    return fullText.trim()
  }

  /**
   * Read streaming response from AI server
   * Parses SSE format and accumulates the full response text
   */
  private async readStreamResponse(response: Response): Promise<string> {
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Response body is not readable')
    }

    const decoder = new TextDecoder()
    let fullText = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })
      }
      // Decode any remaining text
      if (fullText) {
        fullText += decoder.decode()
      }
    } finally {
      reader.releaseLock()
    }

    // Parse SSE format: extract text chunks from "0:\"text\"" format
    const lines = fullText.split('\n')
    const textParts: string[] = []
    
    for (const line of lines) {
      // Match "0:"text content" or "[index]:"text content""
      const match = line.match(/^\d+:"(.+)"$/)
      if (match) {
        // Unescape literal escape sequences (\n, \t, etc.)
        const unescaped = match[1]
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\r/g, '\r')
          .replace(/\\\\/g, '\\')
        textParts.push(unescaped)
      }
    }

    // Return concatenated text or original if no matches found
    return textParts.length > 0 ? textParts.join('') : fullText.trim()
  }

  /**
   * Extract a section from LLM response
   * 
   * LLM responses often have structured sections like "REASONING: ..."
   * This helper extracts those sections.
   * 
   * @param text - Full response text
   * @param section - Section name (e.g., "REASONING")
   * @returns Section content or null if not found
   */
  protected extractSection(text: string, section: string): string | null {
    const regex = new RegExp(`${section}:\\s*([\\s\\S]*?)(?:\\n\\n[A-Z_]+:|$)`, 'i')
    const match = text.match(regex)
    return match ? match[1].trim() : null
  }

  /**
   * Extract list items from a section
   * 
   * Handles numbered lists, bullet lists, or dash-separated items.
   * 
   * @param text - Section text containing list
   * @param section - Optional section name to extract first
   * @returns Array of list items
   */
  protected extractList(text: string, section?: string): string[] {
    const content = section ? this.extractSection(text, section) : text
    if (!content) return []

    // Match numbered lists (1. 2. 3.) or bullet points (- * •)
    const numberedPattern = /(?:^|\n)(\d+\.\s+[^\n]+(?:\n(?!\d+\.\s+)[^\n]+)*)/g
    const bulletPattern = /(?:^|\n)([-*•]\s+[^\n]+(?:\n(?![-*•]\s+)[^\n]+)*)/g
    
    let items: string[] = []
    
    // Try numbered list first
    const numberedMatches = Array.from(content.matchAll(numberedPattern))
    if (numberedMatches.length > 0) {
      items = numberedMatches.map(m => 
        m[1].replace(/^\d+\.\s*/, '').trim()
      )
    } else {
      // Try bullet points
      const bulletMatches = Array.from(content.matchAll(bulletPattern))
      if (bulletMatches.length > 0) {
        items = bulletMatches.map(m => 
          m[1].replace(/^[-*•]\s*/, '').trim()
        )
      } else {
        // Fallback to line-by-line
        items = content
          .split(/\n/)
          .map(line => line.replace(/^\d+\.\s*|^-\s*|^\*\s*/, '').trim())
          .filter(Boolean)
      }
    }

    return items
  }

  /**
   * Add this agent to the request chain
   */
  protected addToChain(requestContext: RequestContext): RequestContext {
    return addAgentToChain(requestContext, this.agentId)
  }

  /**
   * Get agent configuration
   */
  protected getConfig(): AgentConfig {
    if (!this.agentConfig) {
      throw new Error('Agent not initialized')
    }
    return this.agentConfig
  }

  /**
   * Get API configuration
   */
  protected getApiConfig(): ApiConfig {
    if (!this.apiConfig) {
      throw new Error('Agent not initialized')
    }
    return this.apiConfig
  }
}


/**
 * API Config Resolver Service
 * 
 * Centralized service for resolving API keys/URLs from:
 * 1. Environment variables (priority 1)
 * 2. Request headers (priority 2)
 * 3. Default values (priority 3)
 * 
 * Supports all providers: Anthropic, OpenAI, Google, Groq, Ollama
 */

import { AgentConfig, AgentParameters } from '@/types'
import { getProviderForModel, getModelConfig, Provider } from '@/lib/ai-config'
import { logger } from '@/utils/logger'

/**
 * API Configuration for LLM calls
 */
export interface ApiConfig {
  modelId: string
  apiKey: string // For API-based providers, this is the API key. For Ollama, this is the URL.
  temperature?: number
  maxTokens?: number
  topP?: number
  actualModelName?: string // Resolved model name (e.g., "ollama-mistral" -> "mistral:latest")
}

/**
 * Resolve API configuration from agent config and request headers
 * 
 * @param agentConfig - Agent configuration from MongoDB
 * @param headers - Request headers (for fallback API keys)
 * @returns Resolved API config or null if not available
 */
export async function resolveApiConfig(
  agentConfig: AgentConfig | null,
  headers?: Headers
): Promise<ApiConfig | null> {
  if (!agentConfig || !agentConfig.enabled || !agentConfig.modelId) {
    logger.debug('No agent config, disabled agent, or missing modelId')
    return null
  }

  const provider = getProviderForModel(agentConfig.modelId)
  const modelConfig = getModelConfig(agentConfig.modelId)
  
  // Get the actual model name (e.g., "ollama-mistral" -> "mistral:latest")
  const actualModelName = modelConfig?.model || agentConfig.modelId

  // Resolve API key/URL based on provider
  // Priority: agentConfig.apiKey -> env vars -> headers
  const apiKey = resolveProviderKey(provider, agentConfig.apiKey, headers || new Headers())
  
  if (!apiKey) {
    logger.warn(`Agent config '${agentConfig.agentId}' found but no API key/URL available for provider '${provider}'`, {
      agentId: agentConfig.agentId,
      modelId: agentConfig.modelId,
      provider
    })
    return null
  }

  const apiConfig: ApiConfig = {
    modelId: agentConfig.modelId,
    apiKey: apiKey,
    temperature: agentConfig.parameters?.temperature,
    maxTokens: agentConfig.parameters?.maxTokens,
    topP: agentConfig.parameters?.topP,
    actualModelName: actualModelName,
  }

  logger.info(`Resolved API config for agent '${agentConfig.agentId}'`, {
    modelId: agentConfig.modelId,
    provider,
    actualModelName,
    hasParams: !!(apiConfig.temperature || apiConfig.maxTokens || apiConfig.topP)
  })

  return apiConfig
}

/**
 * Resolve API key or URL for a specific provider
 * 
 * Priority:
 * 1. Agent config API key (from MongoDB)
 * 2. Environment variables
 * 3. Request headers (x-api-key)
 * 4. Default values (for Ollama only)
 * 
 * @param provider - AI provider
 * @param configApiKey - Optional API key from agent config
 * @param headers - Request headers
 * @returns API key/URL or null if not available
 */
export function resolveProviderKey(
  provider: Provider,
  configApiKey: string | undefined,
  headers: Headers
): string | null {
  let apiKey: string | null = null
  let keySource = 'none'

  // Priority 1: Use API key from agent config if available
  if (configApiKey) {
    apiKey = configApiKey
    keySource = 'config'
    logger.debug(`Using API key from agent config for '${provider}'`)
    return apiKey
  }

  if (provider === 'ollama') {
    // Ollama uses URL, not API key
    // Priority: env vars -> header -> default
    apiKey = process.env.OLLAMA_URL || process.env.NEXT_PUBLIC_OLLAMA_URL || null
    if (apiKey) {
      keySource = 'env'
    } else {
      apiKey = headers.get('x-api-key')
      if (apiKey) {
        keySource = 'header'
      } else {
        // Default for Ollama
        apiKey = 'http://localhost:11434'
        keySource = 'default'
      }
    }
    logger.debug(`Resolved Ollama URL`, { source: keySource, url: apiKey?.substring(0, 30) + '...' })
  } else {
    // API-based providers: Anthropic, OpenAI, Google, Groq
    // Priority: env vars -> header
    
    // Check environment variables based on provider
    if (provider === 'groq') {
      // Also check ANTHROPIC_API_KEY as some users might store Groq keys there
      apiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || 
               process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || null
    } else if (provider === 'anthropic') {
      apiKey = process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || null
    } else if (provider === 'openai') {
      apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY || null
    } else if (provider === 'google') {
      apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY || null
    }

    if (apiKey) {
      keySource = 'env'
    } else {
      // Fall back to header if env var not found
      apiKey = headers.get('x-api-key')
      if (apiKey) {
        keySource = 'header'
      }
    }

    logger.debug(`Resolved API key for provider '${provider}'`, { source: keySource })
  }

  return apiKey
}


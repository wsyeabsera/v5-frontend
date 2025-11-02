/**
 * Agent Configuration Storage using MongoDB
 * 
 * Stores AI configurations for each agent (complexity detector, etc.)
 */

import { getCollection } from './mongodb-client'
import { AgentConfig } from '@/types'
import { getProviderForModel } from '@/lib/ai-config'
import type { ApiConfig } from '@/lib/ollama/complexity-analyzer'

const COLLECTION_NAME = 'agent_configs'

/**
 * Default agent configurations
 */
const DEFAULT_AGENT_CONFIGS: AgentConfig[] = [
  {
    agentId: 'complexity-detector',
    name: 'Complexity Detector',
    description: 'Analyzes query complexity using semantic matching and LLM reasoning',
    modelId: '', // Empty until user configures
    parameters: {
      temperature: 0.3,
      maxTokens: 500,
      topP: 0.9,
    },
    enabled: true,
  },
  {
    agentId: 'base-agent',
    name: 'Base Agent',
    description: 'Shared utilities for LLM calls and response parsing',
    modelId: '', // Empty until user configures
    parameters: {
      temperature: 0.7,
      maxTokens: 1500,
      topP: 0.9,
    },
    enabled: true,
  },
]

/**
 * Ensure indexes for agent configs collection
 */
async function ensureIndexes(): Promise<void> {
  try {
    const collection = await getCollection(COLLECTION_NAME)
    
    // Create indexes
    await collection.createIndex({ agentId: 1 }, { unique: true })
    await collection.createIndex({ enabled: 1 })
    await collection.createIndex({ createdAt: -1 })
    
    console.log('[MongoDB] Indexes ensured for agent_configs collection')
  } catch (error) {
    console.error('[MongoDB] Failed to create indexes:', error)
    // Don't throw - indexes might already exist
  }
}

/**
 * Agent Config Storage Class
 */
export class AgentConfigStorage {
  /**
   * Ensure indexes are created and seed defaults (call once on startup)
   */
  async initialize(): Promise<void> {
    await ensureIndexes()
    await this.ensureDefaults()
  }

  /**
   * Ensure default configs exist in database
   */
  async ensureDefaults(): Promise<void> {
    try {
      const collection = await getCollection<AgentConfig>(COLLECTION_NAME)

      for (const defaultConfig of DEFAULT_AGENT_CONFIGS) {
        // Check if config already exists
        const existing = await collection.findOne({ agentId: defaultConfig.agentId })
        
        if (!existing) {
          // Insert default config
          await collection.insertOne({
            ...defaultConfig,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          console.log(`[AgentConfig] Created default config for ${defaultConfig.agentId}`)
        }
      }
    } catch (error) {
      console.error('[AgentConfig] Failed to ensure defaults:', error)
      // Don't throw - graceful degradation
    }
  }

  /**
   * Get agent config by ID
   */
  async getAgentConfig(agentId: string): Promise<AgentConfig | null> {
    try {
      const collection = await getCollection<AgentConfig>(COLLECTION_NAME)
      const result = await collection.findOne({ agentId })

      if (!result) {
        return null
      }

      // Convert MongoDB document to AgentConfig
      return {
        _id: result._id?.toString(),
        agentId: result.agentId,
        name: result.name,
        description: result.description,
        modelId: result.modelId,
        parameters: result.parameters || {},
        enabled: result.enabled ?? true,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      }
    } catch (error) {
      console.error(`[AgentConfig] Failed to get config for ${agentId}:`, error)
      return null
    }
  }

  /**
   * Get all agent configs
   */
  async getAllAgentConfigs(): Promise<AgentConfig[]> {
    try {
      const collection = await getCollection<AgentConfig>(COLLECTION_NAME)
      const results = await collection.find({}).toArray()

      return results.map(result => ({
        _id: result._id?.toString(),
        agentId: result.agentId,
        name: result.name,
        description: result.description,
        modelId: result.modelId,
        parameters: result.parameters || {},
        enabled: result.enabled ?? true,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      }))
    } catch (error) {
      console.error('[AgentConfig] Failed to get all configs:', error)
      return []
    }
  }

  /**
   * Save or update agent config
   */
  async saveAgentConfig(config: AgentConfig): Promise<boolean> {
    try {
      const collection = await getCollection<AgentConfig>(COLLECTION_NAME)

      const now = new Date().toISOString()
      
      // Upsert by agentId
      // Exclude _id, createdAt, updatedAt from the update
      // - _id: MongoDB doesn't allow updating _id
      // - createdAt, updatedAt: Timestamps should only be set by the database
      const { _id, createdAt, updatedAt, ...configToSave } = config
      
      await collection.updateOne(
        { agentId: config.agentId },
        { 
          $set: {
            ...configToSave,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          }
        },
        { upsert: true }
      )

      console.log(`[AgentConfig] Saved config for ${config.agentId}`)
      return true
    } catch (error: any) {
      console.error(`[AgentConfig] Failed to save config for ${config.agentId}:`, error)
      console.error('[AgentConfig] Error details:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack?.split('\n').slice(0, 3)
      })
      return false
    }
  }

  /**
   * Delete agent config
   */
  async deleteAgentConfig(agentId: string): Promise<boolean> {
    try {
      const collection = await getCollection(COLLECTION_NAME)
      
      const result = await collection.deleteOne({ agentId })

      if (result.deletedCount > 0) {
        console.log(`[AgentConfig] Deleted config for ${agentId}`)
        return true
      }
      
      return false
    } catch (error) {
      console.error(`[AgentConfig] Failed to delete config for ${agentId}:`, error)
      return false
    }
  }

  /**
   * Get ApiConfig for LLM calls (combines modelId with API key from store)
   * 
   * Note: This requires access to API keys, which are stored in Zustand.
   * For server-side usage, API keys should be passed separately.
   */
  async getAgentApiConfig(agentId: string, apiKeys?: Record<string, string>): Promise<ApiConfig | null> {
    const config = await this.getAgentConfig(agentId)
    
    if (!config || !config.enabled || !config.modelId) {
      return null
    }

    // Get provider from model ID
    const provider = getProviderForModel(config.modelId)
    
    if (!provider) {
      console.error(`[AgentConfig] Unknown provider for model ${config.modelId}`)
      return null
    }

    // Get API key (requires apiKeys to be passed in for server-side usage)
    // For client-side, we'd need to get from Zustand store
    const apiKey = apiKeys?.[provider]

    if (!apiKey) {
      console.error(`[AgentConfig] No API key found for provider ${provider}`)
      return null
    }

    return {
      modelId: config.modelId,
      apiKey,
    }
  }
}

/**
 * Singleton instance
 */
let agentConfigStorage: AgentConfigStorage | null = null

/**
 * Get singleton agent config storage instance
 */
export function getAgentConfigStorage(): AgentConfigStorage {
  if (!agentConfigStorage) {
    agentConfigStorage = new AgentConfigStorage()
  }
  return agentConfigStorage
}


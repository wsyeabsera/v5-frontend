/**
 * Meta Outputs Storage using MongoDB
 * 
 * Stores MetaAgentOutput results for history tracking and analytics.
 */

import { getCollection } from './mongodb-client'
import { MetaAgentOutput } from '@/types'

const COLLECTION_NAME = 'meta_outputs'

/**
 * Ensure indexes for meta outputs collection
 */
async function ensureIndexes(): Promise<void> {
  try {
    const collection = await getCollection(COLLECTION_NAME)
    
    // Create indexes
    await collection.createIndex({ requestId: 1 })
    await collection.createIndex({ agentName: 1 })
    await collection.createIndex({ timestamp: -1 }) // Descending for newest first
    await collection.createIndex({ reasoningQuality: 1 }) // For filtering by quality
    await collection.createIndex({ shouldReplan: 1 }) // For filtering by replan flag
    await collection.createIndex({ shouldDeepenReasoning: 1 }) // For filtering by deepen flag
    
    console.log('[MongoDB] Indexes ensured for meta_outputs collection')
  } catch (error) {
    console.error('[MongoDB] Failed to create indexes:', error)
    // Don't throw - indexes might already exist
  }
}

/**
 * Meta Outputs Storage Class
 */
export class MetaOutputsStorage {
  /**
   * Ensure indexes are created (call once on startup)
   */
  async initialize(): Promise<void> {
    await ensureIndexes()
  }

  /**
   * Store a meta agent output
   */
  async save(output: MetaAgentOutput): Promise<void> {
    const collection = await getCollection<MetaAgentOutput & { _id?: any }>(
      COLLECTION_NAME
    )

    // Prepare document for storage
    const doc: any = {
      requestId: output.requestId,
      agentName: output.agentName,
      timestamp: output.timestamp instanceof Date ? output.timestamp : new Date(output.timestamp),
      reasoningQuality: output.reasoningQuality,
      shouldReplan: output.shouldReplan,
      shouldDeepenReasoning: output.shouldDeepenReasoning,
      recommendedActions: output.recommendedActions,
      assessment: output.assessment,
      createdAt: new Date(),
    }

    // Add new optional fields if present
    if (output.reasoningQualityBreakdown !== undefined) {
      doc.reasoningQualityBreakdown = output.reasoningQualityBreakdown
    }
    if (output.replanStrategy !== undefined) {
      doc.replanStrategy = output.replanStrategy
    }
    if (output.reasoningDepthRecommendation !== undefined) {
      doc.reasoningDepthRecommendation = output.reasoningDepthRecommendation
    }
    if (output.focusAreas !== undefined) {
      doc.focusAreas = output.focusAreas
    }
    if (output.orchestratorDirectives !== undefined) {
      doc.orchestratorDirectives = output.orchestratorDirectives
    }
    if (output.patternAnalysis !== undefined) {
      doc.patternAnalysis = output.patternAnalysis
    }

    // Store requestContext separately for easier querying
    if (output.requestContext) {
      doc.requestContext = {
        requestId: output.requestContext.requestId,
        agentChain: output.requestContext.agentChain,
        status: output.requestContext.status,
        createdAt: output.requestContext.createdAt instanceof Date 
          ? output.requestContext.createdAt 
          : new Date(output.requestContext.createdAt),
      }
      
      // Include userQuery if present
      if (output.requestContext.userQuery) {
        doc.requestContext.userQuery = output.requestContext.userQuery
      }
    }

    // Upsert by requestId and agentName (one output per request)
    await collection.updateOne(
      { requestId: output.requestId, agentName: output.agentName },
      { $set: doc },
      { upsert: true }
    )
  }

  /**
   * Get an output by request ID
   */
  async getByRequestId(requestId: string): Promise<MetaAgentOutput | null> {
    const collection = await getCollection<MetaAgentOutput>(COLLECTION_NAME)

    const result = await collection.findOne({ requestId, agentName: 'meta-agent' })

    if (!result) {
      return null
    }

    // Ensure timestamps are Dates
    return {
      ...result,
      timestamp: result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp),
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    } as MetaAgentOutput
  }

  /**
   * Get all outputs with optional filters
   */
  async getAll(filters?: {
    minReasoningQuality?: number
    maxReasoningQuality?: number
    shouldReplan?: boolean
    shouldDeepenReasoning?: boolean
    startDate?: Date
    endDate?: Date
  }): Promise<MetaAgentOutput[]> {
    const collection = await getCollection<MetaAgentOutput>(COLLECTION_NAME)

    const query: any = {}

    if (filters) {
      if (filters.minReasoningQuality !== undefined || filters.maxReasoningQuality !== undefined) {
        query.reasoningQuality = {}
        if (filters.minReasoningQuality !== undefined) {
          query.reasoningQuality.$gte = filters.minReasoningQuality
        }
        if (filters.maxReasoningQuality !== undefined) {
          query.reasoningQuality.$lte = filters.maxReasoningQuality
        }
      }

      if (filters.shouldReplan !== undefined) {
        query.shouldReplan = filters.shouldReplan
      }

      if (filters.shouldDeepenReasoning !== undefined) {
        query.shouldDeepenReasoning = filters.shouldDeepenReasoning
      }

      if (filters.startDate || filters.endDate) {
        query.timestamp = {}
        if (filters.startDate) {
          query.timestamp.$gte = filters.startDate instanceof Date 
            ? filters.startDate 
            : new Date(filters.startDate)
        }
        if (filters.endDate) {
          query.timestamp.$lte = filters.endDate instanceof Date 
            ? filters.endDate 
            : new Date(filters.endDate)
        }
      }
    }

    const results = await collection
      .find(query)
      .sort({ timestamp: -1 })
      .toArray()

    return results.map((result) => ({
      ...result,
      timestamp: result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp),
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    })) as MetaAgentOutput[]
  }

  /**
   * Count total outputs
   */
  async count(): Promise<number> {
    const collection = await getCollection(COLLECTION_NAME)
    return collection.countDocuments({ agentName: 'meta-agent' })
  }

  /**
   * Delete all meta outputs
   */
  async clear(): Promise<void> {
    const collection = await getCollection(COLLECTION_NAME)
    await collection.deleteMany({ agentName: 'meta-agent' })
  }
}

// Singleton instance
let storageInstance: MetaOutputsStorage | null = null

/**
 * Get the singleton MetaOutputsStorage instance
 */
export function getMetaOutputsStorage(): MetaOutputsStorage {
  if (!storageInstance) {
    storageInstance = new MetaOutputsStorage()
  }
  return storageInstance
}


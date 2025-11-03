/**
 * Critic Outputs Storage using MongoDB
 * 
 * Stores CriticAgentOutput results for history tracking and analytics.
 */

import { getCollection } from './mongodb-client'
import { CriticAgentOutput } from '@/types'

const COLLECTION_NAME = 'critic_outputs'

/**
 * Ensure indexes for critic outputs collection
 */
async function ensureIndexes(): Promise<void> {
  try {
    const collection = await getCollection(COLLECTION_NAME)
    
    // Create indexes
    await collection.createIndex({ requestId: 1 })
    await collection.createIndex({ agentName: 1 })
    await collection.createIndex({ timestamp: -1 }) // Descending for newest first
    await collection.createIndex({ 'critique.recommendation': 1 }) // For filtering by recommendation
    await collection.createIndex({ 'critique.overallScore': -1 }) // For sorting by score
    
    console.log('[MongoDB] Indexes ensured for critic_outputs collection')
  } catch (error) {
    console.error('[MongoDB] Failed to create indexes:', error)
    // Don't throw - indexes might already exist
  }
}

/**
 * Critic Outputs Storage Class
 */
export class CriticOutputsStorage {
  /**
   * Ensure indexes are created (call once on startup)
   */
  async initialize(): Promise<void> {
    await ensureIndexes()
  }

  /**
   * Store a critic agent output
   */
  async save(output: CriticAgentOutput): Promise<void> {
    const collection = await getCollection<CriticAgentOutput & { _id?: any }>(
      COLLECTION_NAME
    )

    // Prepare document for storage
    const doc: any = {
      requestId: output.requestId,
      agentName: output.agentName,
      timestamp: output.timestamp instanceof Date ? output.timestamp : new Date(output.timestamp),
      planId: output.planId,
      requiresUserFeedback: output.requiresUserFeedback,
      critique: {
        ...output.critique,
        // Ensure all arrays and nested objects are properly stored
        issues: output.critique.issues || [],
        followUpQuestions: output.critique.followUpQuestions || [],
        strengths: output.critique.strengths || [],
        suggestions: output.critique.suggestions || [],
      },
      createdAt: new Date(),
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
  async getByRequestId(requestId: string): Promise<CriticAgentOutput | null> {
    const collection = await getCollection<CriticAgentOutput>(COLLECTION_NAME)

    const result = await collection.findOne({ requestId, agentName: 'critic-agent' })

    if (!result) {
      return null
    }

    // Ensure timestamps are Dates
    return {
      ...result,
      timestamp: result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp),
      critique: {
        ...result.critique,
        issues: result.critique.issues || [],
        followUpQuestions: result.critique.followUpQuestions || [],
        strengths: result.critique.strengths || [],
        suggestions: result.critique.suggestions || [],
      },
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    } as CriticAgentOutput
  }

  /**
   * Get all outputs with optional filters
   */
  async getAll(filters?: {
    recommendation?: 'approve' | 'revise' | 'reject'
    minScore?: number
    maxScore?: number
    startDate?: Date
    endDate?: Date
  }): Promise<CriticAgentOutput[]> {
    const collection = await getCollection<CriticAgentOutput>(COLLECTION_NAME)

    const query: any = {}

    if (filters) {
      if (filters.recommendation) {
        query['critique.recommendation'] = filters.recommendation
      }

      if (filters.minScore !== undefined || filters.maxScore !== undefined) {
        query['critique.overallScore'] = {}
        if (filters.minScore !== undefined) {
          query['critique.overallScore'].$gte = filters.minScore
        }
        if (filters.maxScore !== undefined) {
          query['critique.overallScore'].$lte = filters.maxScore
        }
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
      critique: {
        ...result.critique,
        issues: result.critique.issues || [],
        followUpQuestions: result.critique.followUpQuestions || [],
        strengths: result.critique.strengths || [],
        suggestions: result.critique.suggestions || [],
      },
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    })) as CriticAgentOutput[]
  }

  /**
   * Get outputs by agent chain
   */
  async getByAgentChain(agentChain: string[]): Promise<CriticAgentOutput[]> {
    const collection = await getCollection<CriticAgentOutput>(COLLECTION_NAME)

    const results = await collection
      .find({
        'requestContext.agentChain': { $all: agentChain },
        agentName: 'critic-agent',
      })
      .sort({ timestamp: -1 })
      .toArray()

    return results.map((result) => ({
      ...result,
      timestamp: result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp),
      critique: {
        ...result.critique,
        issues: result.critique.issues || [],
        followUpQuestions: result.critique.followUpQuestions || [],
        strengths: result.critique.strengths || [],
        suggestions: result.critique.suggestions || [],
      },
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    })) as CriticAgentOutput[]
  }

  /**
   * Delete an output by request ID
   */
  async deleteByRequestId(requestId: string): Promise<void> {
    const collection = await getCollection(COLLECTION_NAME)
    await collection.deleteOne({ requestId, agentName: 'critic-agent' })
  }

  /**
   * Count total outputs
   */
  async count(): Promise<number> {
    const collection = await getCollection(COLLECTION_NAME)
    return collection.countDocuments({ agentName: 'critic-agent' })
  }

  /**
   * Clear all critic outputs
   */
  async clear(): Promise<void> {
    const collection = await getCollection(COLLECTION_NAME)
    await collection.deleteMany({ agentName: 'critic-agent' })
  }
}

// Singleton instance
let storageInstance: CriticOutputsStorage | null = null

/**
 * Get the singleton CriticOutputsStorage instance
 */
export function getCriticOutputsStorage(): CriticOutputsStorage {
  if (!storageInstance) {
    storageInstance = new CriticOutputsStorage()
  }
  return storageInstance
}

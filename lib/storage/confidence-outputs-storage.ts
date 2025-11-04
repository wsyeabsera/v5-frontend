/**
 * Confidence Outputs Storage using MongoDB
 * 
 * Stores ConfidenceScorerOutput results for history tracking and analytics.
 */

import { getCollection } from './mongodb-client'
import { ConfidenceScorerOutput } from '@/types'

const COLLECTION_NAME = 'confidence_outputs'

/**
 * Ensure indexes for confidence outputs collection
 */
async function ensureIndexes(): Promise<void> {
  try {
    const collection = await getCollection(COLLECTION_NAME)
    
    // Create indexes
    await collection.createIndex({ requestId: 1 })
    await collection.createIndex({ agentName: 1 })
    await collection.createIndex({ timestamp: -1 }) // Descending for newest first
    await collection.createIndex({ overallConfidence: 1 }) // For filtering by confidence
    await collection.createIndex({ decision: 1 }) // For filtering by decision
    
    console.log('[MongoDB] Indexes ensured for confidence_outputs collection')
  } catch (error) {
    console.error('[MongoDB] Failed to create indexes:', error)
    // Don't throw - indexes might already exist
  }
}

/**
 * Confidence Outputs Storage Class
 */
export class ConfidenceOutputsStorage {
  /**
   * Ensure indexes are created (call once on startup)
   */
  async initialize(): Promise<void> {
    await ensureIndexes()
  }

  /**
   * Store a confidence scorer output
   */
  async save(output: ConfidenceScorerOutput): Promise<void> {
    const collection = await getCollection<ConfidenceScorerOutput & { _id?: any }>(
      COLLECTION_NAME
    )

    // Prepare document for storage
    const doc: any = {
      requestId: output.requestId,
      agentName: output.agentName,
      timestamp: output.timestamp instanceof Date ? output.timestamp : new Date(output.timestamp),
      overallConfidence: output.overallConfidence,
      agentScores: output.agentScores.map(score => ({
        ...score,
        timestamp: score.timestamp instanceof Date ? score.timestamp : new Date(score.timestamp),
      })),
      decision: output.decision,
      thresholdUsed: output.thresholdUsed,
      reasoning: output.reasoning,
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
  async getByRequestId(requestId: string): Promise<ConfidenceScorerOutput | null> {
    const collection = await getCollection<ConfidenceScorerOutput>(COLLECTION_NAME)

    const result = await collection.findOne({ requestId, agentName: 'confidence-scorer' })

    if (!result) {
      return null
    }

    // Ensure timestamps are Dates
    return {
      ...result,
      timestamp: result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp),
      agentScores: result.agentScores.map(score => ({
        ...score,
        timestamp: score.timestamp instanceof Date ? score.timestamp : new Date(score.timestamp),
      })),
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    } as ConfidenceScorerOutput
  }

  /**
   * Get all outputs with optional filters
   */
  async getAll(filters?: {
    minConfidence?: number
    maxConfidence?: number
    decision?: 'execute' | 'review' | 'rethink' | 'escalate'
    startDate?: Date
    endDate?: Date
  }): Promise<ConfidenceScorerOutput[]> {
    const collection = await getCollection<ConfidenceScorerOutput>(COLLECTION_NAME)

    const query: any = {}

    if (filters) {
      if (filters.minConfidence !== undefined || filters.maxConfidence !== undefined) {
        query.overallConfidence = {}
        if (filters.minConfidence !== undefined) {
          query.overallConfidence.$gte = filters.minConfidence
        }
        if (filters.maxConfidence !== undefined) {
          query.overallConfidence.$lte = filters.maxConfidence
        }
      }

      if (filters.decision) {
        query.decision = filters.decision
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
      agentScores: result.agentScores.map(score => ({
        ...score,
        timestamp: score.timestamp instanceof Date ? score.timestamp : new Date(score.timestamp),
      })),
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    })) as ConfidenceScorerOutput[]
  }

  /**
   * Count total outputs
   */
  async count(): Promise<number> {
    const collection = await getCollection(COLLECTION_NAME)
    return collection.countDocuments({ agentName: 'confidence-scorer' })
  }

  /**
   * Delete all confidence outputs
   */
  async clear(): Promise<void> {
    const collection = await getCollection(COLLECTION_NAME)
    await collection.deleteMany({ agentName: 'confidence-scorer' })
  }
}

// Singleton instance
let storageInstance: ConfidenceOutputsStorage | null = null

/**
 * Get the singleton ConfidenceOutputsStorage instance
 */
export function getConfidenceOutputsStorage(): ConfidenceOutputsStorage {
  if (!storageInstance) {
    storageInstance = new ConfidenceOutputsStorage()
  }
  return storageInstance
}


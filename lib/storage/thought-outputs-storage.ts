/**
 * Thought Outputs Storage using MongoDB
 * 
 * Stores ThoughtAgentOutput results for history tracking and analytics.
 */

import { getCollection, ensureIndexes as ensureBaseIndexes } from './mongodb-client'
import { ThoughtAgentOutput } from '@/types'

const COLLECTION_NAME = 'thought_outputs'

/**
 * Ensure indexes for thought outputs collection
 */
async function ensureIndexes(): Promise<void> {
  try {
    const collection = await getCollection(COLLECTION_NAME)
    
    // Create indexes
    await collection.createIndex({ requestId: 1 })
    await collection.createIndex({ agentName: 1 })
    await collection.createIndex({ timestamp: -1 }) // Descending for newest first
    await collection.createIndex({ 'thoughts.reasoning': 'text' }) // Text search on reasoning
    
    console.log('[MongoDB] Indexes ensured for thought_outputs collection')
  } catch (error) {
    console.error('[MongoDB] Failed to create indexes:', error)
    // Don't throw - indexes might already exist
  }
}

/**
 * Thought Outputs Storage Class
 */
export class ThoughtOutputsStorage {
  /**
   * Ensure indexes are created (call once on startup)
   */
  async initialize(): Promise<void> {
    await ensureIndexes()
  }

  /**
   * Store a thought agent output
   */
  async save(output: ThoughtAgentOutput): Promise<void> {
    const collection = await getCollection<ThoughtAgentOutput & { _id?: any }>(
      COLLECTION_NAME
    )

    // Prepare document for storage
    const doc: any = {
      requestId: output.requestId,
      agentName: output.agentName,
      timestamp: output.timestamp instanceof Date ? output.timestamp : new Date(output.timestamp),
      thoughts: output.thoughts.map(thought => ({
        ...thought,
        timestamp: thought.timestamp instanceof Date ? thought.timestamp : new Date(thought.timestamp),
      })),
      primaryApproach: output.primaryApproach,
      keyInsights: output.keyInsights,
      recommendedTools: output.recommendedTools,
      createdAt: new Date(),
    }

    // Add optional fields
    if (output.complexityScore !== undefined) {
      doc.complexityScore = output.complexityScore
    }

    if (output.reasoningPass !== undefined) {
      doc.reasoningPass = output.reasoningPass
    }

    if (output.totalPasses !== undefined) {
      doc.totalPasses = output.totalPasses
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
  async getByRequestId(requestId: string): Promise<ThoughtAgentOutput | null> {
    const collection = await getCollection<ThoughtAgentOutput>(COLLECTION_NAME)

    const result = await collection.findOne({ requestId, agentName: 'thought-agent' })

    if (!result) {
      return null
    }

    // Ensure timestamps are Dates
    return {
      ...result,
      timestamp: result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp),
      thoughts: result.thoughts.map(thought => ({
        ...thought,
        timestamp: thought.timestamp instanceof Date ? thought.timestamp : new Date(thought.timestamp),
      })),
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    } as ThoughtAgentOutput
  }

  /**
   * Get all outputs with optional filters
   */
  async getAll(filters?: {
    minComplexityScore?: number
    maxComplexityScore?: number
    reasoningPass?: number
    startDate?: Date
    endDate?: Date
  }): Promise<ThoughtAgentOutput[]> {
    const collection = await getCollection<ThoughtAgentOutput>(COLLECTION_NAME)

    const query: any = {}

    if (filters) {
      if (filters.minComplexityScore !== undefined || filters.maxComplexityScore !== undefined) {
        query.complexityScore = {}
        if (filters.minComplexityScore !== undefined) {
          query.complexityScore.$gte = filters.minComplexityScore
        }
        if (filters.maxComplexityScore !== undefined) {
          query.complexityScore.$lte = filters.maxComplexityScore
        }
      }

      if (filters.reasoningPass !== undefined) {
        query.reasoningPass = filters.reasoningPass
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
      thoughts: result.thoughts.map(thought => ({
        ...thought,
        timestamp: thought.timestamp instanceof Date ? thought.timestamp : new Date(thought.timestamp),
      })),
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    })) as ThoughtAgentOutput[]
  }

  /**
   * Get outputs by agent chain
   */
  async getByAgentChain(agentChain: string[]): Promise<ThoughtAgentOutput[]> {
    const collection = await getCollection<ThoughtAgentOutput>(COLLECTION_NAME)

    const results = await collection
      .find({
        'requestContext.agentChain': { $all: agentChain },
        agentName: 'thought-agent',
      })
      .sort({ timestamp: -1 })
      .toArray()

    return results.map((result) => ({
      ...result,
      timestamp: result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp),
      thoughts: result.thoughts.map(thought => ({
        ...thought,
        timestamp: thought.timestamp instanceof Date ? thought.timestamp : new Date(thought.timestamp),
      })),
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    })) as ThoughtAgentOutput[]
  }

  /**
   * Search outputs by text (searches reasoning text)
   */
  async search(query: string): Promise<ThoughtAgentOutput[]> {
    const collection = await getCollection<ThoughtAgentOutput>(COLLECTION_NAME)

    const results = await collection
      .find({
        agentName: 'thought-agent',
        $text: { $search: query },
      })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray()

    return results.map((result) => ({
      ...result,
      timestamp: result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp),
      thoughts: result.thoughts.map(thought => ({
        ...thought,
        timestamp: thought.timestamp instanceof Date ? thought.timestamp : new Date(thought.timestamp),
      })),
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    })) as ThoughtAgentOutput[]
  }

  /**
   * Delete an output by request ID
   */
  async deleteByRequestId(requestId: string): Promise<void> {
    const collection = await getCollection(COLLECTION_NAME)
    await collection.deleteOne({ requestId, agentName: 'thought-agent' })
  }

  /**
   * Count total outputs
   */
  async count(): Promise<number> {
    const collection = await getCollection(COLLECTION_NAME)
    return collection.countDocuments({ agentName: 'thought-agent' })
  }

  /**
   * Clear all thought outputs
   */
  async clear(): Promise<void> {
    const collection = await getCollection(COLLECTION_NAME)
    await collection.deleteMany({ agentName: 'thought-agent' })
  }
}

// Singleton instance
let storageInstance: ThoughtOutputsStorage | null = null

/**
 * Get the singleton ThoughtOutputsStorage instance
 */
export function getThoughtOutputsStorage(): ThoughtOutputsStorage {
  if (!storageInstance) {
    storageInstance = new ThoughtOutputsStorage()
  }
  return storageInstance
}


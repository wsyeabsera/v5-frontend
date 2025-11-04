/**
 * Summary Outputs Storage using MongoDB
 * 
 * Stores SummaryAgentOutput results for history tracking and analytics.
 */

import { getCollection, ensureIndexes as ensureBaseIndexes } from './mongodb-client'
import { SummaryAgentOutput } from '@/types'

const COLLECTION_NAME = 'summary_outputs'

/**
 * Ensure indexes for summary outputs collection
 */
async function ensureIndexes(): Promise<void> {
  try {
    const collection = await getCollection(COLLECTION_NAME)
    
    // Create indexes
    await collection.createIndex({ requestId: 1 })
    await collection.createIndex({ agentName: 1 })
    await collection.createIndex({ timestamp: -1 }) // Descending for newest first
    await collection.createIndex({ summary: 'text' }) // Text search on summary
    
    console.log('[MongoDB] Indexes ensured for summary_outputs collection')
  } catch (error) {
    console.error('[MongoDB] Failed to create indexes:', error)
    // Don't throw - indexes might already exist
  }
}

/**
 * Summary Outputs Storage Class
 */
export class SummaryOutputsStorage {
  /**
   * Ensure indexes are created (call once on startup)
   */
  async initialize(): Promise<void> {
    await ensureIndexes()
  }

  /**
   * Store a summary agent output
   */
  async save(output: SummaryAgentOutput): Promise<void> {
    const collection = await getCollection<SummaryAgentOutput & { _id?: any }>(
      COLLECTION_NAME
    )

    // Prepare document for storage
    const doc: any = {
      requestId: output.requestId,
      agentName: output.agentName,
      timestamp: output.timestamp instanceof Date ? output.timestamp : new Date(output.timestamp),
      summary: output.summary,
      createdAt: new Date(),
    }

    // Add optional fields
    if (output.summaryVersion !== undefined) {
      doc.summaryVersion = output.summaryVersion
    }

    if (output.thoughtsSummary) {
      doc.thoughtsSummary = output.thoughtsSummary
    }

    if (output.executionSummary) {
      doc.executionSummary = output.executionSummary
    }

    if (output.keyTakeaways && output.keyTakeaways.length > 0) {
      doc.keyTakeaways = output.keyTakeaways
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

    // Upsert by requestId and agentName (one output per request, but allow versioning)
    await collection.updateOne(
      { requestId: output.requestId, agentName: output.agentName },
      { $set: doc },
      { upsert: true }
    )
  }

  /**
   * Get an output by request ID (returns latest version)
   */
  async getByRequestId(requestId: string): Promise<SummaryAgentOutput | null> {
    const collection = await getCollection<SummaryAgentOutput>(COLLECTION_NAME)

    // Get latest version for this request
    const result = await collection.findOne(
      { requestId, agentName: 'summary-agent' },
      { sort: { summaryVersion: -1, timestamp: -1 } }
    )

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
    } as SummaryAgentOutput
  }

  /**
   * Get all versions of summaries for a request ID
   */
  async getAllVersionsByRequestId(requestId: string): Promise<SummaryAgentOutput[]> {
    const collection = await getCollection<SummaryAgentOutput>(COLLECTION_NAME)

    const results = await collection
      .find({ requestId, agentName: 'summary-agent' })
      .sort({ summaryVersion: -1, timestamp: -1 })
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
    })) as SummaryAgentOutput[]
  }

  /**
   * Get all outputs with optional filters
   */
  async getAll(filters?: {
    startDate?: Date
    endDate?: Date
  }): Promise<SummaryAgentOutput[]> {
    const collection = await getCollection<SummaryAgentOutput>(COLLECTION_NAME)

    const query: any = { agentName: 'summary-agent' }

    if (filters) {
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
    })) as SummaryAgentOutput[]
  }

  /**
   * Get outputs by agent chain
   */
  async getByAgentChain(agentChain: string[]): Promise<SummaryAgentOutput[]> {
    const collection = await getCollection<SummaryAgentOutput>(COLLECTION_NAME)

    const results = await collection
      .find({
        'requestContext.agentChain': { $all: agentChain },
        agentName: 'summary-agent',
      })
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
    })) as SummaryAgentOutput[]
  }

  /**
   * Search outputs by text (searches summary text)
   */
  async search(query: string): Promise<SummaryAgentOutput[]> {
    const collection = await getCollection<SummaryAgentOutput>(COLLECTION_NAME)

    const results = await collection
      .find({
        agentName: 'summary-agent',
        $text: { $search: query },
      })
      .sort({ timestamp: -1 })
      .limit(50)
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
    })) as SummaryAgentOutput[]
  }

  /**
   * Delete an output by request ID
   */
  async deleteByRequestId(requestId: string): Promise<void> {
    const collection = await getCollection(COLLECTION_NAME)
    await collection.deleteMany({ requestId, agentName: 'summary-agent' })
  }

  /**
   * Count total outputs
   */
  async count(): Promise<number> {
    const collection = await getCollection(COLLECTION_NAME)
    return collection.countDocuments({ agentName: 'summary-agent' })
  }

  /**
   * Clear all summary outputs
   */
  async clear(): Promise<void> {
    const collection = await getCollection(COLLECTION_NAME)
    await collection.deleteMany({ agentName: 'summary-agent' })
  }
}

// Singleton instance
let storageInstance: SummaryOutputsStorage | null = null

/**
 * Get the singleton SummaryOutputsStorage instance
 */
export function getSummaryOutputsStorage(): SummaryOutputsStorage {
  if (!storageInstance) {
    storageInstance = new SummaryOutputsStorage()
  }
  return storageInstance
}


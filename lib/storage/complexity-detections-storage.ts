/**
 * Complexity Detections Storage using MongoDB
 * 
 * Stores ComplexityDetectorOutput results for history tracking and analytics.
 */

import { getCollection, ensureIndexes as ensureBaseIndexes } from './mongodb-client'
import { ComplexityDetectorOutput } from '@/types'

const COLLECTION_NAME = 'complexity_detections'

/**
 * Ensure indexes for complexity detections collection
 */
async function ensureIndexes(): Promise<void> {
  try {
    const collection = await getCollection(COLLECTION_NAME)
    
    // Create indexes
    await collection.createIndex({ requestId: 1 })
    await collection.createIndex({ timestamp: -1 }) // Descending for newest first
    await collection.createIndex({ 'complexity.score': 1 })
    await collection.createIndex({ detectionMethod: 1 })
    
    console.log('[MongoDB] Indexes ensured for complexity_detections collection')
  } catch (error) {
    console.error('[MongoDB] Failed to create indexes:', error)
    // Don't throw - indexes might already exist
  }
}

/**
 * Complexity Detections Storage Class
 */
export class ComplexityDetectionsStorage {
  /**
   * Ensure indexes are created (call once on startup)
   */
  async initialize(): Promise<void> {
    await ensureIndexes()
  }

  /**
   * Store a complexity detector output
   */
  async save(output: ComplexityDetectorOutput): Promise<void> {
    const collection = await getCollection<ComplexityDetectorOutput & { _id?: any }>(
      COLLECTION_NAME
    )

    // Prepare document for storage
    const doc: any = {
      requestId: output.requestId,
      agentName: output.agentName,
      timestamp: output.timestamp instanceof Date ? output.timestamp : new Date(output.timestamp),
      userQuery: output.userQuery,
      complexity: output.complexity,
      detectionMethod: output.detectionMethod,
      createdAt: new Date(),
    }

    // Add optional fields
    if (output.detectedKeywords && output.detectedKeywords.length > 0) {
      doc.detectedKeywords = output.detectedKeywords
    }

    if (output.matchedExampleId) {
      doc.matchedExampleId = output.matchedExampleId
    }

    if (output.similarity !== undefined) {
      doc.similarity = output.similarity
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

    // Upsert by requestId and agentName (one detection per request)
    await collection.updateOne(
      { requestId: output.requestId, agentName: output.agentName },
      { $set: doc },
      { upsert: true }
    )
  }

  /**
   * Get a detection by request ID
   */
  async getByRequestId(requestId: string): Promise<ComplexityDetectorOutput | null> {
    const collection = await getCollection<ComplexityDetectorOutput>(COLLECTION_NAME)

    const result = await collection.findOne({ requestId, agentName: 'complexity-detector' })

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
    } as ComplexityDetectorOutput
  }

  /**
   * Get all detections with optional filters
   */
  async getAll(filters?: {
    detectionMethod?: 'semantic' | 'keyword'
    minScore?: number
    maxScore?: number
    startDate?: Date
    endDate?: Date
  }): Promise<ComplexityDetectorOutput[]> {
    const collection = await getCollection<ComplexityDetectorOutput>(COLLECTION_NAME)

    const query: any = {}

    if (filters) {
      if (filters.detectionMethod) {
        query.detectionMethod = filters.detectionMethod
      }

      if (filters.minScore !== undefined || filters.maxScore !== undefined) {
        query['complexity.score'] = {}
        if (filters.minScore !== undefined) {
          query['complexity.score'].$gte = filters.minScore
        }
        if (filters.maxScore !== undefined) {
          query['complexity.score'].$lte = filters.maxScore
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
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    })) as ComplexityDetectorOutput[]
  }

  /**
   * Delete a detection by request ID
   */
  async deleteByRequestId(requestId: string): Promise<void> {
    const collection = await getCollection(COLLECTION_NAME)
    await collection.deleteOne({ requestId, agentName: 'complexity-detector' })
  }

  /**
   * Count total detections
   */
  async count(): Promise<number> {
    const collection = await getCollection(COLLECTION_NAME)
    return collection.countDocuments({ agentName: 'complexity-detector' })
  }

  /**
   * Clear all complexity detections
   */
  async clear(): Promise<void> {
    const collection = await getCollection(COLLECTION_NAME)
    await collection.deleteMany({ agentName: 'complexity-detector' })
  }
}

// Singleton instance
let storageInstance: ComplexityDetectionsStorage | null = null

/**
 * Get the singleton ComplexityDetectionsStorage instance
 */
export function getComplexityDetectionsStorage(): ComplexityDetectionsStorage {
  if (!storageInstance) {
    storageInstance = new ComplexityDetectionsStorage()
  }
  return storageInstance
}


/**
 * Executor Outputs Storage using MongoDB
 * 
 * Stores ExecutorAgentOutput results for history tracking and analytics.
 */

import { getCollection } from './mongodb-client'
import { ExecutorAgentOutput } from '@/types'

const COLLECTION_NAME = 'executor_outputs'

/**
 * Ensure indexes for executor outputs collection
 */
async function ensureIndexes(): Promise<void> {
  try {
    const collection = await getCollection(COLLECTION_NAME)
    
    // Create indexes
    await collection.createIndex({ requestId: 1 })
    await collection.createIndex({ agentName: 1 })
    await collection.createIndex({ timestamp: -1 }) // Descending for newest first
    await collection.createIndex({ executionVersion: -1 }) // For sorting by version
    await collection.createIndex({ 'executionResult.overallSuccess': 1 }) // For filtering by success
    await collection.createIndex({ planId: 1 }) // For filtering by plan
    
    console.log('[MongoDB] Indexes ensured for executor_outputs collection')
  } catch (error) {
    console.error('[MongoDB] Failed to create indexes:', error)
    // Don't throw - indexes might already exist
  }
}

/**
 * Executor Outputs Storage Class
 */
export class ExecutorOutputsStorage {
  /**
   * Ensure indexes are created (call once on startup)
   */
  async initialize(): Promise<void> {
    await ensureIndexes()
  }

  /**
   * Store an executor agent output
   */
  async save(output: ExecutorAgentOutput): Promise<void> {
    const collection = await getCollection<ExecutorAgentOutput & { _id?: any }>(
      COLLECTION_NAME
    )

    // Prepare document for storage
    const doc: any = {
      requestId: output.requestId,
      agentName: output.agentName,
      timestamp: output.timestamp instanceof Date ? output.timestamp : new Date(output.timestamp),
      planId: output.planId,
      requiresUserFeedback: output.requiresUserFeedback,
      executionVersion: output.executionVersion || 1,
      executionResult: {
        ...output.executionResult,
        // Ensure all arrays and nested objects are properly stored
        steps: (output.executionResult.steps || []).map(step => ({
          ...step,
          timestamp: step.timestamp instanceof Date ? step.timestamp : new Date(step.timestamp),
        })),
        partialResults: output.executionResult.partialResults || {},
        errors: output.executionResult.errors || [],
        questionsAsked: output.executionResult.questionsAsked || [],
        adaptations: output.executionResult.adaptations || [],
      },
      critiqueAvailable: output.critiqueAvailable || false,
      critiqueRecommendation: output.critiqueRecommendation,
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

    // Insert as new version (allow multiple executions per request)
    await collection.insertOne(doc)
  }

  /**
   * Get an output by request ID (returns latest version)
   */
  async getByRequestId(requestId: string): Promise<ExecutorAgentOutput | null> {
    const collection = await getCollection<ExecutorAgentOutput>(COLLECTION_NAME)

    // Get latest version for this request
    const result = await collection.findOne(
      { requestId, agentName: 'executor-agent' },
      { sort: { executionVersion: -1 } }
    )

    if (!result) {
      return null
    }

    // Ensure timestamps are Dates
    return {
      ...result,
      timestamp: result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp),
      executionResult: {
        ...result.executionResult,
        steps: (result.executionResult.steps || []).map(step => ({
          ...step,
          timestamp: step.timestamp instanceof Date ? step.timestamp : new Date(step.timestamp),
        })),
        partialResults: result.executionResult.partialResults || {},
        errors: result.executionResult.errors || [],
        questionsAsked: result.executionResult.questionsAsked || [],
        adaptations: result.executionResult.adaptations || [],
      },
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    } as ExecutorAgentOutput
  }

  /**
   * Get all outputs with optional filters
   */
  async getAll(filters?: {
    overallSuccess?: boolean
    startDate?: Date
    endDate?: Date
    planId?: string
  }): Promise<ExecutorAgentOutput[]> {
    const collection = await getCollection<ExecutorAgentOutput>(COLLECTION_NAME)

    const query: any = {}

    if (filters) {
      if (filters.overallSuccess !== undefined) {
        query['executionResult.overallSuccess'] = filters.overallSuccess
      }

      if (filters.planId) {
        query.planId = filters.planId
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
      executionResult: {
        ...result.executionResult,
        steps: (result.executionResult.steps || []).map(step => ({
          ...step,
          timestamp: step.timestamp instanceof Date ? step.timestamp : new Date(step.timestamp),
        })),
        partialResults: result.executionResult.partialResults || {},
        errors: result.executionResult.errors || [],
        questionsAsked: result.executionResult.questionsAsked || [],
        adaptations: result.executionResult.adaptations || [],
      },
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    })) as ExecutorAgentOutput[]
  }

  /**
   * Get outputs by agent chain
   */
  async getByAgentChain(agentChain: string[]): Promise<ExecutorAgentOutput[]> {
    const collection = await getCollection<ExecutorAgentOutput>(COLLECTION_NAME)

    const results = await collection
      .find({
        'requestContext.agentChain': { $all: agentChain },
        agentName: 'executor-agent',
      })
      .sort({ timestamp: -1 })
      .toArray()

    return results.map((result) => ({
      ...result,
      timestamp: result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp),
      executionResult: {
        ...result.executionResult,
        steps: (result.executionResult.steps || []).map(step => ({
          ...step,
          timestamp: step.timestamp instanceof Date ? step.timestamp : new Date(step.timestamp),
        })),
        partialResults: result.executionResult.partialResults || {},
        errors: result.executionResult.errors || [],
        questionsAsked: result.executionResult.questionsAsked || [],
        adaptations: result.executionResult.adaptations || [],
      },
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    })) as ExecutorAgentOutput[]
  }

  /**
   * Delete an output by request ID
   */
  async deleteByRequestId(requestId: string): Promise<void> {
    const collection = await getCollection(COLLECTION_NAME)
    await collection.deleteMany({ requestId, agentName: 'executor-agent' })
  }

  /**
   * Count total outputs
   */
  async count(): Promise<number> {
    const collection = await getCollection(COLLECTION_NAME)
    return collection.countDocuments({ agentName: 'executor-agent' })
  }

  /**
   * Get all execution versions for a request
   */
  async getAllVersionsByRequestId(requestId: string): Promise<ExecutorAgentOutput[]> {
    const collection = await getCollection<ExecutorAgentOutput>(COLLECTION_NAME)

    const results = await collection
      .find({ requestId, agentName: 'executor-agent' })
      .sort({ executionVersion: 1 }) // Ascending order
      .toArray()

    // Ensure timestamps are Dates
    return results.map(result => ({
      ...result,
      timestamp: result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp),
      executionResult: {
        ...result.executionResult,
        steps: (result.executionResult.steps || []).map(step => ({
          ...step,
          timestamp: step.timestamp instanceof Date ? step.timestamp : new Date(step.timestamp),
        })),
        partialResults: result.executionResult.partialResults || {},
        errors: result.executionResult.errors || [],
        questionsAsked: result.executionResult.questionsAsked || [],
        adaptations: result.executionResult.adaptations || [],
      },
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    } as ExecutorAgentOutput))
  }

  /**
   * Clear all executor outputs
   */
  async clear(): Promise<void> {
    const collection = await getCollection(COLLECTION_NAME)
    await collection.deleteMany({ agentName: 'executor-agent' })
  }
}

// Singleton instance
let storageInstance: ExecutorOutputsStorage | null = null

/**
 * Get the singleton ExecutorOutputsStorage instance
 */
export function getExecutorOutputsStorage(): ExecutorOutputsStorage {
  if (!storageInstance) {
    storageInstance = new ExecutorOutputsStorage()
  }
  return storageInstance
}


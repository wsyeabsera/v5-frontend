/**
 * Replan Outputs Storage using MongoDB
 * 
 * Stores ReplanAgentOutput results for history tracking and analytics.
 */

import { getCollection } from './mongodb-client'
import { ReplanAgentOutput } from '@/types'

const COLLECTION_NAME = 'replan_outputs'

/**
 * Ensure indexes for replan outputs collection
 */
async function ensureIndexes(): Promise<void> {
  try {
    const collection = await getCollection(COLLECTION_NAME)
    
    // Create indexes
    await collection.createIndex({ requestId: 1 })
    await collection.createIndex({ agentName: 1 })
    await collection.createIndex({ timestamp: -1 }) // Descending for newest first
    await collection.createIndex({ originalPlanId: 1 }) // For linking to original plan
    await collection.createIndex({ planVersion: 1 }) // For version tracking
    await collection.createIndex({ requestId: 1, planVersion: 1 }) // Compound index for queries
    
    console.log('[MongoDB] Indexes ensured for replan_outputs collection')
  } catch (error) {
    console.error('[MongoDB] Failed to create indexes:', error)
    // Don't throw - indexes might already exist
  }
}

/**
 * Replan Outputs Storage Class
 */
export class ReplanOutputsStorage {
  /**
   * Ensure indexes are created (call once on startup)
   */
  async initialize(): Promise<void> {
    await ensureIndexes()
  }

  /**
   * Store a replan agent output
   */
  async save(output: ReplanAgentOutput): Promise<void> {
    const collection = await getCollection<ReplanAgentOutput & { _id?: any }>(
      COLLECTION_NAME
    )

    // Prepare document for storage
    const doc: any = {
      requestId: output.requestId,
      agentName: output.agentName,
      timestamp: output.timestamp instanceof Date ? output.timestamp : new Date(output.timestamp),
      plan: {
        ...output.plan,
        createdAt: output.plan.createdAt instanceof Date 
          ? output.plan.createdAt 
          : new Date(output.plan.createdAt),
      },
      rationale: output.rationale,
      changesFromOriginal: output.changesFromOriginal,
      addressesMetaGuidance: output.addressesMetaGuidance,
      addressesCriticIssues: output.addressesCriticIssues,
      addressesThoughtRecommendations: output.addressesThoughtRecommendations,
      confidence: output.confidence,
      planVersion: output.planVersion,
      originalPlanId: output.originalPlanId,
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

    // Upsert by requestId, agentName, and planVersion
    await collection.updateOne(
      { requestId: output.requestId, agentName: output.agentName, planVersion: output.planVersion },
      { $set: doc },
      { upsert: true }
    )
  }

  /**
   * Get a replan output by request ID and version
   */
  async getByRequestIdAndVersion(requestId: string, planVersion: number): Promise<ReplanAgentOutput | null> {
    const collection = await getCollection<ReplanAgentOutput>(COLLECTION_NAME)

    const result = await collection.findOne({ requestId, agentName: 'replan-agent', planVersion })

    if (!result) {
      return null
    }

    // Ensure timestamps are Dates
    return {
      ...result,
      timestamp: result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp),
      plan: {
        ...result.plan,
        createdAt: result.plan.createdAt instanceof Date ? result.plan.createdAt : new Date(result.plan.createdAt),
        steps: result.plan.steps.map(step => ({
          ...step,
          status: step.status || 'pending',
        })),
      },
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    } as ReplanAgentOutput
  }

  /**
   * Get all replan outputs for a request
   */
  async getAllByRequestId(requestId: string): Promise<ReplanAgentOutput[]> {
    const collection = await getCollection<ReplanAgentOutput>(COLLECTION_NAME)

    const results = await collection
      .find({ requestId, agentName: 'replan-agent' })
      .sort({ planVersion: 1 }) // Ascending order (version 2, 3, 4...)
      .toArray()

    return results.map(result => ({
      ...result,
      timestamp: result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp),
      plan: {
        ...result.plan,
        createdAt: result.plan.createdAt instanceof Date ? result.plan.createdAt : new Date(result.plan.createdAt),
        steps: result.plan.steps.map(step => ({
          ...step,
          status: step.status || 'pending',
        })),
      },
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    })) as ReplanAgentOutput[]
  }

  /**
   * Get all replan outputs (for history)
   */
  async getAll(): Promise<ReplanAgentOutput[]> {
    const collection = await getCollection<ReplanAgentOutput>(COLLECTION_NAME)

    const results = await collection
      .find({ agentName: 'replan-agent' })
      .sort({ timestamp: -1 }) // Newest first
      .toArray()

    return results.map(result => ({
      ...result,
      timestamp: result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp),
      plan: {
        ...result.plan,
        createdAt: result.plan.createdAt instanceof Date ? result.plan.createdAt : new Date(result.plan.createdAt),
        steps: result.plan.steps.map(step => ({
          ...step,
          status: step.status || 'pending',
        })),
      },
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    })) as ReplanAgentOutput[]
  }

  /**
   * Get latest replan output for a request
   */
  async getLatestByRequestId(requestId: string): Promise<ReplanAgentOutput | null> {
    const collection = await getCollection<ReplanAgentOutput>(COLLECTION_NAME)

    const result = await collection
      .findOne(
        { requestId, agentName: 'replan-agent' },
        { sort: { planVersion: -1 } } // Latest version
      )

    if (!result) {
      return null
    }

    // Ensure timestamps are Dates
    return {
      ...result,
      timestamp: result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp),
      plan: {
        ...result.plan,
        createdAt: result.plan.createdAt instanceof Date ? result.plan.createdAt : new Date(result.plan.createdAt),
        steps: result.plan.steps.map(step => ({
          ...step,
          status: step.status || 'pending',
        })),
      },
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    } as ReplanAgentOutput
  }

  /**
   * Count total replan outputs
   */
  async count(): Promise<number> {
    const collection = await getCollection(COLLECTION_NAME)
    return collection.countDocuments({ agentName: 'replan-agent' })
  }

  /**
   * Delete all replan outputs
   */
  async clear(): Promise<void> {
    const collection = await getCollection(COLLECTION_NAME)
    await collection.deleteMany({ agentName: 'replan-agent' })
  }
}

// Singleton instance
let storageInstance: ReplanOutputsStorage | null = null

/**
 * Get the singleton ReplanOutputsStorage instance
 */
export function getReplanOutputsStorage(): ReplanOutputsStorage {
  if (!storageInstance) {
    storageInstance = new ReplanOutputsStorage()
  }
  return storageInstance
}


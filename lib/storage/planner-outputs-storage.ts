/**
 * Planner Outputs Storage using MongoDB
 * 
 * Stores PlannerAgentOutput results for history tracking and analytics.
 */

import { getCollection } from './mongodb-client'
import { PlannerAgentOutput } from '@/types'

const COLLECTION_NAME = 'planner_outputs'

/**
 * Ensure indexes for planner outputs collection
 */
async function ensureIndexes(): Promise<void> {
  try {
    const collection = await getCollection(COLLECTION_NAME)
    
    // Create indexes
    await collection.createIndex({ requestId: 1 })
    await collection.createIndex({ agentName: 1 })
    await collection.createIndex({ timestamp: -1 }) // Descending for newest first
    await collection.createIndex({ 'plan.goal': 'text' }) // Text search on plan goal
    
    console.log('[MongoDB] Indexes ensured for planner_outputs collection')
  } catch (error) {
    console.error('[MongoDB] Failed to create indexes:', error)
    // Don't throw - indexes might already exist
  }
}

/**
 * Planner Outputs Storage Class
 */
export class PlannerOutputsStorage {
  /**
   * Ensure indexes are created (call once on startup)
   */
  async initialize(): Promise<void> {
    await ensureIndexes()
  }

  /**
   * Store a planner agent output
   */
  async save(output: PlannerAgentOutput): Promise<void> {
    const collection = await getCollection<PlannerAgentOutput & { _id?: any }>(
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
        steps: output.plan.steps.map(step => ({
          ...step,
        })),
      },
      rationale: output.rationale,
      basedOnThoughts: output.basedOnThoughts,
      createdAt: new Date(),
    }

    // Add optional fields
    if (output.alternativePlans && output.alternativePlans.length > 0) {
      doc.alternativePlans = output.alternativePlans.map(plan => ({
        ...plan,
        createdAt: plan.createdAt instanceof Date 
          ? plan.createdAt 
          : new Date(plan.createdAt),
        steps: plan.steps.map(step => ({ ...step })),
      }))
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

    // Insert as new document to support multiple plans per requestId
    await collection.insertOne(doc)
  }

  /**
   * Get the latest output by request ID
   */
  async getByRequestId(requestId: string): Promise<PlannerAgentOutput | null> {
    const collection = await getCollection<PlannerAgentOutput>(COLLECTION_NAME)

    const result = await collection.findOne(
      { requestId, agentName: 'planner-agent' },
      { sort: { 'plan.planVersion': -1, timestamp: -1 } }
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
        createdAt: result.plan.createdAt instanceof Date 
          ? result.plan.createdAt 
          : new Date(result.plan.createdAt),
        steps: result.plan.steps.map(step => ({ ...step })),
      },
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    } as PlannerAgentOutput
  }

  /**
   * Get all plans by request ID, sorted by timestamp descending (newest first)
   */
  async getAllPlansByRequestId(requestId: string): Promise<PlannerAgentOutput[]> {
    const collection = await getCollection<PlannerAgentOutput>(COLLECTION_NAME)

    const results = await collection
      .find({ requestId, agentName: 'planner-agent' })
      .sort({ timestamp: -1 })
      .toArray()

    // Ensure timestamps are Dates
    return results.map(result => ({
      ...result,
      timestamp: result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp),
      plan: {
        ...result.plan,
        createdAt: result.plan.createdAt instanceof Date 
          ? result.plan.createdAt 
          : new Date(result.plan.createdAt),
        steps: result.plan.steps.map(step => ({ ...step })),
      },
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    } as PlannerAgentOutput))
  }

  /**
   * Get a specific plan by its ID
   */
  async getByPlanId(planId: string): Promise<PlannerAgentOutput | null> {
    const collection = await getCollection<PlannerAgentOutput>(COLLECTION_NAME)

    const result = await collection.findOne({ 'plan.id': planId })

    if (!result) {
      return null
    }

    // Ensure timestamps are Dates
    return {
      ...result,
      timestamp: result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp),
      plan: {
        ...result.plan,
        createdAt: result.plan.createdAt instanceof Date 
          ? result.plan.createdAt 
          : new Date(result.plan.createdAt),
        steps: result.plan.steps.map(step => ({ ...step })),
      },
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    } as PlannerAgentOutput
  }

  /**
   * Get all outputs with optional filters
   */
  async getAll(filters?: {
    minComplexity?: number
    maxComplexity?: number
    minConfidence?: number
    maxConfidence?: number
    startDate?: Date
    endDate?: Date
  }): Promise<PlannerAgentOutput[]> {
    const collection = await getCollection<PlannerAgentOutput>(COLLECTION_NAME)

    const query: any = {}

    if (filters) {
      if (filters.minComplexity !== undefined || filters.maxComplexity !== undefined) {
        query['plan.estimatedComplexity'] = {}
        if (filters.minComplexity !== undefined) {
          query['plan.estimatedComplexity'].$gte = filters.minComplexity
        }
        if (filters.maxComplexity !== undefined) {
          query['plan.estimatedComplexity'].$lte = filters.maxComplexity
        }
      }

      if (filters.minConfidence !== undefined || filters.maxConfidence !== undefined) {
        query['plan.confidence'] = {}
        if (filters.minConfidence !== undefined) {
          query['plan.confidence'].$gte = filters.minConfidence
        }
        if (filters.maxConfidence !== undefined) {
          query['plan.confidence'].$lte = filters.maxConfidence
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
      plan: {
        ...result.plan,
        createdAt: result.plan.createdAt instanceof Date 
          ? result.plan.createdAt 
          : new Date(result.plan.createdAt),
        steps: result.plan.steps.map(step => ({ ...step })),
      },
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    })) as PlannerAgentOutput[]
  }

  /**
   * Get outputs by agent chain
   */
  async getByAgentChain(agentChain: string[]): Promise<PlannerAgentOutput[]> {
    const collection = await getCollection<PlannerAgentOutput>(COLLECTION_NAME)

    const results = await collection
      .find({
        'requestContext.agentChain': { $all: agentChain },
        agentName: 'planner-agent',
      })
      .sort({ timestamp: -1 })
      .toArray()

    return results.map((result) => ({
      ...result,
      timestamp: result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp),
      plan: {
        ...result.plan,
        createdAt: result.plan.createdAt instanceof Date 
          ? result.plan.createdAt 
          : new Date(result.plan.createdAt),
        steps: result.plan.steps.map(step => ({ ...step })),
      },
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    })) as PlannerAgentOutput[]
  }

  /**
   * Search outputs by text (searches plan goal text)
   */
  async search(query: string): Promise<PlannerAgentOutput[]> {
    const collection = await getCollection<PlannerAgentOutput>(COLLECTION_NAME)

    const results = await collection
      .find({
        agentName: 'planner-agent',
        $text: { $search: query },
      })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray()

    return results.map((result) => ({
      ...result,
      timestamp: result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp),
      plan: {
        ...result.plan,
        createdAt: result.plan.createdAt instanceof Date 
          ? result.plan.createdAt 
          : new Date(result.plan.createdAt),
        steps: result.plan.steps.map(step => ({ ...step })),
      },
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    })) as PlannerAgentOutput[]
  }

  /**
   * Delete an output by request ID
   */
  async deleteByRequestId(requestId: string): Promise<void> {
    const collection = await getCollection(COLLECTION_NAME)
    await collection.deleteOne({ requestId, agentName: 'planner-agent' })
  }

  /**
   * Count total outputs
   */
  async count(): Promise<number> {
    const collection = await getCollection(COLLECTION_NAME)
    return collection.countDocuments({ agentName: 'planner-agent' })
  }

  /**
   * Clear all planner outputs
   */
  async clear(): Promise<void> {
    const collection = await getCollection(COLLECTION_NAME)
    await collection.deleteMany({ agentName: 'planner-agent' })
  }
}

// Singleton instance
let storageInstance: PlannerOutputsStorage | null = null

/**
 * Get the singleton PlannerOutputsStorage instance
 */
export function getPlannerOutputsStorage(): PlannerOutputsStorage {
  if (!storageInstance) {
    storageInstance = new PlannerOutputsStorage()
  }
  return storageInstance
}


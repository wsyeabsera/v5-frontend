/**
 * Request ID Storage using MongoDB
 * 
 * Provides CRUD operations for RequestContext objects using MongoDB.
 * Replaces IndexedDB storage for server-side accessibility.
 */

import { getCollection, ensureIndexes } from './mongodb-client'
import { RequestContext } from '@/types'

const COLLECTION_NAME = 'requests'

/**
 * Request MongoDB Storage Class
 */
export class RequestMongoDBStorage {
  /**
   * Ensure indexes are created (call once on startup)
   */
  async initialize(): Promise<void> {
    await ensureIndexes()
  }

  /**
   * Save a RequestContext to MongoDB
   */
  async save(context: RequestContext): Promise<void> {
    const collection = await getCollection<RequestContext & { _id?: any }>(
      COLLECTION_NAME
    )

    // Convert Date to proper format (MongoDB handles Date objects)
    const doc: any = {
      requestId: context.requestId,
      agentChain: context.agentChain,
      status: context.status,
      createdAt: context.createdAt instanceof Date ? context.createdAt : new Date(context.createdAt),
      updatedAt: new Date(),
    }

    // Add optional fields
    if (context.userQuery !== undefined) {
      doc.userQuery = context.userQuery
    }

    // Upsert by requestId (unique)
    await collection.updateOne(
      { requestId: context.requestId },
      { $set: doc },
      { upsert: true }
    )
  }

  /**
   * Get a RequestContext by ID
   */
  async get(id: string): Promise<RequestContext | null> {
    const collection = await getCollection<RequestContext>(COLLECTION_NAME)

    const result = await collection.findOne({ requestId: id })

    if (!result) {
      return null
    }

    // Ensure createdAt is a Date
    return {
      ...result,
      createdAt: result.createdAt instanceof Date ? result.createdAt : new Date(result.createdAt),
    }
  }

  /**
   * Get all RequestContexts
   */
  async getAll(): Promise<RequestContext[]> {
    const collection = await getCollection<RequestContext>(COLLECTION_NAME)

    const results = await collection.find({}).sort({ createdAt: -1 }).toArray()

    return results.map((result) => ({
      ...result,
      createdAt: result.createdAt instanceof Date ? result.createdAt : new Date(result.createdAt),
    }))
  }

  /**
   * Get RequestContexts by status
   */
  async getByStatus(status: RequestContext['status']): Promise<RequestContext[]> {
    const collection = await getCollection<RequestContext>(COLLECTION_NAME)

    const results = await collection
      .find({ status })
      .sort({ createdAt: -1 })
      .toArray()

    return results.map((result) => ({
      ...result,
      createdAt: result.createdAt instanceof Date ? result.createdAt : new Date(result.createdAt),
    }))
  }

  /**
   * Get RequestContexts by date range
   */
  async getByDateRange(start?: Date, end?: Date): Promise<RequestContext[]> {
    const collection = await getCollection<RequestContext>(COLLECTION_NAME)

    const query: any = {}
    if (start || end) {
      query.createdAt = {}
      if (start) {
        query.createdAt.$gte = start instanceof Date ? start : new Date(start)
      }
      if (end) {
        query.createdAt.$lte = end instanceof Date ? end : new Date(end)
      }
    }

    const results = await collection.find(query).sort({ createdAt: -1 }).toArray()

    return results.map((result) => ({
      ...result,
      createdAt: result.createdAt instanceof Date ? result.createdAt : new Date(result.createdAt),
    }))
  }

  /**
   * Delete a RequestContext by ID
   */
  async delete(id: string): Promise<void> {
    const collection = await getCollection(COLLECTION_NAME)
    await collection.deleteOne({ requestId: id })
  }

  /**
   * Clear all RequestContexts
   */
  async clear(): Promise<void> {
    const collection = await getCollection(COLLECTION_NAME)
    await collection.deleteMany({})
  }

  /**
   * Count total RequestContexts
   */
  async count(): Promise<number> {
    const collection = await getCollection(COLLECTION_NAME)
    return collection.countDocuments({})
  }

  /**
   * Search RequestContexts by query string (searches requestId and userQuery)
   */
  async search(query: string): Promise<RequestContext[]> {
    const collection = await getCollection<RequestContext>(COLLECTION_NAME)
    const searchRegex = { $regex: query, $options: 'i' }

    const results = await collection
      .find({
        $or: [
          { requestId: searchRegex },
          { userQuery: searchRegex },
        ],
      })
      .sort({ createdAt: -1 })
      .toArray()

    return results.map((result) => ({
      ...result,
      createdAt: result.createdAt instanceof Date ? result.createdAt : new Date(result.createdAt),
    }))
  }

  /**
   * Get RequestContexts filtered by agent name in chain
   */
  async getByAgentName(agentName: string): Promise<RequestContext[]> {
    const collection = await getCollection<RequestContext>(COLLECTION_NAME)

    const results = await collection
      .find({ agentChain: agentName })
      .sort({ createdAt: -1 })
      .toArray()

    return results.map((result) => ({
      ...result,
      createdAt: result.createdAt instanceof Date ? result.createdAt : new Date(result.createdAt),
    }))
  }
}

// Singleton instance
let storageInstance: RequestMongoDBStorage | null = null

/**
 * Get the singleton RequestMongoDBStorage instance
 */
export function getRequestMongoDBStorage(): RequestMongoDBStorage {
  if (!storageInstance) {
    storageInstance = new RequestMongoDBStorage()
  }
  return storageInstance
}


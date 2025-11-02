/**
 * MongoDB Client Wrapper
 * 
 * Singleton MongoDB client for server-side operations.
 * Provides connection management and database/collection access.
 */

import { MongoClient, Db, Collection, Document } from 'mongodb'

let client: MongoClient | null = null
let db: Db | null = null

/**
 * Get or create MongoDB client
 * 
 * Singleton pattern - reuses the same client instance.
 * 
 * @returns MongoClient instance
 */
export async function getMongoClient(): Promise<MongoClient> {
  if (!client) {
    const uri = process.env.MONGODB_URI
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is required')
    }

    client = new MongoClient(uri, {
      // Connection pool options
      maxPoolSize: 10,
      minPoolSize: 1,
    })

    try {
      await client.connect()
      console.log('[MongoDB] Connected to MongoDB')
    } catch (error) {
      console.error('[MongoDB] Failed to connect:', error)
      client = null
      throw error
    }
  }

  return client
}

/**
 * Get database instance
 * 
 * @param dbName - Optional database name (defaults to env var or 'v5-clear-ai')
 * @returns Db instance
 */
export async function getDatabase(dbName?: string): Promise<Db> {
  if (!db || dbName) {
    const client = await getMongoClient()
    const databaseName = dbName || process.env.MONGODB_DB_NAME || 'v5-clear-ai'
    db = client.db(databaseName)
  }
  return db
}

/**
 * Get collection instance
 * 
 * @param collectionName - Name of the collection
 * @param dbName - Optional database name
 * @returns Collection instance
 */
export async function getCollection<T extends Document = Document>(
  collectionName: string,
  dbName?: string
): Promise<Collection<T>> {
  const database = await getDatabase(dbName)
  return database.collection<T>(collectionName)
}

/**
 * Close MongoDB connection
 * 
 * Useful for cleanup in tests or shutdown scenarios.
 */
export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close()
    client = null
    db = null
    console.log('[MongoDB] Connection closed')
  }
}

/**
 * Ensure indexes exist for requests collection
 * 
 * Creates necessary indexes for optimal query performance.
 */
export async function ensureIndexes(): Promise<void> {
  try {
    const collection = await getCollection('requests')
    
    // Create indexes
    await collection.createIndex({ requestId: 1 }, { unique: true })
    await collection.createIndex({ createdAt: -1 }) // Descending for newest first
    await collection.createIndex({ status: 1 })
    await collection.createIndex({ agentChain: 1 })
    
    console.log('[MongoDB] Indexes ensured for requests collection')
  } catch (error) {
    console.error('[MongoDB] Failed to create indexes:', error)
    // Don't throw - indexes might already exist
  }
}

/**
 * Test MongoDB connection
 * 
 * @returns true if connection is healthy, false otherwise
 */
export async function testConnection(): Promise<boolean> {
  try {
    const client = await getMongoClient()
    await client.db('admin').command({ ping: 1 })
    return true
  } catch {
    return false
  }
}


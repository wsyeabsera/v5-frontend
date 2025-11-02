import { IndexedDBWrapper, IndexedDBConfig } from './indexed-db';
import { RequestContext } from '@/types';

/**
 * Request ID storage layer using IndexedDB
 * 
 * Provides CRUD operations for RequestContext objects with query capabilities
 */
export class RequestIdStorage {
  private db: IndexedDBWrapper;
  private storeName = 'requests';

  constructor() {
    const config: IndexedDBConfig = {
      dbName: 'v5-clear-ai-db',
      version: 1,
      stores: [
        {
          name: this.storeName,
          keyPath: 'requestId',
          indexes: [
            { name: 'status', keyPath: 'status', unique: false },
            { name: 'createdAt', keyPath: 'createdAt', unique: false },
            { name: 'agentChain', keyPath: 'agentChain', unique: false },
          ],
        },
      ],
    };

    this.db = new IndexedDBWrapper(config);
  }

  /**
   * Save a RequestContext to IndexedDB
   */
  async save(context: RequestContext): Promise<void> {
    // Serialize Date to timestamp for IndexedDB
    const serialized = {
      ...context,
      createdAt: context.createdAt.getTime(),
    };
    await this.db.put(this.storeName, serialized);
  }

  /**
   * Get a RequestContext by ID
   */
  async get(id: string): Promise<RequestContext | null> {
    const result = await this.db.get<RequestContext & { createdAt: number }>(
      this.storeName,
      id
    );
    
    if (!result) {
      return null;
    }

    // Deserialize timestamp back to Date
    return {
      ...result,
      createdAt: new Date(result.createdAt),
    };
  }

  /**
   * Get all RequestContexts
   */
  async getAll(): Promise<RequestContext[]> {
    const results = await this.db.getAll<
      RequestContext & { createdAt: number }
    >(this.storeName);

    // Deserialize timestamps back to Dates
    return results.map((result) => ({
      ...result,
      createdAt: new Date(result.createdAt),
    }));
  }

  /**
   * Get RequestContexts by status
   */
  async getByStatus(status: RequestContext['status']): Promise<RequestContext[]> {
    const results = await this.db.queryByIndex<
      RequestContext & { createdAt: number }
    >(this.storeName, 'status', status);

    return results.map((result) => ({
      ...result,
      createdAt: new Date(result.createdAt),
    }));
  }

  /**
   * Get RequestContexts by date range
   */
  async getByDateRange(start?: Date, end?: Date): Promise<RequestContext[]> {
    const range = IndexedDBWrapper.createDateRange(
      start ? new Date(start.getTime()) : undefined,
      end ? new Date(end.getTime()) : undefined
    );

    if (!range) {
      // No range specified, return all
      return this.getAll();
    }

    // Query by createdAt index
    const results = await this.db.queryByIndexRange<
      RequestContext & { createdAt: number }
    >(this.storeName, 'createdAt', range);

    return results.map((result) => ({
      ...result,
      createdAt: new Date(result.createdAt),
    }));
  }

  /**
   * Delete a RequestContext by ID
   */
  async delete(id: string): Promise<void> {
    await this.db.delete(this.storeName, id);
  }

  /**
   * Clear all RequestContexts
   */
  async clear(): Promise<void> {
    await this.db.clear(this.storeName);
  }

  /**
   * Count total RequestContexts
   */
  async count(): Promise<number> {
    return this.db.count(this.storeName);
  }

  /**
   * Search RequestContexts by query string (searches requestId and userQuery)
   */
  async search(query: string): Promise<RequestContext[]> {
    const all = await this.getAll();
    const lowerQuery = query.toLowerCase();

    return all.filter(
      (context) =>
        context.requestId.toLowerCase().includes(lowerQuery) ||
        (context.userQuery && context.userQuery.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get RequestContexts filtered by agent name in chain
   */
  async getByAgentName(agentName: string): Promise<RequestContext[]> {
    const all = await this.getAll();
    return all.filter((context) => context.agentChain.includes(agentName));
  }
}

// Singleton instance
let storageInstance: RequestIdStorage | null = null;

/**
 * Get the singleton RequestIdStorage instance
 */
export function getRequestIdStorage(): RequestIdStorage {
  if (!storageInstance) {
    storageInstance = new RequestIdStorage();
  }
  return storageInstance;
}


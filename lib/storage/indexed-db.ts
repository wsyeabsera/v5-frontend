/**
 * Reusable IndexedDB wrapper library
 * 
 * Provides generic database operations for IndexedDB with type-safe operations,
 * error handling, and connection management.
 */

export interface IndexedDBConfig {
  dbName: string
  version: number
  stores: Array<{
    name: string
    keyPath: string
    indexes?: Array<{
      name: string
      keyPath: string | string[]
      unique?: boolean
    }>
  }>
}

export class IndexedDBWrapper {
  private db: IDBDatabase | null = null
  private config: IndexedDBConfig

  constructor(config: IndexedDBConfig) {
    this.config = config
  }

  /**
   * Open database connection
   */
  async open(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version)

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores and indexes
        this.config.stores.forEach((storeConfig) => {
          if (!db.objectStoreNames.contains(storeConfig.name)) {
            const objectStore = db.createObjectStore(storeConfig.name, {
              keyPath: storeConfig.keyPath,
            })

            // Create indexes
            storeConfig.indexes?.forEach((indexConfig) => {
              objectStore.createIndex(indexConfig.name, indexConfig.keyPath, {
                unique: indexConfig.unique || false,
              })
            })
          }
        })
      }
    })
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  /**
   * Get a single record by key
   */
  async get<T>(storeName: string, key: string): Promise<T | null> {
    const db = await this.open()
    const transaction = db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)

    return new Promise((resolve, reject) => {
      const request = store.get(key)

      request.onerror = () => {
        reject(new Error(`Failed to get record: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        resolve((request.result as T) || null)
      }
    })
  }

  /**
   * Get all records from a store
   */
  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.open()
    const transaction = db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)

    return new Promise((resolve, reject) => {
      const request = store.getAll()

      request.onerror = () => {
        reject(new Error(`Failed to get all records: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        resolve((request.result || []) as T[])
      }
    })
  }

  /**
   * Put (insert or update) a record
   */
  async put<T>(storeName: string, data: T): Promise<void> {
    const db = await this.open()
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)

    return new Promise((resolve, reject) => {
      const request = store.put(data)

      request.onerror = () => {
        reject(new Error(`Failed to put record: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        resolve()
      }
    })
  }

  /**
   * Delete a record by key
   */
  async delete(storeName: string, key: string): Promise<void> {
    const db = await this.open()
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)

    return new Promise((resolve, reject) => {
      const request = store.delete(key)

      request.onerror = () => {
        reject(new Error(`Failed to delete record: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        resolve()
      }
    })
  }

  /**
   * Clear all records from a store
   */
  async clear(storeName: string): Promise<void> {
    const db = await this.open()
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)

    return new Promise((resolve, reject) => {
      const request = store.clear()

      request.onerror = () => {
        reject(new Error(`Failed to clear store: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        resolve()
      }
    })
  }

  /**
   * Count records in a store
   */
  async count(storeName: string): Promise<number> {
    const db = await this.open()
    const transaction = db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)

    return new Promise((resolve, reject) => {
      const request = store.count()

      request.onerror = () => {
        reject(new Error(`Failed to count records: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        resolve(request.result)
      }
    })
  }

  /**
   * Query records by index
   */
  async queryByIndex<T>(
    storeName: string,
    indexName: string,
    value: any
  ): Promise<T[]> {
    const db = await this.open()
    const transaction = db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)
    const index = store.index(indexName)

    return new Promise((resolve, reject) => {
      const request = index.getAll(value)

      request.onerror = () => {
        reject(new Error(`Failed to query by index: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        resolve((request.result || []) as T[])
      }
    })
  }

  /**
   * Query records by index range
   */
  async queryByIndexRange<T>(
    storeName: string,
    indexName: string,
    range: IDBKeyRange
  ): Promise<T[]> {
    const db = await this.open()
    const transaction = db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)
    const index = store.index(indexName)

    return new Promise((resolve, reject) => {
      const request = index.getAll(range)

      request.onerror = () => {
        reject(new Error(`Failed to query by range: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        resolve((request.result || []) as T[])
      }
    })
  }

  /**
   * Helper to create IDBKeyRange for date ranges
   */
  static createDateRange(start?: Date, end?: Date): IDBKeyRange | null {
    if (start && end) {
      return IDBKeyRange.bound(start.getTime(), end.getTime())
    } else if (start) {
      return IDBKeyRange.lowerBound(start.getTime())
    } else if (end) {
      return IDBKeyRange.upperBound(end.getTime())
    }
    return null
  }
}


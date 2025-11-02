/**
 * Pinecone Client
 * 
 * Singleton client for Pinecone operations.
 * Initialize once and reuse across the application.
 */

import { Pinecone } from '@pinecone-database/pinecone'

let pineconeClient: Pinecone | null = null

/**
 * Get or create Pinecone client
 * 
 * This is a singleton pattern - we only want one client instance.
 * 
 * @returns Pinecone client instance
 */
export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY environment variable is required')
    }

    pineconeClient = new Pinecone({
      apiKey,
    })
  }

  return pineconeClient
}

/**
 * Get Pinecone index
 * 
 * @param indexName - Name of the index (default: 'complexity-examples')
 * @returns Index instance
 */
export function getPineconeIndex(indexName: string = 'complexity-examples') {
  const client = getPineconeClient()
  return client.index(indexName)
}


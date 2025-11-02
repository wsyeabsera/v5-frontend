/**
 * Ollama Embedding Service
 * 
 * Provides functions to generate text embeddings using Ollama's local embedding model.
 * Uses the official Ollama SDK for reliable connections.
 */

import { Ollama } from 'ollama'

const OLLAMA_HOST = process.env.OLLAMA_URL || 'http://localhost:11434'
const EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text'

let ollamaClient: Ollama | null = null

/**
 * Get or create Ollama client instance
 */
function getOllamaClient(): Ollama {
  if (!ollamaClient) {
    ollamaClient = new Ollama({ host: OLLAMA_HOST })
  }
  return ollamaClient
}

/**
 * Generate embedding for a single text
 * 
 * @param text - Text to generate embedding for
 * @returns Embedding vector (array of numbers)
 * 
 * @throws Error if Ollama API fails or model is unavailable
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty')
  }

  try {
    const client = getOllamaClient()
    const response = await client.embeddings({
      model: EMBEDDING_MODEL,
      prompt: text,
    })

    if (!response.embedding || response.embedding.length === 0) {
      throw new Error('Empty embedding returned from Ollama')
    }

    return response.embedding
  } catch (error: any) {
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed')) {
      throw new Error(
        `Failed to connect to Ollama at ${OLLAMA_HOST}. Make sure Ollama is running.`
      )
    }
    throw new Error(`Failed to generate embedding: ${error.message || error}`)
  }
}

/**
 * Generate embeddings for multiple texts (batch)
 * 
 * More efficient than calling generateEmbedding multiple times sequentially.
 * 
 * @param texts - Array of texts to embed
 * @returns Array of embedding vectors
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return []
  }

  // Generate embeddings in parallel
  const embeddings = await Promise.all(
    texts.map((text) => generateEmbedding(text))
  )

  return embeddings
}

/**
 * Test Ollama connection
 * 
 * Useful for health checks and verifying Ollama is available.
 * 
 * @returns true if Ollama is reachable, false otherwise
 */
export async function testOllamaConnection(): Promise<boolean> {
  try {
    const client = getOllamaClient()
    // Try to list models as a connection test
    await client.list()
    return true
  } catch {
    return false
  }
}


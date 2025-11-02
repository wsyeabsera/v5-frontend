/**
 * Pinecone Vector Store for Thought Examples
 * 
 * Stores and queries thought examples using Pinecone for semantic search.
 * Examples teach the Thought Agent successful reasoning patterns.
 */

import { getPineconeIndex } from './client'
import { ThoughtExample } from '@/types'
import { generateEmbedding } from '@/lib/ollama/embeddings'

const INDEX_NAME = process.env.PINECONE_THOUGHT_INDEX || 'thought-examples'
const NAMESPACE = 'examples'

/**
 * Store a thought example in Pinecone
 * 
 * @param example - Example to store (without embedding - will be generated)
 * @returns The stored example with generated ID
 */
export async function storeThoughtExample(
  example: Omit<ThoughtExample, 'id' | 'embedding'>
): Promise<ThoughtExample> {
  // Generate embedding for the query
  const embedding = await generateEmbedding(example.query)

  // Generate ID
  const id = `thought-example-${Date.now()}-${Math.random().toString(36).substring(7)}`

  // Prepare metadata for Pinecone
  const metadata: Record<string, any> = {
    query: example.query,
    reasoning: example.reasoning,
    approaches: JSON.stringify(example.approaches),
    constraints: JSON.stringify(example.constraints),
    assumptions: JSON.stringify(example.assumptions),
    uncertainties: JSON.stringify(example.uncertainties),
    recommendedTools: JSON.stringify(example.recommendedTools),
    successRating: example.successRating,
    createdAt: example.createdAt,
    updatedAt: example.updatedAt,
    usageCount: example.usageCount,
  }

  if (example.tags && example.tags.length > 0) {
    metadata.tags = JSON.stringify(example.tags)
  }

  // Get index and namespace
  const index = getPineconeIndex(INDEX_NAME)
  const ns = index.namespace(NAMESPACE)

  // Upsert to Pinecone
  await ns.upsert([
    {
      id,
      values: embedding,
      metadata,
    },
  ])

  return {
    ...example,
    id,
    embedding,
  }
}

/**
 * Query Pinecone for similar thought examples
 * 
 * Uses semantic search to find examples similar to the query.
 * 
 * @param queryEmbedding - Embedding vector of the query
 * @param topK - Number of results to return (default: 5)
 * @param minScore - Minimum similarity score (default: 0)
 * @returns Array of similar examples with similarity scores
 */
export async function querySimilarThoughtExamples(
  queryEmbedding: number[],
  topK: number = 5,
  minScore: number = 0
): Promise<Array<{ example: ThoughtExample; similarity: number }>> {
  const index = getPineconeIndex(INDEX_NAME)
  const ns = index.namespace(NAMESPACE)

  // Query Pinecone
  const queryResponse = await ns.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
  })

  // Transform results to ThoughtExample format
  const results: Array<{ example: ThoughtExample; similarity: number }> = []

  for (const match of queryResponse.matches || []) {
    const score = match.score || 0
    if (score < minScore) continue

    const metadata = match.metadata || {}

    // Reconstruct arrays from JSON strings
    const parseArray = (value: any): string[] => {
      if (!value) return []
      try {
        if (typeof value === 'string') {
          return JSON.parse(value)
        }
        return Array.isArray(value) ? value : []
      } catch {
        return []
      }
    }

    const example: ThoughtExample = {
      id: match.id,
      query: typeof metadata.query === 'string' ? metadata.query : '',
      embedding: [], // Not stored in metadata
      reasoning: typeof metadata.reasoning === 'string' ? metadata.reasoning : '',
      approaches: parseArray(metadata.approaches),
      constraints: parseArray(metadata.constraints),
      assumptions: parseArray(metadata.assumptions),
      uncertainties: parseArray(metadata.uncertainties),
      recommendedTools: parseArray(metadata.recommendedTools),
      successRating: typeof metadata.successRating === 'number' ? metadata.successRating : 0,
      tags: parseArray(metadata.tags),
      createdAt: typeof metadata.createdAt === 'string' ? metadata.createdAt : new Date().toISOString(),
      updatedAt: typeof metadata.updatedAt === 'string' ? metadata.updatedAt : new Date().toISOString(),
      usageCount: typeof metadata.usageCount === 'number' ? metadata.usageCount : 0,
    }

    results.push({
      example,
      similarity: score,
    })
  }

  return results
}

/**
 * Get all thought examples from Pinecone
 * 
 * Note: This requires fetching all vectors. For large datasets, consider pagination.
 * 
 * @returns Array of all examples
 */
export async function getAllThoughtExamples(): Promise<ThoughtExample[]> {
  const index = getPineconeIndex(INDEX_NAME)
  const ns = index.namespace(NAMESPACE)

  // Query with a zero vector to get all (not ideal but works for small datasets)
  const queryResponse = await ns.query({
    vector: new Array(768).fill(0), // nomic-embed-text produces 768-dim vectors
    topK: 10000, // Adjust based on expected dataset size
    includeMetadata: true,
  })

  const examples: ThoughtExample[] = []

  const parseArray = (value: any): string[] => {
    if (!value) return []
    try {
      if (typeof value === 'string') {
        return JSON.parse(value)
      }
      return Array.isArray(value) ? value : []
    } catch {
      return []
    }
  }

  for (const match of queryResponse.matches || []) {
    const metadata = match.metadata || {}

    examples.push({
      id: match.id,
      query: typeof metadata.query === 'string' ? metadata.query : '',
      embedding: [],
      reasoning: typeof metadata.reasoning === 'string' ? metadata.reasoning : '',
      approaches: parseArray(metadata.approaches),
      constraints: parseArray(metadata.constraints),
      assumptions: parseArray(metadata.assumptions),
      uncertainties: parseArray(metadata.uncertainties),
      recommendedTools: parseArray(metadata.recommendedTools),
      successRating: typeof metadata.successRating === 'number' ? metadata.successRating : 0,
      tags: parseArray(metadata.tags),
      createdAt: typeof metadata.createdAt === 'string' ? metadata.createdAt : new Date().toISOString(),
      updatedAt: typeof metadata.updatedAt === 'string' ? metadata.updatedAt : new Date().toISOString(),
      usageCount: typeof metadata.usageCount === 'number' ? metadata.usageCount : 0,
    })
  }

  return examples
}

/**
 * Update a thought example's usage count
 * 
 * @param exampleId - ID of the example to update
 */
export async function incrementThoughtExampleUsage(exampleId: string): Promise<void> {
  const index = getPineconeIndex(INDEX_NAME)
  const ns = index.namespace(NAMESPACE)

  // Fetch current metadata
  const fetchResponse = await ns.fetch([exampleId])
  
  // Pinecone v1+ returns records array
  const record = Array.isArray(fetchResponse) 
    ? fetchResponse.find(r => r.id === exampleId)
    : (fetchResponse as any).vectors?.[exampleId] || (fetchResponse as any).records?.[exampleId]

  if (!record?.metadata) {
    throw new Error(`Example ${exampleId} not found`)
  }

  // Update usage count
  const updatedMetadata = {
    ...record.metadata,
    usageCount: (typeof record.metadata.usageCount === 'number' ? record.metadata.usageCount : 0) + 1,
    updatedAt: new Date().toISOString(),
  }

  // Upsert with updated metadata
  await ns.upsert([
    {
      id: exampleId,
      values: record.values, // Keep existing embedding
      metadata: updatedMetadata,
    },
  ])
}

/**
 * Delete a thought example
 * 
 * @param exampleId - ID of the example to delete
 */
export async function deleteThoughtExample(exampleId: string): Promise<void> {
  const index = getPineconeIndex(INDEX_NAME)
  const ns = index.namespace(NAMESPACE)
  await ns.deleteOne(exampleId)
}


/**
 * Pinecone Vector Store for Complexity Examples
 * 
 * Stores and queries complexity examples using Pinecone for semantic search.
 * Examples include query text, embeddings, and complexity configurations.
 */

import { getPineconeIndex } from './client'
import { ComplexityExample, ComplexityConfig } from '@/types'
import { generateEmbedding } from '@/lib/ollama/embeddings'

const INDEX_NAME = process.env.PINECONE_COMPLEXITY_INDEX || 'complexity-examples'
const NAMESPACE = 'examples'

/**
 * Store a complexity example in Pinecone
 * 
 * @param example - Example to store (without embedding - will be generated)
 * @returns The stored example with generated ID
 */
export async function storeComplexityExample(
  example: Omit<ComplexityExample, 'id' | 'embedding'>
): Promise<ComplexityExample> {
  // Generate embedding for the query
  const embedding = await generateEmbedding(example.query)

  // Generate ID
  const id = `example-${Date.now()}-${Math.random().toString(36).substring(7)}`

  // Prepare metadata for Pinecone
  const metadata: Record<string, any> = {
    query: example.query,
    complexityScore: example.config.complexityScore,
    reasoningPasses: example.config.reasoningPasses,
    createdAt: example.createdAt,
    updatedAt: example.updatedAt,
    usageCount: example.usageCount,
  }

  if (example.config.confidence !== undefined) {
    metadata.confidence = example.config.confidence
  }

  if (example.config.tags && example.config.tags.length > 0) {
    metadata.tags = JSON.stringify(example.config.tags)
  }

  if (example.config.agentHints && example.config.agentHints.length > 0) {
    metadata.agentHints = JSON.stringify(example.config.agentHints)
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
 * Query Pinecone for similar complexity examples
 * 
 * Uses semantic search to find examples similar to the query.
 * 
 * @param queryEmbedding - Embedding vector of the query
 * @param topK - Number of results to return (default: 5)
 * @param minScore - Minimum similarity score (default: 0)
 * @returns Array of similar examples with similarity scores
 */
export async function querySimilarExamples(
  queryEmbedding: number[],
  topK: number = 5,
  minScore: number = 0
): Promise<Array<{ example: ComplexityExample; similarity: number }>> {
  const index = getPineconeIndex(INDEX_NAME)
  const ns = index.namespace(NAMESPACE)

  // Query Pinecone
  const queryResponse = await ns.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
  })

  // Transform results to ComplexityExample format
  const results: Array<{ example: ComplexityExample; similarity: number }> = []

  for (const match of queryResponse.matches || []) {
    const score = match.score || 0
    if (score < minScore) continue

    const metadata = match.metadata || {}

    // Reconstruct config
    const config: ComplexityConfig = {
      complexityScore: typeof metadata.complexityScore === 'number' ? metadata.complexityScore : 0,
      reasoningPasses: typeof metadata.reasoningPasses === 'number' ? metadata.reasoningPasses : 1,
    }

    if (metadata.confidence !== undefined) {
      config.confidence = typeof metadata.confidence === 'number' ? metadata.confidence : undefined
    }

    if (metadata.tags) {
      try {
        config.tags = JSON.parse(metadata.tags as string)
      } catch {
        config.tags = []
      }
    }

    if (metadata.agentHints) {
      try {
        config.agentHints = JSON.parse(metadata.agentHints as string)
      } catch {
        config.agentHints = []
      }
    }

    // Note: We don't store embeddings in results, but we can fetch them if needed
    const example: ComplexityExample = {
      id: match.id,
      query: typeof metadata.query === 'string' ? metadata.query : '',
      embedding: [], // Not stored in metadata, would need separate storage
      config,
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
 * Get all complexity examples from Pinecone
 * 
 * Note: This requires fetching all vectors. For large datasets, consider pagination.
 * 
 * @returns Array of all examples
 */
export async function getAllExamples(): Promise<ComplexityExample[]> {
  const index = getPineconeIndex(INDEX_NAME)
  const ns = index.namespace(NAMESPACE)

  // Query with a zero vector to get all (not ideal but works for small datasets)
  // For better performance, consider using fetch() with IDs or listing
  const queryResponse = await ns.query({
    vector: new Array(768).fill(0), // nomic-embed-text produces 768-dim vectors
    topK: 10000, // Adjust based on expected dataset size
    includeMetadata: true,
  })

  const examples: ComplexityExample[] = []

  for (const match of queryResponse.matches || []) {
    const metadata = match.metadata || {}

    const config: ComplexityConfig = {
      complexityScore: typeof metadata.complexityScore === 'number' ? metadata.complexityScore : 0,
      reasoningPasses: typeof metadata.reasoningPasses === 'number' ? metadata.reasoningPasses : 1,
    }

    if (metadata.confidence !== undefined) {
      config.confidence = typeof metadata.confidence === 'number' ? metadata.confidence : undefined
    }

    if (metadata.tags) {
      try {
        config.tags = JSON.parse(metadata.tags as string)
      } catch {
        config.tags = []
      }
    }

    if (metadata.agentHints) {
      try {
        config.agentHints = JSON.parse(metadata.agentHints as string)
      } catch {
        config.agentHints = []
      }
    }

    examples.push({
      id: match.id,
      query: typeof metadata.query === 'string' ? metadata.query : '',
      embedding: [], // Not stored, would need to regenerate if needed
      config,
      createdAt: typeof metadata.createdAt === 'string' ? metadata.createdAt : new Date().toISOString(),
      updatedAt: typeof metadata.updatedAt === 'string' ? metadata.updatedAt : new Date().toISOString(),
      usageCount: typeof metadata.usageCount === 'number' ? metadata.usageCount : 0,
    })
  }

  return examples
}

/**
 * Update a complexity example's usage count
 * 
 * @param exampleId - ID of the example to update
 */
export async function incrementUsageCount(exampleId: string): Promise<void> {
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
 * Delete a complexity example
 * 
 * @param exampleId - ID of the example to delete
 */
export async function deleteComplexityExample(exampleId: string): Promise<void> {
  const index = getPineconeIndex(INDEX_NAME)
  const ns = index.namespace(NAMESPACE)

  await ns.deleteOne(exampleId)
}


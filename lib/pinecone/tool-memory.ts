/**
 * Pinecone Vector Store for Tool Memory
 * 
 * Stores and queries tool usage patterns using Pinecone for semantic search.
 * Enables the Tool Memory Agent to learn from past tool usage and provide recommendations.
 */

import { getPineconeIndex } from './client'
import { ToolMemoryExample } from '@/types'
import { generateEmbedding } from '@/lib/ollama/embeddings'

const INDEX_NAME = process.env.PINECONE_TOOL_MEMORY_INDEX || 'tool-memory'
const NAMESPACE = 'tool-usage'

/**
 * Store a tool memory example in Pinecone
 * 
 * @param example - Example to store (without embedding - will be generated)
 * @returns The stored example with generated ID
 */
export async function storeToolMemoryExample(
  example: Omit<ToolMemoryExample, 'id' | 'embedding'>
): Promise<ToolMemoryExample> {
  // Generate embedding based on entry type
  let embedding: number[]
  
  if (example.entryType === 'metadata') {
    // For metadata: embed tool/prompt description and parameters
    const text = `Tool: ${example.toolName || ''}, Description: ${example.description || ''}, Parameters: ${example.parameters || ''}`
    embedding = await generateEmbedding(text)
  } else {
    // For usage examples: embed query + tools combination
    const text = `${example.query} ${example.tools.join(' ')}`
    embedding = await generateEmbedding(text)
  }

  // Generate ID
  const id = `tool-memory-${example.entryType}-${Date.now()}-${Math.random().toString(36).substring(7)}`

  // Prepare metadata for Pinecone
  const metadata: Record<string, any> = {
    query: example.query || '',
    tools: JSON.stringify(example.tools),
    toolSequence: JSON.stringify(example.toolSequence),
    complexityScore: example.complexityScore,
    success: example.success,
    entryType: example.entryType,
    successRating: example.successRating,
    createdAt: example.createdAt,
    updatedAt: example.updatedAt,
    usageCount: example.usageCount,
  }

  if (example.toolName) {
    metadata.toolName = example.toolName
  }

  if (example.description) {
    metadata.description = example.description
  }

  if (example.parameters) {
    metadata.parameters = example.parameters
  }

  if (example.mcpPrompts && example.mcpPrompts.length > 0) {
    metadata.mcpPrompts = JSON.stringify(example.mcpPrompts)
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
 * Query Pinecone for similar tool usage patterns
 * 
 * Uses semantic search to find examples similar to the query.
 * 
 * @param queryEmbedding - Embedding vector of the query
 * @param topK - Number of results to return (default: 5)
 * @param minScore - Minimum similarity score (default: 0.5)
 * @param entryType - Optional filter by entry type ('metadata' or 'usage-example')
 * @returns Array of similar examples with similarity scores
 */
export async function querySimilarToolUsage(
  queryEmbedding: number[],
  topK: number = 5,
  minScore: number = 0.5,
  entryType?: 'metadata' | 'usage-example'
): Promise<Array<{ example: ToolMemoryExample; similarity: number }>> {
  const index = getPineconeIndex(INDEX_NAME)
  const ns = index.namespace(NAMESPACE)

  // Build filter if entryType is specified
  const filter = entryType ? { entryType: { $eq: entryType } } : undefined

  const queryResponse = await ns.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
    filter,
  })

  const results: Array<{ example: ToolMemoryExample; similarity: number }> = []

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
    const score = match.score || 0

    if (score < minScore) continue

    const example: ToolMemoryExample = {
      id: match.id,
      query: typeof metadata.query === 'string' ? metadata.query : '',
      embedding: [],
      tools: parseArray(metadata.tools),
      toolSequence: parseArray(metadata.toolSequence),
      complexityScore: typeof metadata.complexityScore === 'number' ? metadata.complexityScore : 0.5,
      success: typeof metadata.success === 'boolean' ? metadata.success : true,
      entryType: (metadata.entryType === 'metadata' || metadata.entryType === 'usage-example')
        ? metadata.entryType
        : 'usage-example',
      successRating: typeof metadata.successRating === 'number' ? metadata.successRating : 0.8,
      createdAt: typeof metadata.createdAt === 'string' ? metadata.createdAt : new Date().toISOString(),
      updatedAt: typeof metadata.updatedAt === 'string' ? metadata.updatedAt : new Date().toISOString(),
      usageCount: typeof metadata.usageCount === 'number' ? metadata.usageCount : 0,
    }

    if (metadata.toolName) {
      example.toolName = String(metadata.toolName)
    }

    if (metadata.description) {
      example.description = String(metadata.description)
    }

    if (metadata.parameters) {
      example.parameters = String(metadata.parameters)
    }

    if (metadata.mcpPrompts) {
      example.mcpPrompts = parseArray(metadata.mcpPrompts)
    }

    results.push({ example, similarity: score })
  }

  return results
}

/**
 * Get all tool memory examples from Pinecone
 * 
 * Note: This requires fetching all vectors. For large datasets, consider pagination.
 * 
 * @returns Array of all examples
 */
export async function getAllToolMemories(): Promise<ToolMemoryExample[]> {
  const index = getPineconeIndex(INDEX_NAME)
  const ns = index.namespace(NAMESPACE)

  // Query with a zero vector to get all (not ideal but works for small datasets)
  const queryResponse = await ns.query({
    vector: new Array(768).fill(0), // nomic-embed-text produces 768-dim vectors
    topK: 10000, // Adjust based on expected dataset size
    includeMetadata: true,
  })

  const examples: ToolMemoryExample[] = []

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

    const example: ToolMemoryExample = {
      id: match.id,
      query: typeof metadata.query === 'string' ? metadata.query : '',
      embedding: [],
      tools: parseArray(metadata.tools),
      toolSequence: parseArray(metadata.toolSequence),
      complexityScore: typeof metadata.complexityScore === 'number' ? metadata.complexityScore : 0.5,
      success: typeof metadata.success === 'boolean' ? metadata.success : true,
      entryType: (metadata.entryType === 'metadata' || metadata.entryType === 'usage-example')
        ? metadata.entryType
        : 'usage-example',
      successRating: typeof metadata.successRating === 'number' ? metadata.successRating : 0.8,
      createdAt: typeof metadata.createdAt === 'string' ? metadata.createdAt : new Date().toISOString(),
      updatedAt: typeof metadata.updatedAt === 'string' ? metadata.updatedAt : new Date().toISOString(),
      usageCount: typeof metadata.usageCount === 'number' ? metadata.usageCount : 0,
    }

    if (metadata.toolName) {
      example.toolName = String(metadata.toolName)
    }

    if (metadata.description) {
      example.description = String(metadata.description)
    }

    if (metadata.parameters) {
      example.parameters = String(metadata.parameters)
    }

    if (metadata.mcpPrompts) {
      example.mcpPrompts = parseArray(metadata.mcpPrompts)
    }

    examples.push(example)
  }

  return examples
}

/**
 * Delete all tool memory examples from Pinecone
 * 
 * This deletes all vectors in the tool-usage namespace (full reset).
 * 
 * @returns Number of vectors deleted
 */
export async function deleteAllToolMemories(): Promise<number> {
  const index = getPineconeIndex(INDEX_NAME)
  const ns = index.namespace(NAMESPACE)

  // First, get all vector IDs
  const allMemories = await getAllToolMemories()
  const ids = allMemories.map(m => m.id)

  if (ids.length === 0) {
    return 0
  }

  // Delete in batches (Pinecone may have batch size limits)
  const batchSize = 100
  let deletedCount = 0

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize)
    await ns.deleteMany(batch)
    deletedCount += batch.length
  }

  return deletedCount
}

/**
 * Update a tool memory example's usage count
 * 
 * @param exampleId - ID of the example to update
 */
export async function incrementToolMemoryUsage(exampleId: string): Promise<void> {
  const index = getPineconeIndex(INDEX_NAME)
  const ns = index.namespace(NAMESPACE)

  // Fetch current example
  const allMemories = await getAllToolMemories()
  const memory = allMemories.find(m => m.id === exampleId)

  if (!memory) {
    throw new Error(`Tool memory example ${exampleId} not found`)
  }

  // Increment usage count
  const updatedUsageCount = memory.usageCount + 1
  const updatedMetadata: Record<string, any> = {
    ...memory,
    usageCount: updatedUsageCount,
    updatedAt: new Date().toISOString(),
  }

  // Remove fields that shouldn't be in metadata
  delete (updatedMetadata as any).id
  delete (updatedMetadata as any).embedding

  // Convert arrays to JSON strings
  if (updatedMetadata.tools) {
    updatedMetadata.tools = JSON.stringify(updatedMetadata.tools)
  }
  if (updatedMetadata.toolSequence) {
    updatedMetadata.toolSequence = JSON.stringify(updatedMetadata.toolSequence)
  }
  if (updatedMetadata.mcpPrompts) {
    updatedMetadata.mcpPrompts = JSON.stringify(updatedMetadata.mcpPrompts)
  }

  // Update in Pinecone
  await ns.upsert([
    {
      id: exampleId,
      values: memory.embedding.length > 0 ? memory.embedding : new Array(768).fill(0), // Keep existing embedding
      metadata: updatedMetadata,
    },
  ])
}

/**
 * Delete a tool memory example
 * 
 * @param exampleId - ID of the example to delete
 */
export async function deleteToolMemoryExample(exampleId: string): Promise<void> {
  const index = getPineconeIndex(INDEX_NAME)
  const ns = index.namespace(NAMESPACE)
  await ns.deleteOne(exampleId)
}


/**
 * Similarity Calculation Utilities
 * 
 * Provides functions for calculating similarity between vectors,
 * particularly cosine similarity for embedding comparisons.
 */

/**
 * Calculate cosine similarity between two vectors
 * 
 * Cosine similarity measures the cosine of the angle between two vectors.
 * Returns a value between -1 and 1, where:
 * - 1 = identical direction (perfect match)
 * - 0 = orthogonal (no similarity)
 * - -1 = opposite direction
 * 
 * For embeddings, values are typically between 0 and 1 (non-negative vectors).
 * 
 * @param vec1 - First vector
 * @param vec2 - Second vector
 * @returns Cosine similarity score (0-1 for embeddings)
 * 
 * @throws Error if vectors have different lengths
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error(
      `Vectors must have the same length: ${vec1.length} vs ${vec2.length}`
    )
  }

  if (vec1.length === 0) {
    return 0
  }

  // Calculate dot product
  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i]
    norm1 += vec1[i] * vec1[i]
    norm2 += vec2[i] * vec2[i]
  }

  // Calculate magnitudes
  const magnitude1 = Math.sqrt(norm1)
  const magnitude2 = Math.sqrt(norm2)

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0
  }

  // Cosine similarity = dot product / (magnitude1 * magnitude2)
  return dotProduct / (magnitude1 * magnitude2)
}

/**
 * Find the most similar example from a list
 * 
 * Calculates similarity between a query embedding and all examples,
 * returning the best match with its similarity score.
 * 
 * @param queryEmbedding - Embedding vector of the query
 * @param examples - Array of examples with embeddings
 * @returns Best match with similarity score, or null if no examples
 */
export function findMostSimilar<T extends { embedding: number[] }>(
  queryEmbedding: number[],
  examples: T[]
): { example: T; similarity: number } | null {
  if (examples.length === 0) {
    return null
  }

  let bestMatch: { example: T; similarity: number } | null = null

  for (const example of examples) {
    const similarity = cosineSimilarity(queryEmbedding, example.embedding)

    if (!bestMatch || similarity > bestMatch.similarity) {
      bestMatch = { example, similarity }
    }
  }

  return bestMatch
}

/**
 * Find all examples above a similarity threshold
 * 
 * Returns all examples sorted by similarity (highest first).
 * 
 * @param queryEmbedding - Embedding vector of the query
 * @param examples - Array of examples with embeddings
 * @param threshold - Minimum similarity threshold (default: 0)
 * @returns Array of matches sorted by similarity (highest first)
 */
export function findSimilarExamples<T extends { embedding: number[] }>(
  queryEmbedding: number[],
  examples: T[],
  threshold: number = 0
): Array<{ example: T; similarity: number }> {
  const matches: Array<{ example: T; similarity: number }> = []

  for (const example of examples) {
    const similarity = cosineSimilarity(queryEmbedding, example.embedding)
    if (similarity >= threshold) {
      matches.push({ example, similarity })
    }
  }

  // Sort by similarity (highest first)
  matches.sort((a, b) => b.similarity - a.similarity)

  return matches
}


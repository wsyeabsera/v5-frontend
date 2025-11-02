/**
 * Semantic Detection Strategy
 * 
 * Uses Ollama embeddings to match user queries against stored examples in Pinecone.
 * This is a pure strategy that performs semantic matching and returns a result.
 */

import { DetectionStrategy, DetectionContext, DetectionResult } from './types'
import { generateEmbedding } from '@/lib/ollama/embeddings'
import { querySimilarExamples } from '@/lib/pinecone/complexity-examples'
import { logger } from '@/utils/logger'

// Similarity threshold for semantic matching
// Higher = stricter matching (only very similar queries match)
const SIMILARITY_THRESHOLD = parseFloat(
  process.env.COMPLEXITY_SIMILARITY_THRESHOLD || '0.75'
)

/**
 * Semantic Detection Strategy
 * 
 * Uses vector embeddings to find similar examples from Pinecone.
 */
export const semanticStrategy: DetectionStrategy = {
  name: 'semantic',

  canUse(context: DetectionContext): boolean {
    // Semantic strategy can always be used (it doesn't require API config)
    // The orchestrator should handle fallback if Pinecone/embeddings fail
    return true
  },

  async detect(context: DetectionContext): Promise<DetectionResult> {
    const { query } = context

    try {
      logger.debug(`[Semantic Strategy] Starting semantic detection for query: "${query.substring(0, 50)}..."`)

      // Generate embedding for user query
      const queryEmbedding = await generateEmbedding(query)

      // Query Pinecone for similar examples
      const similarExamples = await querySimilarExamples(
        queryEmbedding,
        5, // topK
        SIMILARITY_THRESHOLD * 0.9 // Lower minScore for query, we'll filter after
      )

      // Check if we have a good semantic match
      if (similarExamples.length > 0 && similarExamples[0].similarity >= SIMILARITY_THRESHOLD) {
        const bestMatch = similarExamples[0]
        const example = bestMatch.example

        logger.info(`[Semantic Strategy] Found semantic match`, {
          exampleId: example.id,
          similarity: bestMatch.similarity.toFixed(3),
          score: example.config.complexityScore,
          passes: example.config.reasoningPasses
        })

        return {
          score: example.config.complexityScore,
          reasoningPasses: example.config.reasoningPasses,
          confidence: bestMatch.similarity, // Use similarity as confidence
          metadata: {
            matchedExampleId: example.id,
            similarity: bestMatch.similarity,
            usageCount: example.usageCount,
          }
        }
      } else {
        // No good semantic match found
        const bestSimilarity = similarExamples.length > 0 ? similarExamples[0].similarity : 0
        logger.debug(`[Semantic Strategy] No semantic match found`, {
          bestSimilarity: bestSimilarity.toFixed(3),
          threshold: SIMILARITY_THRESHOLD,
          resultsCount: similarExamples.length
        })

        // Return a low-confidence result indicating no match
        // The orchestrator will fall back to other strategies
        throw new Error(`No semantic match found (best similarity: ${bestSimilarity.toFixed(3)}, threshold: ${SIMILARITY_THRESHOLD})`)
      }
    } catch (error: any) {
      logger.warn(`[Semantic Strategy] Semantic detection failed`, {
        error: error.message,
        query: query.substring(0, 50)
      })
      throw error
    }
  },

  getPriority(context: DetectionContext): number {
    // Semantic strategy has high priority (tried first) if no conflicts
    return 100
  }
}


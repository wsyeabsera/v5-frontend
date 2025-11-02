/**
 * Keyword Detection Strategy
 * 
 * Uses keyword-based heuristics to detect query complexity.
 * This is a pure function strategy with no external dependencies.
 */

import { DetectionStrategy, DetectionContext, DetectionResult } from './types'
import { detectComplexityKeyword, extractDetectedKeywords } from '@/lib/agents/complexity-detector-keyword'
import { logger } from '@/utils/logger'

/**
 * Keyword Detection Strategy
 * 
 * Uses heuristics based on keywords, query length, and domain-specific patterns.
 */
export const keywordStrategy: DetectionStrategy = {
  name: 'keyword',

  canUse(context: DetectionContext): boolean {
    // Keyword strategy can always be used (no dependencies)
    return true
  },

  async detect(context: DetectionContext): Promise<DetectionResult> {
    const { query } = context

    logger.debug(`[Keyword Strategy] Starting keyword detection for query: "${query.substring(0, 50)}..."`)

    // Use existing keyword detection function
    const complexity = detectComplexityKeyword(query)
    const detectedKeywords = extractDetectedKeywords(query)

    logger.info(`[Keyword Strategy] Detection complete`, {
      score: complexity.score.toFixed(3),
      passes: complexity.reasoningPasses,
      keywordsCount: detectedKeywords.length
    })

    return {
      score: complexity.score,
      reasoningPasses: complexity.reasoningPasses,
      confidence: 0.7, // Keyword detection has moderate confidence
      metadata: {
        detectedKeywords,
        factors: complexity.factors,
      }
    }
  },

  getPriority(context: DetectionContext): number {
    // Keyword strategy has medium priority (fallback after semantic)
    return 50
  }
}


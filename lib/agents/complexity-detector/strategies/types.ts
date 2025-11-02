/**
 * Detection Strategy Types
 * 
 * Interfaces for detection strategies that can be used to analyze query complexity.
 * Each strategy implements the DetectionStrategy interface and provides a different
 * method for determining complexity scores.
 */

import { AgentConfig, ComplexityScore } from '@/types'
import { ApiConfig } from '@/lib/services/api-config-resolver'

/**
 * Context provided to detection strategies
 */
export interface DetectionContext {
  query: string
  requestId?: string
  agentConfig: AgentConfig
  apiConfig: ApiConfig | null
  // Additional context from other strategies (if available)
  semanticScore?: number
  keywordScore?: number
  similarity?: number
}

/**
 * Result from a detection strategy
 */
export interface DetectionResult {
  score: number // 0.0 (simple) to 1.0 (very complex)
  reasoningPasses: number // 1, 2, or 3
  confidence: number // 0.0-1.0, how confident the strategy is
  metadata?: {
    // Strategy-specific metadata
    matchedExampleId?: string // For semantic strategy
    similarity?: number // For semantic strategy
    detectedKeywords?: string[] // For keyword strategy
    reasoning?: string // For LLM strategy
    [key: string]: any
  }
}

/**
 * Detection Strategy Interface
 * 
 * Each strategy must implement this interface to be used by the orchestrator.
 */
export interface DetectionStrategy {
  /**
   * Name of the strategy (e.g., 'semantic', 'keyword', 'llm')
   */
  name: string

  /**
   * Check if this strategy can be used with the given context
   * 
   * @param context - Detection context
   * @returns true if strategy can be used
   */
  canUse(context: DetectionContext): boolean

  /**
   * Perform complexity detection
   * 
   * @param context - Detection context
   * @returns Detection result with score and reasoning passes
   */
  detect(context: DetectionContext): Promise<DetectionResult>

  /**
   * Get the priority of this strategy (higher = tried first)
   * Used when multiple strategies can be used
   */
  getPriority(context: DetectionContext): number
}


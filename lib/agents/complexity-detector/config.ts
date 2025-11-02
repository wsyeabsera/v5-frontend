/**
 * Strategy Configuration
 * 
 * Configuration for detection strategies that can be customized per agent.
 * This allows each agent to choose which strategies to use and in what order.
 */

/**
 * Strategy-specific configuration options
 */
export interface SemanticStrategyConfig {
  threshold?: number // Similarity threshold (default: 0.75)
}

export interface KeywordStrategyConfig {
  useWhen?: 'always' | 'fallback' // When to use keyword strategy (default: 'fallback')
}

export interface LLMStrategyConfig {
  useWhen?: 'always' | 'conflict' | 'ambiguous' // When to use LLM (default: 'conflict')
}

/**
 * Strategy Configuration
 * 
 * Defines which strategies are enabled and how they should be used.
 */
export interface StrategyConfig {
  /**
   * Enabled strategy names (e.g., ['semantic', 'keyword', 'llm'])
   * Order determines priority (first = highest priority)
   */
  enabled: string[]

  /**
   * Fallback order - order to try strategies if first one fails
   * Defaults to enabled order if not specified
   */
  fallbackOrder?: string[]

  /**
   * Strategy-specific configurations
   */
  semantic?: SemanticStrategyConfig
  keyword?: KeywordStrategyConfig
  llm?: LLMStrategyConfig
}

/**
 * Default strategy configuration
 * Used when no strategy config is provided for an agent
 */
export const DEFAULT_STRATEGY_CONFIG: StrategyConfig = {
  enabled: ['semantic', 'keyword', 'llm'],
  fallbackOrder: ['semantic', 'keyword', 'llm'],
  semantic: {
    threshold: parseFloat(process.env.COMPLEXITY_SIMILARITY_THRESHOLD || '0.75')
  },
  keyword: {
    useWhen: 'fallback'
  },
  llm: {
    useWhen: 'conflict'
  }
}

/**
 * Get strategy configuration for an agent
 * Returns default if not specified
 */
export function getStrategyConfig(config?: StrategyConfig): StrategyConfig {
  if (!config) {
    return DEFAULT_STRATEGY_CONFIG
  }

  // Merge with defaults
  return {
    enabled: config.enabled || DEFAULT_STRATEGY_CONFIG.enabled,
    fallbackOrder: config.fallbackOrder || config.enabled || DEFAULT_STRATEGY_CONFIG.fallbackOrder,
    semantic: {
      ...DEFAULT_STRATEGY_CONFIG.semantic,
      ...config.semantic
    },
    keyword: {
      ...DEFAULT_STRATEGY_CONFIG.keyword,
      ...config.keyword
    },
    llm: {
      ...DEFAULT_STRATEGY_CONFIG.llm,
      ...config.llm
    }
  }
}


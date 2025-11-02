/**
 * Keyword-based Complexity Detector (Fallback)
 * 
 * Simplified keyword-based detection used when semantic matching fails.
 * This is a fallback mechanism when no similar examples are found above the threshold.
 */

import { ComplexityScore } from '@/types'

/**
 * Keyword patterns that indicate multi-step operations
 */
const MULTI_STEP_KEYWORDS = [
  'then',
  'after',
  'next',
  'follow',
  'sequence',
  'step',
  'first',
  'second',
  'finally',
  'then do',
  'after that',
]

/**
 * Keywords that indicate analysis operations
 */
const ANALYSIS_KEYWORDS = [
  'analyze',
  'compare',
  'evaluate',
  'assess',
  'examine',
  'review',
  'study',
  'investigate',
  'break down',
  'analysis',
  'performance',
  'trends',
  'patterns',
  'correlation',
]

/**
 * Keywords that indicate data aggregation
 */
const AGGREGATION_KEYWORDS = [
  'all',
  'every',
  'total',
  'summarize',
  'overview',
  'summary',
  'across',
  'combined',
  'aggregate',
  'consolidate',
  'comprehensive',
  'entire',
  'complete',
]

/**
 * Domain-specific keywords for waste management/facility operations
 * These indicate operations that may require multiple tool calls or data gathering
 */
const DOMAIN_COMPLEXITY_KEYWORDS = [
  // Entity operations (may require lookups + processing)
  'facility',
  'facilities',
  'contaminant',
  'contaminants',
  'inspection',
  'inspections',
  'shipment',
  'shipments',
  'contract',
  'contracts',
  
  // Complex operations
  'report',
  'reports',
  'generate',
  'intelligent',
  'risk',
  'analysis',
  'suggest',
  'recommend',
  'recommendation',
  'improve',
  'improvement',
]

/**
 * Thresholds for determining reasoning passes
 */
const SIMPLE_THRESHOLD = 0.4
const COMPLEX_THRESHOLD = 0.7

/**
 * Weight factors for complexity calculation
 */
const WEIGHTS = {
  queryLength: 0.15,
  multipleQuestions: 0.1,
  multiStep: 0.2,
  analysis: 0.25,
  aggregation: 0.15,
  domainComplexity: 0.15, // New: domain-specific operations
}

/**
 * Detect complexity using keyword-based heuristics
 * 
 * @param query - User query to analyze
 * @returns ComplexityScore with score and reasoning passes
 */
export function detectComplexityKeyword(query: string): ComplexityScore {
  // Factor 1: Query length (normalized to 0-1)
  const queryLength = normalize(query.length, 0, 500)

  // Factor 2: Multiple questions
  const questionCount = (query.match(/\?/g) || []).length
  const hasMultipleQuestions = questionCount > 1 ? 1 : 0

  // Factor 3: Multi-step indicators
  const requiresMultiStep = hasKeywords(query, MULTI_STEP_KEYWORDS) ? 1 : 0

  // Factor 4: Analysis indicators
  const involvesAnalysis = hasKeywords(query, ANALYSIS_KEYWORDS) ? 1 : 0

  // Factor 5: Aggregation indicators
  const needsDataAggregation = hasKeywords(query, AGGREGATION_KEYWORDS) ? 1 : 0

  // Factor 6: Domain-specific complexity (waste management operations)
  // Count domain keywords - more keywords = higher complexity
  const domainKeywordCount = DOMAIN_COMPLEXITY_KEYWORDS.filter(keyword => 
    query.toLowerCase().includes(keyword.toLowerCase())
  ).length
  const domainComplexity = normalize(domainKeywordCount, 0, 5) // Normalize: 0-5 keywords

  // Calculate weighted complexity score
  const score =
    queryLength * WEIGHTS.queryLength +
    hasMultipleQuestions * WEIGHTS.multipleQuestions +
    requiresMultiStep * WEIGHTS.multiStep +
    involvesAnalysis * WEIGHTS.analysis +
    needsDataAggregation * WEIGHTS.aggregation +
    domainComplexity * WEIGHTS.domainComplexity

  // Determine reasoning passes based on score
  let reasoningPasses = 1 // Default: simple, 1 pass
  if (score > COMPLEX_THRESHOLD) {
    reasoningPasses = 3 // Very complex: 3 passes
  } else if (score > SIMPLE_THRESHOLD) {
    reasoningPasses = 2 // Medium complexity: 2 passes
  }

  return {
    score: Math.min(1.0, Math.max(0.0, score)), // Clamp to 0-1
    reasoningPasses,
    factors: {
      queryLength,
      hasMultipleQuestions: hasMultipleQuestions === 1,
      requiresMultiStep: requiresMultiStep === 1,
      involvesAnalysis: involvesAnalysis === 1,
      needsDataAggregation: needsDataAggregation === 1,
      domainComplexity,
    },
  }
}

/**
 * Extract detected keywords from query
 * 
 * @param query - Query to analyze
 * @returns Array of detected keywords
 */
export function extractDetectedKeywords(query: string): string[] {
  const detected: string[] = []
  const allKeywords = [
    ...MULTI_STEP_KEYWORDS,
    ...ANALYSIS_KEYWORDS,
    ...AGGREGATION_KEYWORDS,
    ...DOMAIN_COMPLEXITY_KEYWORDS,
  ]

  const lowerQuery = query.toLowerCase()
  for (const keyword of allKeywords) {
    if (lowerQuery.includes(keyword.toLowerCase())) {
      detected.push(keyword)
    }
  }

  return detected
}

/**
 * Check if query contains any of the given keywords
 */
function hasKeywords(query: string, keywords: string[]): boolean {
  const lowerQuery = query.toLowerCase()
  return keywords.some((keyword) => lowerQuery.includes(keyword.toLowerCase()))
}

/**
 * Normalize a value to 0-1 range
 */
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0 // Avoid division by zero
  return Math.min(1, Math.max(0, (value - min) / (max - min)))
}


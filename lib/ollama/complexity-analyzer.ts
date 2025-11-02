/**
 * Complexity Analyzer Service
 * 
 * Uses AI server LLM to analyze query complexity when semantic/keyword methods conflict
 * or when edge cases need intelligent reasoning.
 * 
 * This is used as a tie-breaker and explanation generator, not the primary method.
 * 
 * Note: Embeddings still use Ollama (untouched).
 */

import { ComplexityScore } from '@/types'
import { logger } from '@/utils/logger'

const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:3002/stream'
const USE_LLM_COMPLEXITY = process.env.USE_LLM_COMPLEXITY !== 'false' // Default: true

/**
 * API Configuration for LLM calls
 */
export interface ApiConfig {
  modelId: string
  apiKey: string
  temperature?: number
  maxTokens?: number
  topP?: number
}

/**
 * Read streaming response from AI server
 * Accumulates the full response text
 */
async function readStreamResponse(response: Response): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('Response body is not readable')
  }

  const decoder = new TextDecoder()
  let fullText = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      fullText += decoder.decode(value, { stream: true })
    }
    // Decode any remaining text
    if (fullText) {
      fullText += decoder.decode()
    }
  } finally {
    reader.releaseLock()
  }

  return fullText
}

/**
 * LLM Analysis Result
 */
interface LLMAnalysisResult {
  score: number
  reasoningPasses: number
  reasoning: string
  confidence?: number
}

/**
 * Analyze complexity using LLM when semantic/keyword methods conflict
 * 
 * Called when:
 * - Semantic/keyword score difference > threshold
 * - Similarity is borderline (0.75-0.85)
 * - Query is ambiguous or edge case
 * 
 * @param userQuery - User query to analyze
 * @param semanticScore - Complexity score from semantic matching
 * @param keywordScore - Complexity score from keyword detection
 * @param similarity - Similarity score from semantic matching (if available)
 * @param apiConfig - Optional API configuration (modelId, apiKey). If not provided, LLM analysis is disabled.
 * @returns LLM analysis with score, reasoning passes, and reasoning
 */
export async function analyzeComplexityWithLLM(
  userQuery: string,
  semanticScore?: number,
  keywordScore?: number,
  similarity?: number,
  apiConfig?: ApiConfig
): Promise<LLMAnalysisResult> {
  if (!USE_LLM_COMPLEXITY) {
    throw new Error('LLM complexity analysis is disabled')
  }

  if (!apiConfig || !apiConfig.modelId || !apiConfig.apiKey) {
    throw new Error('API configuration (modelId, apiKey) is required for LLM complexity analysis')
  }

  try {
    // Build context for LLM
    let contextMessage = `Query: "${userQuery}"\n\n`
    
    if (semanticScore !== undefined && keywordScore !== undefined) {
      contextMessage += `Semantic Match Score: ${semanticScore.toFixed(3)} (from similar examples)\n`
      contextMessage += `Keyword Detection Score: ${keywordScore.toFixed(3)} (from heuristics)\n`
      contextMessage += `These scores differ significantly (difference: ${Math.abs(semanticScore - keywordScore).toFixed(3)}).\n\n`
    } else if (similarity !== undefined) {
      contextMessage += `Semantic similarity: ${similarity.toFixed(3)}\n`
      contextMessage += `This is a borderline match that needs verification.\n\n`
    } else {
      contextMessage += `This query is ambiguous and needs intelligent analysis.\n\n`
    }

    const systemPrompt = `You are analyzing query complexity for a waste management system. The system determines how many reasoning passes (1, 2, or 3) are needed to process a user query.

Analyze queries and determine:
1. Complexity score (0.0 = simple, 1.0 = very complex)
2. Reasoning passes needed (1, 2, or 3)
   - 1 pass: Simple queries like "list facilities" or "show me facility X"
   - 2 passes: Medium queries like "analyze facility performance" or "compare two facilities"
   - 3 passes: Complex queries like "analyze all facilities and generate reports comparing performance"
3. Brief reasoning (1-2 sentences explaining your decision)

Always respond with ONLY valid JSON in this exact format:
{
  "score": 0.75,
  "reasoningPasses": 3,
  "reasoning": "This query requires analyzing multiple facilities, generating reports, and comparing performance, which involves multiple data aggregation and analysis steps."
}`

    const userMessage = `${contextMessage}

Analyze this query and provide your response as JSON only.`

    // Get actual model name from config (e.g., "ollama-mistral" -> "mistral:latest")
    let actualModelId = apiConfig.modelId
    try {
      const { getModelConfig } = await import('@/lib/ai-config')
      const modelConfig = getModelConfig(apiConfig.modelId)
      if (modelConfig && modelConfig.model) {
        actualModelId = modelConfig.model
        logger.info(`[Complexity Analyzer] Converted modelId "${apiConfig.modelId}" -> "${actualModelId}"`)
      }
    } catch (e) {
      logger.warn(`[Complexity Analyzer] Failed to get model config:`, e)
      // Fallback to original modelId if import fails
    }

    logger.debug(`[Complexity Analyzer] Calling AI server: modelId="${actualModelId}", provider="${apiConfig.apiKey?.startsWith('http') ? 'ollama' : 'api'}"`)

    // Call AI server
    const response = await fetch(AI_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        modelId: actualModelId,
        apiKey: apiConfig.apiKey,
        systemPrompt,
        temperature: apiConfig.temperature,
        maxTokens: apiConfig.maxTokens,
        topP: apiConfig.topP,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`AI server error: ${response.status} - ${errorText}`)
    }

    // Read streaming response
    const responseText = await readStreamResponse(response)
    const trimmedText = responseText.trim()

    // Try to extract JSON from response
    let jsonMatch = trimmedText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      // If no JSON found, try to parse the whole response
      jsonMatch = [trimmedText]
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Validate and normalize
    const score = Math.min(1.0, Math.max(0.0, parseFloat(parsed.score) || 0.5))
    const reasoningPasses = [1, 2, 3].includes(parsed.reasoningPasses)
      ? parsed.reasoningPasses
      : score > 0.7 ? 3 : score > 0.4 ? 2 : 1
    const reasoning = parsed.reasoning || 'LLM analyzed query complexity'

    return {
      score,
      reasoningPasses,
      reasoning,
      confidence: similarity ? similarity : 0.8, // Use similarity as confidence if available
    }
  } catch (error: any) {
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed')) {
      throw new Error(
        `Failed to connect to AI server at ${AI_SERVER_URL}. Make sure the AI server is running.`
      )
    }
    throw new Error(`Failed to analyze complexity with LLM: ${error.message || error}`)
  }
}

/**
 * Generate human-readable explanation for complexity score
 * 
 * Called for complex queries (3 passes) or when explanation is requested
 * 
 * @param userQuery - User query that was analyzed
 * @param complexity - Complexity score and reasoning passes
 * @param apiConfig - Optional API configuration (modelId, apiKey). If not provided, falls back to simple explanation.
 * @returns Human-readable explanation (2-3 sentences)
 */
export async function generateComplexityExplanation(
  userQuery: string,
  complexity: ComplexityScore,
  apiConfig?: ApiConfig
): Promise<string> {
  if (!USE_LLM_COMPLEXITY) {
    return generateFallbackExplanation(userQuery, complexity)
  }

  if (!apiConfig || !apiConfig.modelId || !apiConfig.apiKey) {
    // Fall back to simple explanation if API config not provided
    return generateFallbackExplanation(userQuery, complexity)
  }

  try {
    const systemPrompt = `You are an expert at explaining technical concepts in simple terms. Provide clear, concise explanations that help users understand why queries require different levels of processing complexity.`

    const userMessage = `Explain why this query requires ${complexity.reasoningPasses} reasoning pass${complexity.reasoningPasses > 1 ? 'es' : ''}:

Query: "${userQuery}"
Complexity Score: ${complexity.score.toFixed(3)}

Provide a clear, concise explanation (2-3 sentences) that helps users understand why this query needs deeper processing. Focus on:
- What operations the query involves
- Why it requires ${complexity.reasoningPasses} reasoning passes
- What makes it ${complexity.score < 0.4 ? 'simple' : complexity.score < 0.7 ? 'moderately complex' : 'highly complex'}

Return ONLY the explanation text, no JSON or formatting.`

    // Get actual model name from config (e.g., "ollama-mistral" -> "mistral")
    let actualModelId = apiConfig.modelId
    try {
      const { getModelConfig } = await import('@/lib/ai-config')
      const modelConfig = getModelConfig(apiConfig.modelId)
      if (modelConfig && modelConfig.model) {
        actualModelId = modelConfig.model
      }
    } catch (e) {
      // Fallback to original modelId if import fails
    }

    // Call AI server
    const response = await fetch(AI_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        modelId: actualModelId,
        apiKey: apiConfig.apiKey,
        systemPrompt,
        temperature: apiConfig.temperature,
        maxTokens: apiConfig.maxTokens,
        topP: apiConfig.topP,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`AI server error: ${response.status} - ${errorText}`)
    }

    // Read streaming response
    const explanation = await readStreamResponse(response)
    return explanation.trim()
  } catch (error: any) {
    // Fall back to simple explanation if LLM fails
    logger.warn('[Complexity Analyzer] Failed to generate LLM explanation, using fallback:', error.message)
    return generateFallbackExplanation(userQuery, complexity)
  }
}

/**
 * Generate fallback explanation without LLM
 */
function generateFallbackExplanation(
  userQuery: string,
  complexity: ComplexityScore
): string {
  const { score, reasoningPasses } = complexity

  if (reasoningPasses === 1) {
    return `This is a simple query that requires basic data retrieval. The system can answer it with a single reasoning pass.`
  } else if (reasoningPasses === 2) {
    return `This query requires moderate complexity analysis involving data processing and comparison. The system uses 2 reasoning passes to ensure accurate results.`
  } else {
    return `This is a complex query that requires comprehensive analysis across multiple entities, data aggregation, and advanced reasoning. The system uses 3 reasoning passes to handle all aspects thoroughly.`
  }
}

/**
 * Check if LLM should be used for this query
 * 
 * @param userQuery - Query to check
 * @param semanticScore - Semantic detection score
 * @param keywordScore - Keyword detection score
 * @param similarity - Semantic similarity (if available)
 * @param preferLLM - If true, prefer LLM over keyword/semantic (when agent config is provided)
 * @returns true if LLM should be consulted
 */
export function shouldUseLLM(
  userQuery: string,
  semanticScore?: number,
  keywordScore?: number,
  similarity?: number,
  preferLLM?: boolean
): boolean {
  if (!USE_LLM_COMPLEXITY) {
    return false
  }

  // If preferLLM is true (agent config provided), use LLM for better accuracy
  if (preferLLM) {
    return true
  }

  // Check for significant score difference
  if (
    semanticScore !== undefined &&
    keywordScore !== undefined &&
    Math.abs(semanticScore - keywordScore) > 0.3
  ) {
    return true
  }

  // Check for borderline similarity
  if (similarity !== undefined && similarity >= 0.75 && similarity < 0.85) {
    return true
  }

  // Check for ambiguous queries
  const trimmedQuery = userQuery.trim()
  if (trimmedQuery.length < 10) {
    return true // Very short queries are ambiguous
  }

  // Check for vague queries (only common words)
  const vaguePatterns = /^(hi|hello|help|what|how|show|list|get|tell me)$/i
  if (vaguePatterns.test(trimmedQuery)) {
    return true
  }

  return false
}

/**
 * Test AI server connection for complexity analysis
 */
export async function testComplexityAnalyzerConnection(): Promise<boolean> {
  try {
    const healthUrl = AI_SERVER_URL.replace('/stream', '/health')
    const response = await fetch(healthUrl)
    return response.ok
  } catch {
    return false
  }
}


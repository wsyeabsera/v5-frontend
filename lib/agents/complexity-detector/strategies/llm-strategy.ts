/**
 * LLM Detection Strategy
 * 
 * Uses AI server LLM to analyze query complexity when other strategies conflict
 * or when intelligent reasoning is needed.
 */

import { DetectionStrategy, DetectionContext, DetectionResult } from './types'
import { logger } from '@/utils/logger'

const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:3002/stream'
const USE_LLM_COMPLEXITY = process.env.USE_LLM_COMPLEXITY !== 'false' // Default: true

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
 * LLM Detection Strategy
 * 
 * Uses AI server to analyze query complexity with intelligent reasoning.
 */
export const llmStrategy: DetectionStrategy = {
  name: 'llm',

  canUse(context: DetectionContext): boolean {
    if (!USE_LLM_COMPLEXITY) {
      return false
    }
    // LLM strategy requires API config
    return !!context.apiConfig && !!context.apiConfig.modelId && !!context.apiConfig.apiKey
  },

  async detect(context: DetectionContext): Promise<DetectionResult> {
    const { query, apiConfig, semanticScore, keywordScore, similarity } = context

    if (!apiConfig || !apiConfig.modelId || !apiConfig.apiKey) {
      throw new Error('API configuration (modelId, apiKey) is required for LLM complexity analysis')
    }

    try {
      logger.debug(`[LLM Strategy] Starting LLM analysis for query: "${query.substring(0, 50)}..."`)

      // Build context for LLM
      let contextMessage = `Query: "${query}"\n\n`
      
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

      // Use actualModelName from apiConfig (already resolved by api-config-resolver)
      const actualModelId = apiConfig.actualModelName || apiConfig.modelId

      logger.debug(`[LLM Strategy] Calling AI server`, {
        modelId: actualModelId,
        provider: apiConfig.apiKey.startsWith('http') ? 'ollama' : 'api'
      })

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

      logger.info(`[LLM Strategy] LLM analysis complete`, {
        score: score.toFixed(3),
        passes: reasoningPasses,
        reasoning: reasoning.substring(0, 100)
      })

      return {
        score,
        reasoningPasses,
        confidence: similarity !== undefined ? similarity : 0.8, // Use similarity as confidence if available
        metadata: {
          reasoning,
        }
      }
    } catch (error: any) {
      if (error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed')) {
        logger.error(`[LLM Strategy] Failed to connect to AI server`, {
          url: AI_SERVER_URL,
          error: error.message
        })
        throw new Error(
          `Failed to connect to AI server at ${AI_SERVER_URL}. Make sure the AI server is running.`
        )
      }
      logger.error(`[LLM Strategy] LLM analysis failed`, {
        error: error.message,
        query: query.substring(0, 50)
      })
      throw new Error(`Failed to analyze complexity with LLM: ${error.message || error}`)
    }
  },

  getPriority(context: DetectionContext): number {
    // LLM strategy has lower priority (used as tie-breaker or for ambiguous queries)
    // Higher priority if there's a conflict (semanticScore and keywordScore both present)
    if (context.semanticScore !== undefined && context.keywordScore !== undefined) {
      return 75 // Higher priority for conflicts
    }
    return 25 // Lower priority for general use
  }
}


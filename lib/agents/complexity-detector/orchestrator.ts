/**
 * Complexity Detector Orchestrator
 * 
 * Main orchestrator that coordinates detection strategies based on configuration.
 * Replaces the old detectComplexitySemantic function with a clean, modular approach.
 */

import { generateRequestId, addAgentToChain } from '@/lib/utils/request-id'
import { getRequestMongoDBStorage } from '@/lib/storage/request-mongodb-storage'
import { getComplexityDetectionsStorage } from '@/lib/storage/complexity-detections-storage'
import { incrementUsageCount } from '@/lib/pinecone/complexity-examples'
import { resolveApiConfig } from '@/lib/services/api-config-resolver'
import { getStrategyConfig, DEFAULT_STRATEGY_CONFIG } from './config'
import { semanticStrategy } from './strategies/semantic-strategy'
import { keywordStrategy } from './strategies/keyword-strategy'
import { llmStrategy } from './strategies/llm-strategy'
import { DetectionStrategy, DetectionContext, DetectionResult } from './strategies/types'
import { getAgentConfigStorage } from '@/lib/storage/agent-config-storage'
import { ComplexityDetectorOutput, ComplexityScore, RequestContext, AgentConfig } from '@/types'
import { ApiConfig } from '@/lib/services/api-config-resolver'
import { logger } from '@/utils/logger'
import { extractDetectedKeywords } from '@/lib/agents/complexity-detector-keyword'

// Strategy registry - maps strategy names to strategy instances
const STRATEGY_REGISTRY: Record<string, DetectionStrategy> = {
  semantic: semanticStrategy,
  keyword: keywordStrategy,
  llm: llmStrategy,
}

// Complexity score difference threshold for conflict detection
const COMPLEXITY_DIFFERENCE_THRESHOLD = 0.3

/**
 * Generate explanation for complex queries
 */
async function generateExplanation(
  userQuery: string,
  complexity: ComplexityScore,
  apiConfig: ApiConfig | null
): Promise<string> {
  const { reasoningPasses } = complexity
  
  if (!apiConfig || reasoningPasses !== 3) {
    // Fallback explanation
    if (reasoningPasses === 1) {
      return `This is a simple query that requires basic data retrieval. The system can answer it with a single reasoning pass.`
    } else if (reasoningPasses === 2) {
      return `This query requires moderate complexity analysis involving data processing and comparison. The system uses 2 reasoning passes to ensure accurate results.`
    } else {
      return `This is a complex query that requires comprehensive analysis across multiple entities, data aggregation, and advanced reasoning. The system uses 3 reasoning passes to handle all aspects thoroughly.`
    }
  }

  // Try to generate LLM explanation
  try {
    const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:3002/stream'
    
    const systemPrompt = `You are an expert at explaining technical concepts in simple terms. Provide clear, concise explanations that help users understand why queries require different levels of processing complexity.`

    const userMessage = `Explain why this query requires ${complexity.reasoningPasses} reasoning pass${complexity.reasoningPasses > 1 ? 'es' : ''}:

Query: "${userQuery}"
Complexity Score: ${complexity.score.toFixed(3)}

Provide a clear, concise explanation (2-3 sentences) that helps users understand why this query needs deeper processing. Focus on:
- What operations the query involves
- Why it requires ${complexity.reasoningPasses} reasoning passes
- What makes it ${complexity.score < 0.4 ? 'simple' : complexity.score < 0.7 ? 'moderately complex' : 'highly complex'}

Return ONLY the explanation text, no JSON or formatting.`

    const actualModelId = apiConfig.actualModelName || apiConfig.modelId

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
      throw new Error(`AI server error: ${response.status}`)
    }

    // Read streaming response
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
      if (fullText) {
        fullText += decoder.decode()
      }
    } finally {
      reader.releaseLock()
    }

    return fullText.trim()
  } catch (error: any) {
    logger.warn(`[Orchestrator] Failed to generate LLM explanation, using fallback:`, error.message)
    // Return fallback explanation
    const { reasoningPasses } = complexity
    if (reasoningPasses === 1) {
      return `This is a simple query that requires basic data retrieval. The system can answer it with a single reasoning pass.`
    } else if (reasoningPasses === 2) {
      return `This query requires moderate complexity analysis involving data processing and comparison. The system uses 2 reasoning passes to ensure accurate results.`
    } else {
      return `This is a complex query that requires comprehensive analysis across multiple entities, data aggregation, and advanced reasoning. The system uses 3 reasoning passes to handle all aspects thoroughly.`
    }
  }
}

/**
 * Main complexity detection function
 * 
 * @param query - User query to analyze
 * @param requestId - Optional existing request ID
 * @param agentId - Optional agent ID (defaults to 'complexity-detector')
 * @param apiConfig - Optional pre-resolved API config (if not provided, will be resolved from agent config and headers)
 * @param headers - Optional request headers for API config resolution
 * @returns ComplexityDetectorOutput with complexity score and Request ID
 */
export async function detectComplexity(
  query: string,
  requestId?: string,
  agentId?: string,
  apiConfig?: ApiConfig | null,
  headers?: Headers
): Promise<ComplexityDetectorOutput> {
  logger.info(`[Complexity Detector] Starting detection`, {
    query: query.substring(0, 50),
    requestId,
    agentId: agentId || 'complexity-detector',
    hasApiConfig: !!apiConfig
  })

  // Step 1: Manage Request ID
  let requestContext: RequestContext
  const requestStorage = getRequestMongoDBStorage()

  if (requestId) {
    const existing = await requestStorage.get(requestId)
    if (existing) {
      requestContext = existing
      requestContext.status = 'in-progress'
      await requestStorage.save(requestContext)
    } else {
      requestContext = generateRequestId(query)
    }
  } else {
    requestContext = generateRequestId(query)
  }

  requestContext = addAgentToChain(requestContext, 'complexity-detector')

  // Step 2: Get agent config
  const targetAgentId = agentId || 'complexity-detector'
  const agentStorage = getAgentConfigStorage()
  const agentConfig = await agentStorage.getAgentConfig(targetAgentId)

  if (!agentConfig || !agentConfig.enabled) {
    logger.warn(`[Complexity Detector] Agent config not found or disabled`, { agentId: targetAgentId })
    // Fall back to keyword-only detection
    const keywordResult = await keywordStrategy.detect({
      query,
      agentConfig: agentConfig || {} as AgentConfig,
      apiConfig: null,
    })

    const complexity: ComplexityScore = {
      score: keywordResult.score,
      reasoningPasses: keywordResult.reasoningPasses,
      factors: keywordResult.metadata?.factors as any,
    }

    requestContext.status = 'completed'
    await requestStorage.save(requestContext)

    const output: ComplexityDetectorOutput = {
      requestId: requestContext.requestId,
      agentName: 'complexity-detector',
      timestamp: new Date(),
      requestContext,
      complexity,
      userQuery: query,
      detectedKeywords: keywordResult.metadata?.detectedKeywords,
      detectionMethod: 'keyword',
    }

    try {
      const detectionsStorage = getComplexityDetectionsStorage()
      await detectionsStorage.save(output)
    } catch (error: any) {
      logger.error(`[Complexity Detector] Failed to store output:`, error.message)
    }

    return output
  }

  // Step 3: Resolve API config if not provided
  let resolvedApiConfig: ApiConfig | null = apiConfig ?? null
  if (!resolvedApiConfig && agentConfig && headers) {
    resolvedApiConfig = await resolveApiConfig(agentConfig, headers)
  } else if (!resolvedApiConfig && agentConfig) {
    // Try with empty headers as fallback
    resolvedApiConfig = await resolveApiConfig(agentConfig, new Headers())
  }

  // Step 4: Get strategy config
  const strategyConfig = getStrategyConfig(agentConfig.strategyConfig)

  // Step 5: Build detection context
  const context: DetectionContext = {
    query,
    requestId: requestContext.requestId,
    agentConfig,
    apiConfig: resolvedApiConfig,
  }

  // Step 6: Try strategies in order
  let finalResult: DetectionResult | null = null
  let detectionMethod: 'semantic' | 'keyword' | 'llm' = 'keyword'
  let matchedExampleId: string | undefined
  let similarity: number | undefined
  let detectedKeywords: string[] | undefined
  let semanticResult: DetectionResult | null = null
  let keywordResult: DetectionResult | null = null
  let llmResult: DetectionResult | null = null

  // First pass: Try semantic and keyword strategies (collect results, don't break early)
  for (const strategyName of strategyConfig.enabled) {
    // Skip LLM in first pass - we'll handle it separately
    if (strategyName === 'llm') {
      continue
    }

    const strategy = STRATEGY_REGISTRY[strategyName]
    if (!strategy) {
      logger.warn(`[Complexity Detector] Unknown strategy: ${strategyName}`)
      continue
    }

    if (!strategy.canUse(context)) {
      logger.debug(`[Complexity Detector] Strategy ${strategyName} cannot be used`)
      continue
    }

    try {
      logger.debug(`[Complexity Detector] Trying strategy: ${strategyName}`)
      
      const result = await strategy.detect(context)
      
      // Store results and update context
      if (strategyName === 'semantic') {
        semanticResult = result
        matchedExampleId = result.metadata?.matchedExampleId
        similarity = result.metadata?.similarity
        // Update context with semantic score for LLM
        context.semanticScore = result.score
        context.similarity = similarity
        logger.debug(`[Complexity Detector] Semantic strategy completed, score: ${result.score.toFixed(3)}`)
      } else if (strategyName === 'keyword') {
        keywordResult = result
        detectedKeywords = result.metadata?.detectedKeywords
        // Update context with keyword score for LLM
        context.keywordScore = result.score
        logger.debug(`[Complexity Detector] Keyword strategy completed, score: ${result.score.toFixed(3)}`)
      }

      // If we have a reliable semantic match, we can use it (high similarity = reliable)
      if (strategyName === 'semantic' && similarity !== undefined && similarity >= 0.9) {
        finalResult = semanticResult!
        detectionMethod = 'semantic'
        
        // Increment usage count
        if (matchedExampleId) {
          try {
            await incrementUsageCount(matchedExampleId)
          } catch (error: any) {
            logger.warn(`[Complexity Detector] Failed to increment usage count:`, error.message)
          }
        }
        // Don't break - continue to check if LLM should run
      }
    } catch (error: any) {
      logger.debug(`[Complexity Detector] Strategy ${strategyName} failed:`, error.message)
      // Continue to next strategy
      continue
    }
  }

  // Second pass: Determine if LLM should run based on useWhen conditions
  const llmStrategy = STRATEGY_REGISTRY['llm']
  const shouldRunLLM = llmStrategy && llmStrategy.canUse(context) && strategyConfig.enabled.includes('llm')
  
  logger.debug(`[Complexity Detector] LLM strategy check`, {
    hasStrategy: !!llmStrategy,
    canUse: llmStrategy ? llmStrategy.canUse(context) : false,
    enabled: strategyConfig.enabled.includes('llm'),
    hasApiConfig: !!resolvedApiConfig,
    semanticResult: !!semanticResult,
    keywordResult: !!keywordResult
  })
  
  if (shouldRunLLM) {
    const llmUseWhen = strategyConfig.llm?.useWhen || 'conflict'
    let runLLM = false

    if (llmUseWhen === 'always') {
      runLLM = true
      logger.debug(`[Complexity Detector] LLM configured to run always`)
    } else if (llmUseWhen === 'conflict' && semanticResult && keywordResult) {
      const scoreDiff = Math.abs(semanticResult.score - keywordResult.score)
      const hasConflict = scoreDiff > COMPLEXITY_DIFFERENCE_THRESHOLD
      runLLM = hasConflict
      if (hasConflict) {
        logger.debug(`[Complexity Detector] Conflict detected (diff: ${scoreDiff.toFixed(3)}), running LLM`)
      } else {
        logger.debug(`[Complexity Detector] No conflict detected (diff: ${scoreDiff.toFixed(3)}), skipping LLM`)
      }
    } else if (llmUseWhen === 'conflict' && !semanticResult && keywordResult) {
      // If semantic failed but we have keyword, treat as ambiguous (no semantic match = ambiguous)
      runLLM = true
      logger.debug(`[Complexity Detector] Semantic failed but keyword succeeded - treating as ambiguous, running LLM`)
    } else if (llmUseWhen === 'ambiguous') {
      // Ambiguous queries: very short, vague, or no good matches
      const isAmbiguous = 
        query.trim().length < 10 ||
        !semanticResult || 
        (similarity !== undefined && similarity < 0.5)
      runLLM = isAmbiguous
      if (isAmbiguous) {
        logger.debug(`[Complexity Detector] Ambiguous query detected, running LLM`)
      }
    }
    
    if (!runLLM) {
      logger.debug(`[Complexity Detector] LLM conditions not met, useWhen: ${llmUseWhen}`)
    }

    if (runLLM) {
      try {
        logger.debug(`[Complexity Detector] Trying LLM strategy`)
        llmResult = await llmStrategy.detect(context)
        finalResult = llmResult
        detectionMethod = 'llm'
        logger.info(`[Complexity Detector] LLM strategy completed, score: ${llmResult.score.toFixed(3)}`)
      } catch (error: any) {
        logger.debug(`[Complexity Detector] LLM strategy failed:`, error.message)
        // LLM failed, continue with existing results
      }
    }
  }

  // If we still don't have a result, use semantic or keyword (prefer semantic if available)
  if (!finalResult) {
    if (semanticResult && similarity !== undefined && similarity >= COMPLEXITY_DIFFERENCE_THRESHOLD) {
      finalResult = semanticResult
      detectionMethod = 'semantic'
      
      // Increment usage count
      if (matchedExampleId) {
        try {
          await incrementUsageCount(matchedExampleId)
        } catch (error: any) {
          logger.warn(`[Complexity Detector] Failed to increment usage count:`, error.message)
        }
      }
    } else if (keywordResult) {
      finalResult = keywordResult
      detectionMethod = 'keyword'
    }
  }

  // Fallback to keyword if no strategy succeeded
  if (!finalResult) {
    logger.warn(`[Complexity Detector] All strategies failed, using keyword fallback`)
    keywordResult = await keywordStrategy.detect(context)
    finalResult = keywordResult
    detectionMethod = 'keyword'
    detectedKeywords = keywordResult.metadata?.detectedKeywords
  }

  // Step 7: Build complexity score
  const complexity: ComplexityScore = {
    score: finalResult.score,
    reasoningPasses: finalResult.reasoningPasses,
    factors: finalResult.metadata?.factors as any,
  }

  // Step 8: Generate explanation if needed
  let llmExplanation: string | undefined
  let llmUsed = detectionMethod === 'llm'
  
  if (complexity.reasoningPasses === 3 || llmUsed) {
    try {
      llmExplanation = await generateExplanation(query, complexity, resolvedApiConfig || null)
      logger.debug(`[Complexity Detector] Generated explanation`)
    } catch (error: any) {
      logger.warn(`[Complexity Detector] Failed to generate explanation:`, error.message)
    }
  }

  // Step 9: Update request context
  requestContext.status = 'completed'
  await requestStorage.save(requestContext)

  // Step 10: Build output
  const output: ComplexityDetectorOutput = {
    requestId: requestContext.requestId,
    agentName: 'complexity-detector',
    timestamp: new Date(),
    requestContext,
    complexity,
    userQuery: query,
    detectedKeywords,
    matchedExampleId,
    similarity,
    detectionMethod,
    llmUsed,
    llmExplanation,
    llmConfidence: finalResult.confidence,
  }

  // Step 11: Store output in MongoDB
  try {
    const detectionsStorage = getComplexityDetectionsStorage()
    await detectionsStorage.save(output)
  } catch (error: any) {
    logger.error(`[Complexity Detector] Failed to store output in MongoDB:`, error.message)
  }

  logger.info(`[Complexity Detector] Detection complete`, {
    method: detectionMethod,
    score: complexity.score.toFixed(3),
    passes: complexity.reasoningPasses,
    requestId: requestContext.requestId
  })

  return output
}

/**
 * Get user query from request ID
 * 
 * @param requestId - Request ID to look up
 * @returns User query or null if not found
 */
export async function getUserQueryFromRequest(
  requestId: string
): Promise<string | null> {
  const storage = getRequestMongoDBStorage()
  const request = await storage.get(requestId)
  return request?.userQuery || null
}


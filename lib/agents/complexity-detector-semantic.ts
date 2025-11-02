/**
 * Semantic Complexity Detector
 * 
 * Uses Ollama embeddings to match user queries against stored examples in Pinecone.
 * Falls back to keyword-based detection if no similar example is found above threshold.
 */

import { generateRequestId, addAgentToChain } from '@/lib/utils/request-id'
import { generateEmbedding } from '@/lib/ollama/embeddings'
import {
  querySimilarExamples,
  incrementUsageCount,
} from '@/lib/pinecone/complexity-examples'
import { detectComplexityKeyword, extractDetectedKeywords } from './complexity-detector-keyword'
import {
  analyzeComplexityWithLLM,
  generateComplexityExplanation,
  shouldUseLLM,
  ApiConfig,
} from '@/lib/ollama/complexity-analyzer'
import { getRequestMongoDBStorage } from '@/lib/storage/request-mongodb-storage'
import { getComplexityDetectionsStorage } from '@/lib/storage/complexity-detections-storage'
import {
  ComplexityDetectorOutput,
  ComplexityScore,
  RequestContext,
} from '@/types'

// Similarity threshold for semantic matching
// Higher = stricter matching (only very similar queries match)
const SIMILARITY_THRESHOLD = parseFloat(
  process.env.COMPLEXITY_SIMILARITY_THRESHOLD || '0.75'
)

// Complexity score difference threshold
// If matched example's complexity differs significantly from keyword detection,
// prefer keyword detection (more reliable for domain-specific queries)
const COMPLEXITY_DIFFERENCE_THRESHOLD = 0.3

/**
 * Detect complexity using semantic matching with fallback
 * 
 * Flow:
 * 1. Generate Request ID (as first agent)
 * 2. Generate embedding for user query
 * 3. Query Pinecone for similar examples
 * 4. If best match >= threshold: Use matched example's config
 * 5. If no match above threshold: Fallback to keyword-based
 * 6. Return result with Request ID
 * 
 * @param userQuery - User query to analyze
 * @param requestId - Optional existing request ID (if not provided, generates new one)
 * @param apiConfig - Optional API configuration for LLM calls (modelId, apiKey)
 * @returns ComplexityDetectorOutput with complexity score and Request ID
 */
export async function detectComplexitySemantic(
  userQuery: string,
  requestId?: string,
  apiConfig?: ApiConfig
): Promise<ComplexityDetectorOutput> {
  // Step 1: Generate or use existing Request ID
  let requestContext: RequestContext
  const storage = getRequestMongoDBStorage()

  if (requestId) {
    // Try to load existing request from MongoDB
    const existing = await storage.get(requestId)
    if (existing) {
      requestContext = existing
      // Update status to in-progress
      requestContext.status = 'in-progress'
      await storage.save(requestContext)
    } else {
      // Request ID provided but not found, generate new one
      requestContext = generateRequestId(userQuery)
    }
  } else {
    // Generate new Request ID (this agent is first in chain)
    requestContext = generateRequestId(userQuery)
  }

  // Add this agent to the chain
  requestContext = addAgentToChain(requestContext, 'complexity-detector')

  let complexity: ComplexityScore
  let matchedExampleId: string | undefined
  let similarity: number | undefined
  let detectedKeywords: string[] | undefined
  let detectionMethod: 'semantic' | 'keyword' | 'llm'
  let llmUsed = false
  let llmExplanation: string | undefined
  let llmConfidence: number | undefined

  try {
    // Step 2: Generate embedding for user query
    const queryEmbedding = await generateEmbedding(userQuery)

    // Step 3: Query Pinecone for similar examples
    const similarExamples = await querySimilarExamples(
      queryEmbedding,
      5, // topK
      SIMILARITY_THRESHOLD * 0.9 // Lower minScore for query, we'll filter after
    )

    // Step 4: Also run keyword detection for comparison
    const keywordComplexity = detectComplexityKeyword(userQuery)

    // Step 5: Check if we have a good semantic match
    if (similarExamples.length > 0 && similarExamples[0].similarity >= SIMILARITY_THRESHOLD) {
      const bestMatch = similarExamples[0]
      const semanticComplexity: ComplexityScore = {
        score: bestMatch.example.config.complexityScore,
        reasoningPasses: bestMatch.example.config.reasoningPasses,
      }

      // Smart validation: Check if semantic match makes sense compared to keyword detection
      const complexityDifference = Math.abs(semanticComplexity.score - keywordComplexity.score)

      // If semantic match is very close to keyword detection, or similarity is very high, use semantic
      // If semantic match differs significantly and similarity is not extremely high, prefer keyword
      const isVeryHighSimilarity = bestMatch.similarity >= 0.9
      const isComplexityConsistent = complexityDifference < COMPLEXITY_DIFFERENCE_THRESHOLD

      if (isVeryHighSimilarity || isComplexityConsistent) {
        // Use semantic match - it's reliable
        matchedExampleId = bestMatch.example.id
        similarity = bestMatch.similarity

        // Increment usage count for the matched example
        await incrementUsageCount(bestMatch.example.id)

        complexity = semanticComplexity
        detectionMethod = 'semantic'
      } else {
        // Semantic match seems off (different complexity score from keyword detection)
        // Check if we should use LLM as tie-breaker
        // Prefer LLM if apiConfig is provided (agent config is set up)
        const shouldConsultLLM = shouldUseLLM(
          userQuery,
          semanticComplexity.score,
          keywordComplexity.score,
          bestMatch.similarity,
          !!apiConfig // Prefer LLM when agent config is provided
        )

        if (shouldConsultLLM) {
          try {
            // Use LLM to resolve the conflict
            console.log(
              `[Complexity Detector] Conflicting scores detected (semantic: ${semanticComplexity.score}, keyword: ${keywordComplexity.score}), consulting LLM`
            )
            
            const llmAnalysis = await analyzeComplexityWithLLM(
              userQuery,
              semanticComplexity.score,
              keywordComplexity.score,
              bestMatch.similarity,
              apiConfig
            )

            complexity = {
              score: llmAnalysis.score,
              reasoningPasses: llmAnalysis.reasoningPasses,
            }
            detectionMethod = 'llm'
            llmUsed = true
            llmConfidence = llmAnalysis.confidence
            console.log(
              `[Complexity Detector] LLM analysis: score=${llmAnalysis.score.toFixed(3)}, passes=${llmAnalysis.reasoningPasses}, reasoning="${llmAnalysis.reasoning}"`
            )
          } catch (llmError: any) {
            // LLM failed - fall back to keyword detection
            console.warn(
              `[Complexity Detector] LLM analysis failed, using keyword detection: ${llmError.message}`
            )
            complexity = keywordComplexity
            detectedKeywords = extractDetectedKeywords(userQuery)
            detectionMethod = 'keyword'
          }
        } else {
          // Use keyword detection which is more reliable for domain-specific queries
          console.log(
            `[Complexity Detector] Semantic match (score: ${semanticComplexity.score}, similarity: ${bestMatch.similarity.toFixed(3)}) differs significantly from keyword detection (score: ${keywordComplexity.score}), using keyword detection`
          )
          complexity = keywordComplexity
          detectedKeywords = extractDetectedKeywords(userQuery)
          detectionMethod = 'keyword'
        }
      }
    } else {
      // No good semantic match - check if we should use LLM for ambiguous queries
      // Prefer LLM if apiConfig is provided (agent config is set up)
      const shouldConsultLLM = shouldUseLLM(
        userQuery,
        undefined,
        keywordComplexity.score,
        similarExamples.length > 0 ? similarExamples[0].similarity : undefined,
        !!apiConfig // Prefer LLM when agent config is provided
      )

      if (shouldConsultLLM) {
        try {
          console.log(
            `[Complexity Detector] Ambiguous query detected, consulting LLM`
          )
          
          const llmAnalysis = await analyzeComplexityWithLLM(
            userQuery,
            undefined,
            keywordComplexity.score,
            similarExamples.length > 0 ? similarExamples[0].similarity : undefined,
            apiConfig
          )

          complexity = {
            score: llmAnalysis.score,
            reasoningPasses: llmAnalysis.reasoningPasses,
          }
          detectionMethod = 'llm'
          llmUsed = true
          llmConfidence = llmAnalysis.confidence
          console.log(
            `[Complexity Detector] LLM analysis: score=${llmAnalysis.score.toFixed(3)}, passes=${llmAnalysis.reasoningPasses}`
          )
        } catch (llmError: any) {
          // LLM failed - fall back to keyword detection
          console.warn(
            `[Complexity Detector] LLM analysis failed, using keyword detection: ${llmError.message}`
          )
          complexity = keywordComplexity
          detectedKeywords = extractDetectedKeywords(userQuery)
          detectionMethod = 'keyword'
        }
      } else {
        // Use keyword detection
        complexity = keywordComplexity
        detectedKeywords = extractDetectedKeywords(userQuery)
        detectionMethod = 'keyword'
      }
    }
  } catch (error: any) {
    // If embedding generation or Pinecone query fails, fallback to keyword
    console.error('[Complexity Detector] Semantic detection failed, using fallback:', error)
    complexity = detectComplexityKeyword(userQuery)
    detectedKeywords = extractDetectedKeywords(userQuery)
    detectionMethod = 'keyword'
  }

  // Step 6: Generate explanation for complex queries (3 passes) or if LLM was used
  if (complexity.reasoningPasses === 3 || llmUsed) {
    try {
      llmExplanation = await generateComplexityExplanation(userQuery, complexity, apiConfig)
      console.log('[Complexity Detector] Generated explanation for complex query')
    } catch (explanationError: any) {
      console.warn(
        `[Complexity Detector] Failed to generate explanation: ${explanationError.message}`
      )
      // Continue without explanation - it's optional
    }
  }

  // Step 7: Update request context and save
  requestContext.status = 'completed'
  await storage.save(requestContext)

  // Build output
  const output: ComplexityDetectorOutput = {
    // Agent output base properties
    requestId: requestContext.requestId,
    agentName: 'complexity-detector',
    timestamp: new Date(),
    requestContext,

    // Complexity-specific output
    complexity,
    userQuery,
    detectedKeywords,
    matchedExampleId,
    similarity,
    detectionMethod,
    llmUsed,
    llmExplanation,
    llmConfidence,
  }

  // Store output in MongoDB for history tracking
  try {
    const detectionsStorage = getComplexityDetectionsStorage()
    await detectionsStorage.save(output)
  } catch (error: any) {
    // Log error but don't fail the detection
    console.error('[Complexity Detector] Failed to store output in MongoDB:', error)
  }

  return output
}

/**
 * Get user query from request ID
 * 
 * Helper function to retrieve user query from MongoDB storage.
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


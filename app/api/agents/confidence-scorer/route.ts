import { NextRequest, NextResponse } from 'next/server'
import { ConfidenceScorer } from '@/lib/agents/confidence-scorer'
import { getConfidenceOutputsStorage } from '@/lib/storage/confidence-outputs-storage'
import { getRequestMongoDBStorage } from '@/lib/storage/request-mongodb-storage'
import { ConfidenceScore, RequestContext } from '@/types'
import { logger } from '@/utils/logger'

/**
 * API Route for Confidence Scorer
 * 
 * POST /api/agents/confidence-scorer
 * 
 * Body:
 * {
 *   agentScores: ConfidenceScore[];  // Required: Array of confidence scores from agents
 *   requestContext: RequestContext;  // Required: Request context
 * }
 * 
 * Returns:
 * {
 *   overallConfidence: number;
 *   agentScores: ConfidenceScore[];
 *   decision: 'execute' | 'review' | 'rethink' | 'escalate';
 *   thresholdUsed: {...};
 *   reasoning: string;
 *   requestId: string;
 *   requestContext: RequestContext;
 *   ...
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { agentScores, requestContext } = body

    // Validate required fields
    if (!Array.isArray(agentScores)) {
      logger.warn(`[Confidence Scorer API] Missing or invalid agentScores array`, { body })
      return NextResponse.json(
        { error: 'agentScores (array) is required' },
        { status: 400 }
      )
    }

    if (!requestContext || !requestContext.requestId) {
      logger.warn(`[Confidence Scorer API] Missing requestContext`, { body })
      return NextResponse.json(
        { error: 'requestContext with requestId is required' },
        { status: 400 }
      )
    }

    // Initialize scorer
    const scorer = new ConfidenceScorer()

    // Update request context status - ensure agentChain exists
    const requestStorage = getRequestMongoDBStorage()
    const updatedRequestContext: RequestContext = {
      ...requestContext,
      agentChain: requestContext.agentChain || [],
      status: 'in-progress',
    }
    await requestStorage.save(updatedRequestContext)

    // Score confidence
    logger.info(`[Confidence Scorer API] Scoring confidence`, {
      requestId: requestContext.requestId,
      agentScoresCount: agentScores.length,
    })

    const result = await scorer.scoreConfidence(agentScores, updatedRequestContext, req.headers)

    // Store output in MongoDB
    try {
      const outputsStorage = getConfidenceOutputsStorage()
      await outputsStorage.save(result)
    } catch (error: any) {
      logger.error(`[Confidence Scorer API] Failed to store output:`, error.message)
      // Don't fail the request if storage fails
    }

    // Update request context to completed
    result.requestContext.status = 'completed'
    await requestStorage.save(result.requestContext)

    logger.info(`[Confidence Scorer API] Confidence scoring completed`, {
      requestId: result.requestId,
      overallConfidence: result.overallConfidence,
      decision: result.decision,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    logger.error(`[Confidence Scorer API] Error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to score confidence' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint - returns confidence output by requestId
 * 
 * Query params:
 * - requestId: string (required) - Returns confidence output for that request
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const requestId = searchParams.get('requestId')

    if (!requestId) {
      return NextResponse.json(
        { error: 'requestId query parameter is required' },
        { status: 400 }
      )
    }

    const outputsStorage = getConfidenceOutputsStorage()
    const output = await outputsStorage.getByRequestId(requestId)
    
    if (!output) {
      return NextResponse.json(
        { error: 'Confidence output not found for this request' },
        { status: 404 }
      )
    }

    return NextResponse.json(output, { status: 200 })
  } catch (error: any) {
    logger.error(`[Confidence Scorer API] GET error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch confidence output' },
      { status: 500 }
    )
  }
}


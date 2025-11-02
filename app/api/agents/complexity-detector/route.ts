import { NextRequest, NextResponse } from 'next/server'
import { detectComplexity, getUserQueryFromRequest } from '@/lib/agents/complexity-detector/orchestrator'
import { resolveApiConfig } from '@/lib/services/api-config-resolver'
import { getAgentConfigStorage } from '@/lib/storage/agent-config-storage'
import { AgentConfig } from '@/types'
import { logger } from '@/utils/logger'

/**
 * API Route for Complexity Detector Agent
 * 
 * POST /api/agents/complexity-detector
 * 
 * Body:
 * {
 *   userQuery?: string;        // Optional: User query to analyze
 *   requestId?: string;        // Optional: Request ID to get query from
 *   agentId?: string;          // Optional: Agent config ID to use (defaults to 'complexity-detector')
 *   apiConfig?: {              // Optional: API configuration for LLM calls (overrides agent config)
 *     modelId: string;
 *     apiKey: string;
 *   }
 * }
 * 
 * Returns:
 * {
 *   complexity: ComplexityScore;
 *   requestId: string;
 *   requestContext: RequestContext;
 *   detectedKeywords?: string[];
 *   matchedExampleId?: string;
 *   similarity?: number;
 *   detectionMethod: 'semantic' | 'keyword' | 'llm';
 *   llmUsed?: boolean;
 *   llmExplanation?: string;
 *   llmConfidence?: number;
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userQuery, requestId, apiConfig, agentId } = body

    // Validate: must have either userQuery or requestId
    if (!userQuery && !requestId) {
      logger.warn(`[Complexity Detector API] Missing required fields`, { body })
      return NextResponse.json(
        { error: 'Either userQuery or requestId must be provided' },
        { status: 400 }
      )
    }

    // Get query from userQuery or requestId
    let query: string

    if (userQuery) {
      query = userQuery
    } else if (requestId) {
      const fetchedQuery = await getUserQueryFromRequest(requestId)
      if (!fetchedQuery) {
        logger.warn(`[Complexity Detector API] Request ID not found`, { requestId })
        return NextResponse.json(
          { error: `Request ID ${requestId} not found or has no user query` },
          { status: 404 }
        )
      }
      query = fetchedQuery
    } else {
      // This shouldn't happen due to validation above
      query = ''
    }

    // Resolve API config if provided (for backward compatibility)
    let resolvedApiConfig = null
    if (apiConfig) {
      if (!apiConfig.modelId || !apiConfig.apiKey) {
        logger.warn(`[Complexity Detector API] Invalid apiConfig provided`, { apiConfig })
        return NextResponse.json(
          { error: 'If apiConfig is provided, both modelId and apiKey are required' },
          { status: 400 }
        )
      }
      resolvedApiConfig = {
        modelId: apiConfig.modelId,
        apiKey: apiConfig.apiKey,
        temperature: apiConfig.temperature,
        maxTokens: apiConfig.maxTokens,
        topP: apiConfig.topP,
      }
    }

    // Run complexity detection using orchestrator
    // The orchestrator will handle agent config resolution and API config resolution
    const result = await detectComplexity(
      query,
      requestId,
      agentId || 'complexity-detector',
      resolvedApiConfig || undefined,
      req.headers
    )

    logger.info(`[Complexity Detector API] Detection completed`, {
      requestId: result.requestId,
      method: result.detectionMethod,
      score: result.complexity.score.toFixed(3)
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    logger.error(`[Complexity Detector API] Error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to detect complexity' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint - returns agent config
 */
export async function GET() {
  try {
    const storage = getAgentConfigStorage()
    const config = await storage.getAgentConfig('complexity-detector')

    if (!config) {
      return NextResponse.json(
        { error: 'Agent config not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ config }, { status: 200 })
  } catch (error: any) {
    logger.error(`[Complexity Detector API] GET error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch agent config' },
      { status: 500 }
    )
  }
}

/**
 * PUT endpoint - updates agent config
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const config: AgentConfig = body

    // Ensure agentId is complexity-detector
    config.agentId = 'complexity-detector'

    const storage = getAgentConfigStorage()
    const success = await storage.saveAgentConfig(config)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update agent config' },
        { status: 500 }
      )
    }

    // Return the updated config
    const updatedConfig = await storage.getAgentConfig('complexity-detector')
    return NextResponse.json({ config: updatedConfig }, { status: 200 })
  } catch (error: any) {
    logger.error(`[Complexity Detector API] PUT error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to update agent config' },
      { status: 500 }
    )
  }
}

/**
 * DELETE endpoint - deletes agent config
 */
export async function DELETE() {
  try {
    const storage = getAgentConfigStorage()
    const success = await storage.deleteAgentConfig('complexity-detector')

    if (!success) {
      return NextResponse.json(
        { error: 'Agent config not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: 'Agent config deleted successfully' },
      { status: 200 }
    )
  } catch (error: any) {
    logger.error(`[Complexity Detector API] DELETE error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete agent config' },
      { status: 500 }
    )
  }
}


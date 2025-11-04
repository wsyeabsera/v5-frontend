import { NextRequest, NextResponse } from 'next/server'
import { SummaryAgent } from '@/lib/agents/summary-agent'
import { getSummaryOutputsStorage } from '@/lib/storage/summary-outputs-storage'
import { getThoughtOutputsStorage } from '@/lib/storage/thought-outputs-storage'
import { getExecutorOutputsStorage } from '@/lib/storage/executor-outputs-storage'
import { getAgentConfigStorage } from '@/lib/storage/agent-config-storage'
import { getRequestMongoDBStorage } from '@/lib/storage/request-mongodb-storage'
import { AgentConfig, RequestContext } from '@/types'
import { logger } from '@/utils/logger'

/**
 * API Route for Summary Agent
 * 
 * POST /api/agents/summary-agent
 * 
 * Body:
 * {
 *   requestId: string;           // Required: Request ID to generate summary for
 *   agentId?: string;            // Optional: Agent config ID (defaults to 'summary-agent')
 * }
 * 
 * Returns:
 * {
 *   summary: string;
 *   thoughtsSummary?: string;
 *   executionSummary?: string;
 *   keyTakeaways?: string[];
 *   requestId: string;
 *   requestContext: RequestContext;
 *   ...
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { requestId, agentId } = body

    // Validate required fields
    if (!requestId || typeof requestId !== 'string') {
      logger.warn(`[Summary Agent API] Missing requestId`, { body })
      return NextResponse.json(
        { error: 'requestId (string) is required' },
        { status: 400 }
      )
    }

    // Resolve agent config
    const targetAgentId = agentId || 'summary-agent'
    const agentStorage = getAgentConfigStorage()
    const agentConfig = await agentStorage.getAgentConfig(targetAgentId)

    if (!agentConfig || !agentConfig.enabled) {
      logger.warn(`[Summary Agent API] Agent config not found or disabled`, { agentId: targetAgentId })
      return NextResponse.json(
        { error: `Agent '${targetAgentId}' not found or disabled. Please configure it in Settings > Agent Configurations.` },
        { status: 404 }
      )
    }

    // Get request context
    const requestStorage = getRequestMongoDBStorage()
    const requestContext = await requestStorage.get(requestId)

    if (!requestContext) {
      logger.warn(`[Summary Agent API] Request not found`, { requestId })
      return NextResponse.json(
        { error: 'Request not found for this requestId' },
        { status: 404 }
      )
    }

    // Validate that both thoughts and execution exist
    const thoughtStorage = getThoughtOutputsStorage()
    const executorStorage = getExecutorOutputsStorage()

    const thoughts = await thoughtStorage.getByRequestId(requestId)
    const execution = await executorStorage.getByRequestId(requestId)

    if (!thoughts) {
      logger.warn(`[Summary Agent API] Thoughts not found`, { requestId })
      return NextResponse.json(
        { error: 'Thought output not found for this request. Please generate thoughts first.' },
        { status: 400 }
      )
    }

    if (!execution) {
      logger.warn(`[Summary Agent API] Execution not found`, { requestId })
      return NextResponse.json(
        { error: 'Execution output not found for this request. Please execute the plan first.' },
        { status: 400 }
      )
    }

    // Initialize agent
    const agent = new SummaryAgent()
    await agent.initialize(req.headers)

    // Update request context status
    const updatedRequestContext: RequestContext = {
      ...requestContext,
      status: 'in-progress',
    }
    await requestStorage.save(updatedRequestContext)

    // Generate summary
    logger.info(`[Summary Agent API] Generating summary`, {
      requestId,
      hasThoughts: !!thoughts,
      hasExecution: !!execution,
    })

    const result = await agent.generateSummary(
      requestId,
      thoughts,
      execution,
      updatedRequestContext
    )

    // Store output in MongoDB
    try {
      const outputsStorage = getSummaryOutputsStorage()
      
      // Determine version number
      const existingSummaries = await outputsStorage.getAllVersionsByRequestId(requestId)
      const nextVersion = existingSummaries.length > 0 
        ? Math.max(...existingSummaries.map(s => s.summaryVersion || 1)) + 1
        : 1
      
      result.summaryVersion = nextVersion
      await outputsStorage.save(result)
      
      logger.info(`[Summary Agent API] Saved summary version ${nextVersion}`, {
        requestId: result.requestId,
      })
    } catch (error: any) {
      logger.error(`[Summary Agent API] Failed to store output:`, error.message)
      // Don't fail the request if storage fails
    }

    // Update request context status
    result.requestContext.status = 'completed'
    await requestStorage.save(result.requestContext)

    logger.info(`[Summary Agent API] Summary generation completed`, {
      requestId: result.requestId,
      summaryLength: result.summary.length,
      takeawaysCount: result.keyTakeaways?.length || 0,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    logger.error(`[Summary Agent API] Error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate summary' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint - returns agent config or summary by requestId
 * 
 * Query params:
 * - requestId: string (optional) - If provided, returns summary for that request
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const requestId = searchParams.get('requestId')

    // If requestId is provided, fetch summary output
    if (requestId) {
      const outputsStorage = getSummaryOutputsStorage()
      const output = await outputsStorage.getByRequestId(requestId)
      
      if (!output) {
        return NextResponse.json(
          { error: 'Summary not found for this request' },
          { status: 404 }
        )
      }

      return NextResponse.json(output, { status: 200 })
    }

    // Otherwise, return agent config
    const storage = getAgentConfigStorage()
    const config = await storage.getAgentConfig('summary-agent')

    if (!config) {
      return NextResponse.json(
        { error: 'Agent config not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ config }, { status: 200 })
  } catch (error: any) {
    logger.error(`[Summary Agent API] GET error:`, error.message, error)
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

    // Ensure agentId is summary-agent
    config.agentId = 'summary-agent'

    const storage = getAgentConfigStorage()
    const success = await storage.saveAgentConfig(config)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update agent config' },
        { status: 500 }
      )
    }

    // Return the updated config
    const updatedConfig = await storage.getAgentConfig('summary-agent')
    return NextResponse.json({ config: updatedConfig }, { status: 200 })
  } catch (error: any) {
    logger.error(`[Summary Agent API] PUT error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to update agent config' },
      { status: 500 }
    )
  }
}


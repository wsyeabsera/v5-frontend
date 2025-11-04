import { NextRequest, NextResponse } from 'next/server'
import { ReplanAgent } from '@/lib/agents/replan-agent'
import { getReplanOutputsStorage } from '@/lib/storage/replan-outputs-storage'
import { getRequestMongoDBStorage } from '@/lib/storage/request-mongodb-storage'
import { getThoughtOutputsStorage } from '@/lib/storage/thought-outputs-storage'
import { getPlannerOutputsStorage } from '@/lib/storage/planner-outputs-storage'
import { getCriticOutputsStorage } from '@/lib/storage/critic-outputs-storage'
import { getMetaOutputsStorage } from '@/lib/storage/meta-outputs-storage'
import { getAgentConfigStorage } from '@/lib/storage/agent-config-storage'
import { RequestContext, AgentConfig } from '@/types'
import { logger } from '@/utils/logger'

/**
 * POST /api/agents/replan-agent
 * 
 * Generate a new plan based on feedback from Meta, Critic, and Thought agents
 * 
 * Body:
 * {
 *   "requestId": string (required)
 *   "agentId"?: string (optional, defaults to 'replan-agent')
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { requestId, agentId } = body

    if (!requestId) {
      return NextResponse.json(
        { error: 'requestId is required' },
        { status: 400 }
      )
    }

    // Fetch all required inputs
    const requestStorage = getRequestMongoDBStorage()
    const [requestContext, thoughtOutput, plannerOutput, criticOutput, metaOutput] = await Promise.all([
      requestStorage.get(requestId).catch(() => null),
      getThoughtOutputsStorage().getByRequestId(requestId).catch(() => null),
      getPlannerOutputsStorage().getByRequestId(requestId).catch(() => null),
      getCriticOutputsStorage().getByRequestId(requestId).catch(() => null),
      getMetaOutputsStorage().getByRequestId(requestId).catch(() => null),
    ])

    // Validate required inputs
    if (!requestContext) {
      return NextResponse.json(
        { error: 'Request context not found' },
        { status: 404 }
      )
    }

    if (!thoughtOutput) {
      return NextResponse.json(
        { error: 'Thought Agent output not found. Replan requires Thought Agent to run first.' },
        { status: 404 }
      )
    }

    if (!plannerOutput) {
      return NextResponse.json(
        { error: 'Planner Agent output not found. Replan requires original plan.' },
        { status: 404 }
      )
    }

    if (!criticOutput) {
      return NextResponse.json(
        { error: 'Critic Agent output not found. Replan requires Critic Agent to run first.' },
        { status: 404 }
      )
    }

    if (!metaOutput) {
      return NextResponse.json(
        { error: 'Meta Agent output not found. Replan requires Meta Agent to run first.' },
        { status: 404 }
      )
    }

    // Check if replan is actually needed
    if (!metaOutput.shouldReplan) {
      return NextResponse.json(
        { 
          error: 'Meta Agent indicates replan is not needed',
          metaOutput: {
            shouldReplan: metaOutput.shouldReplan,
            assessment: metaOutput.assessment,
          }
        },
        { status: 400 }
      )
    }

    // Resolve agent config
    const targetAgentId = agentId || 'replan-agent'
    const agentStorage = getAgentConfigStorage()
    const agentConfig = await agentStorage.getAgentConfig(targetAgentId)

    if (!agentConfig || !agentConfig.enabled) {
      logger.warn(`[ReplanAgent API] Agent config not found or disabled`, { agentId: targetAgentId })
      return NextResponse.json(
        { error: `Agent '${targetAgentId}' not found or disabled. Please configure it in Settings > Agent Configurations.` },
        { status: 404 }
      )
    }

    // Initialize Replan Agent
    const agent = new ReplanAgent()
    await agent.initialize(req.headers)
    
    // Get user query from request context
    const userQuery = requestContext.userQuery || ''

    // Update request context status
    const updatedRequestContext: RequestContext = {
      ...requestContext,
      agentChain: requestContext.agentChain || [],
      status: 'in-progress',
    }
    requestStorage.save(updatedRequestContext)

    // Generate replan
    logger.info(`[ReplanAgent API] Generating replan`, {
      requestId,
      originalPlanId: plannerOutput.plan.id,
      metaShouldReplan: metaOutput.shouldReplan,
      criticIssuesCount: criticOutput.critique.issues.length,
    })

    const replanOutput = await agent.generateReplan(
      plannerOutput,
      metaOutput,
      criticOutput,
      thoughtOutput,
      userQuery,
      updatedRequestContext
    )

    // Save to storage
    const storage = getReplanOutputsStorage()
    await storage.save(replanOutput)

    // Update request context to completed
    replanOutput.requestContext.status = 'completed'
    await requestStorage.save(replanOutput.requestContext)

    logger.info(`[ReplanAgent API] Replan generated`, {
      requestId: replanOutput.requestId,
      planVersion: replanOutput.planVersion,
      originalPlanId: replanOutput.originalPlanId,
      stepsAdded: replanOutput.changesFromOriginal.stepsAdded,
      stepsRemoved: replanOutput.changesFromOriginal.stepsRemoved,
      stepsModified: replanOutput.changesFromOriginal.stepsModified,
    })

    return NextResponse.json(replanOutput, { status: 200 })
  } catch (error: any) {
    logger.error('[ReplanAgent API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate replan' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/agents/replan-agent
 * 
 * Get replan output by request ID and optional version
 * 
 * Query params:
 * - requestId: string (required)
 * - planVersion: number (optional, defaults to latest)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const requestId = searchParams.get('requestId')
    const planVersion = searchParams.get('planVersion')

    if (!requestId) {
      return NextResponse.json(
        { error: 'requestId is required' },
        { status: 400 }
      )
    }

    const storage = getReplanOutputsStorage()

    let output

    if (planVersion) {
      output = await storage.getByRequestIdAndVersion(requestId, parseInt(planVersion, 10))
    } else {
      output = await storage.getLatestByRequestId(requestId)
    }

    if (!output) {
      return NextResponse.json(
        { error: 'Replan output not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(output, { status: 200 })
  } catch (error: any) {
    logger.error('[ReplanAgent API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch replan output' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/agents/replan-agent
 * 
 * Update replan agent configuration
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const config: AgentConfig = body

    // Ensure agentId is replan-agent
    config.agentId = 'replan-agent'

    const storage = getAgentConfigStorage()
    const success = await storage.saveAgentConfig(config)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update agent config' },
        { status: 500 }
      )
    }

    // Return the updated config
    const updatedConfig = await storage.getAgentConfig('replan-agent')
    return NextResponse.json({ config: updatedConfig }, { status: 200 })
  } catch (error: any) {
    logger.error(`[ReplanAgent API] PUT error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to update agent config' },
      { status: 500 }
    )
  }
}


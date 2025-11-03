import { NextRequest, NextResponse } from 'next/server'
import { PlannerAgent } from '@/lib/agents/planner-agent'
import { getPlannerOutputsStorage } from '@/lib/storage/planner-outputs-storage'
import { getAgentConfigStorage } from '@/lib/storage/agent-config-storage'
import { getRequestMongoDBStorage } from '@/lib/storage/request-mongodb-storage'
import { AgentConfig, RequestContext, Thought } from '@/types'
import { logger } from '@/utils/logger'

/**
 * API Route for Planner Agent
 * 
 * POST /api/agents/planner-agent
 * 
 * Body:
 * {
 *   thoughts: Thought[];           // Required: Thoughts from Thought Agent
 *   userQuery: string;             // Required: Original user query
 *   requestContext: RequestContext; // Required: Request context from Thought Agent
 *   agentId?: string;              // Optional: Agent config ID (defaults to 'planner-agent')
 * }
 * 
 * Returns:
 * {
 *   plan: Plan;
 *   rationale: string;
 *   basedOnThoughts: string[];
 *   requestId: string;
 *   requestContext: RequestContext;
 *   ...
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { thoughts, userQuery, requestContext, agentId } = body

    // Validate required fields
    if (!thoughts || !Array.isArray(thoughts) || thoughts.length === 0) {
      logger.warn(`[Planner Agent API] Missing or empty thoughts array`, { body })
      return NextResponse.json(
        { error: 'thoughts (array) is required and must not be empty' },
        { status: 400 }
      )
    }

    if (!userQuery || typeof userQuery !== 'string') {
      logger.warn(`[Planner Agent API] Missing userQuery`, { body })
      return NextResponse.json(
        { error: 'userQuery (string) is required' },
        { status: 400 }
      )
    }

    if (!requestContext || !requestContext.requestId) {
      logger.warn(`[Planner Agent API] Missing requestContext`, { body })
      return NextResponse.json(
        { error: 'requestContext with requestId is required' },
        { status: 400 }
      )
    }

    // Resolve agent config
    const targetAgentId = agentId || 'planner-agent'
    const agentStorage = getAgentConfigStorage()
    const agentConfig = await agentStorage.getAgentConfig(targetAgentId)

    if (!agentConfig || !agentConfig.enabled) {
      logger.warn(`[Planner Agent API] Agent config not found or disabled`, { agentId: targetAgentId })
      return NextResponse.json(
        { error: `Agent '${targetAgentId}' not found or disabled. Please configure it in Settings > Agent Configurations.` },
        { status: 404 }
      )
    }

    // Initialize agent
    const agent = new PlannerAgent()
    await agent.initialize(req.headers)

    // Update request context status
    const requestStorage = getRequestMongoDBStorage()
    const updatedRequestContext: RequestContext = {
      ...requestContext,
      userQuery,
      status: 'in-progress',
    }
    await requestStorage.save(updatedRequestContext)

    // Determine plan version by checking existing plans
    const outputsStorage = getPlannerOutputsStorage()
    const existingPlans = await outputsStorage.getAllPlansByRequestId(requestContext.requestId)
    const nextPlanVersion = existingPlans.length > 0 
      ? Math.max(...existingPlans.map(p => p.plan?.planVersion || 1)) + 1
      : 1

    logger.info(`[Planner Agent API] Generating plan`, {
      requestId: requestContext.requestId,
      thoughtsCount: thoughts.length,
      queryLength: userQuery.length,
      planVersion: nextPlanVersion,
    })

    const result = await agent.generatePlan(
      thoughts,
      userQuery,
      updatedRequestContext
    )

    // Set plan version after generation
    if (result.plan) {
      result.plan.planVersion = nextPlanVersion
    }

    // Store output in MongoDB
    try {
      const outputsStorage = getPlannerOutputsStorage()
      await outputsStorage.save(result)
    } catch (error: any) {
      logger.error(`[Planner Agent API] Failed to store output:`, error.message)
      // Don't fail the request if storage fails
    }

    // Update request context to completed
    result.requestContext.status = 'completed'
    await requestStorage.save(result.requestContext)

    logger.info(`[Planner Agent API] Plan generation completed`, {
      requestId: result.requestId,
      stepsCount: result.plan.steps.length,
      confidence: result.plan.confidence.toFixed(2),
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    logger.error(`[Planner Agent API] Error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate plan' },
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
    const config = await storage.getAgentConfig('planner-agent')

    if (!config) {
      return NextResponse.json(
        { error: 'Agent config not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ config }, { status: 200 })
  } catch (error: any) {
    logger.error(`[Planner Agent API] GET error:`, error.message, error)
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

    // Ensure agentId is planner-agent
    config.agentId = 'planner-agent'

    const storage = getAgentConfigStorage()
    const success = await storage.saveAgentConfig(config)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update agent config' },
        { status: 500 }
      )
    }

    // Return the updated config
    const updatedConfig = await storage.getAgentConfig('planner-agent')
    return NextResponse.json({ config: updatedConfig }, { status: 200 })
  } catch (error: any) {
    logger.error(`[Planner Agent API] PUT error:`, error.message, error)
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
    const success = await storage.deleteAgentConfig('planner-agent')

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
    logger.error(`[Planner Agent API] DELETE error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete agent config' },
      { status: 500 }
    )
  }
}


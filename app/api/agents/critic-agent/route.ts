import { NextRequest, NextResponse } from 'next/server'
import { CriticAgent } from '@/lib/agents/critic-agent'
import { getCriticOutputsStorage } from '@/lib/storage/critic-outputs-storage'
import { getAgentConfigStorage } from '@/lib/storage/agent-config-storage'
import { getRequestMongoDBStorage } from '@/lib/storage/request-mongodb-storage'
import { AgentConfig, RequestContext, Plan } from '@/types'
import { logger } from '@/utils/logger'

/**
 * API Route for Critic Agent
 * 
 * POST /api/agents/critic-agent
 * 
 * Body:
 * {
 *   plan: Plan;                   // Required: Plan from Planner Agent
 *   userQuery: string;            // Required: Original user query
 *   requestContext: RequestContext; // Required: Request context from Planner Agent
 *   userFeedback?: Array<{questionId: string, answer: string}>; // Optional: User responses to questions
 *   agentId?: string;             // Optional: Agent config ID (defaults to 'critic-agent')
 * }
 * 
 * Returns:
 * {
 *   critique: Critique;
 *   planId: string;
 *   requiresUserFeedback: boolean;
 *   requestId: string;
 *   requestContext: RequestContext;
 *   ...
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { plan, userQuery, requestContext, userFeedback, agentId } = body

    // Validate required fields
    if (!plan) {
      logger.warn(`[Critic Agent API] Missing plan`, { body })
      return NextResponse.json(
        { error: 'plan is required' },
        { status: 400 }
      )
    }

    if (!userQuery || typeof userQuery !== 'string') {
      logger.warn(`[Critic Agent API] Missing userQuery`, { body })
      return NextResponse.json(
        { error: 'userQuery (string) is required' },
        { status: 400 }
      )
    }

    if (!requestContext || !requestContext.requestId) {
      logger.warn(`[Critic Agent API] Missing requestContext`, { body })
      return NextResponse.json(
        { error: 'requestContext with requestId is required' },
        { status: 400 }
      )
    }

    // Resolve agent config
    const targetAgentId = agentId || 'critic-agent'
    const agentStorage = getAgentConfigStorage()
    const agentConfig = await agentStorage.getAgentConfig(targetAgentId)

    if (!agentConfig || !agentConfig.enabled) {
      logger.warn(`[Critic Agent API] Agent config not found or disabled`, { agentId: targetAgentId })
      return NextResponse.json(
        { error: `Agent '${targetAgentId}' not found or disabled. Please configure it in Settings > Agent Configurations.` },
        { status: 404 }
      )
    }

    // Initialize agent
    const agent = new CriticAgent()
    await agent.initialize(req.headers)

    // Update request context status
    const requestStorage = getRequestMongoDBStorage()
    const updatedRequestContext: RequestContext = {
      ...requestContext,
      userQuery,
      status: 'in-progress',
    }
    await requestStorage.save(updatedRequestContext)

    // Generate critique
    logger.info(`[Critic Agent API] Generating critique`, {
      requestId: requestContext.requestId,
      planId: plan.id,
      stepsCount: plan.steps?.length || 0,
      hasUserFeedback: !!userFeedback,
    })

    const result = await agent.critiquePlan(
      plan,
      userQuery,
      updatedRequestContext,
      userFeedback
    )

    // Store output in MongoDB
    try {
      const outputsStorage = getCriticOutputsStorage()
      await outputsStorage.save(result)
    } catch (error: any) {
      logger.error(`[Critic Agent API] Failed to store output:`, error.message)
      // Don't fail the request if storage fails
    }

    // Update request context to completed
    result.requestContext.status = 'completed'
    await requestStorage.save(result.requestContext)

    logger.info(`[Critic Agent API] Critique generation completed`, {
      requestId: result.requestId,
      overallScore: result.critique.overallScore.toFixed(2),
      recommendation: result.critique.recommendation,
      issuesCount: result.critique.issues.length,
      questionsCount: result.critique.followUpQuestions.length,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    logger.error(`[Critic Agent API] Error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate critique' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint - returns critique by requestId
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

    const storage = getCriticOutputsStorage()
    const output = await storage.getByRequestId(requestId)

    if (!output) {
      return NextResponse.json(
        { error: 'Critique not found for this request' },
        { status: 404 }
      )
    }

    return NextResponse.json(output, { status: 200 })
  } catch (error: any) {
    logger.error(`[Critic Agent API] GET error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch critique' },
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

    // Ensure agentId is critic-agent
    config.agentId = 'critic-agent'

    const storage = getAgentConfigStorage()
    const success = await storage.saveAgentConfig(config)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update agent config' },
        { status: 500 }
      )
    }

    // Return the updated config
    const updatedConfig = await storage.getAgentConfig('critic-agent')
    return NextResponse.json({ config: updatedConfig }, { status: 200 })
  } catch (error: any) {
    logger.error(`[Critic Agent API] PUT error:`, error.message, error)
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
    const success = await storage.deleteAgentConfig('critic-agent')

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
    logger.error(`[Critic Agent API] DELETE error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete agent config' },
      { status: 500 }
    )
  }
}

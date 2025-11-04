import { NextRequest, NextResponse } from 'next/server'
import { ExecutorAgent } from '@/lib/agents/executor-agent/index'
import { getExecutorOutputsStorage } from '@/lib/storage/executor-outputs-storage'
import { getPlannerOutputsStorage } from '@/lib/storage/planner-outputs-storage'
import { getCriticOutputsStorage } from '@/lib/storage/critic-outputs-storage'
import { getAgentConfigStorage } from '@/lib/storage/agent-config-storage'
import { getRequestMongoDBStorage } from '@/lib/storage/request-mongodb-storage'
import { RequestContext, Plan, ExecutorAgentOutput, CriticAgentOutput, AgentConfig } from '@/types'
import { logger } from '@/utils/logger'

/**
 * API Route for Executor Agent
 * 
 * POST /api/agents/executor-agent
 * 
 * Body:
 * {
 *   plan?: Plan;                    // Optional: Plan from Planner Agent (will fetch if not provided)
 *   requestContext: RequestContext;  // Required: Request context
 *   userQuery: string;               // Required: Original user query
 *   userFeedback?: Array<{questionId: string, answer: string}>; // Optional: User responses to questions
 *   agentId?: string;               // Optional: Agent config ID (defaults to 'executor-agent')
 * }
 * 
 * Returns:
 * {
 *   executionResult: PlanExecutionResult;
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
    const { plan, requestContext, userQuery, userFeedback, agentId } = body

    // Validate required fields
    if (!userQuery || typeof userQuery !== 'string') {
      logger.warn(`[Executor Agent API] Missing userQuery`, { body })
      return NextResponse.json(
        { error: 'userQuery (string) is required' },
        { status: 400 }
      )
    }

    if (!requestContext || !requestContext.requestId) {
      logger.warn(`[Executor Agent API] Missing requestContext`, { body })
      return NextResponse.json(
        { error: 'requestContext with requestId is required' },
        { status: 400 }
      )
    }

    // Resolve agent config
    const targetAgentId = agentId || 'executor-agent'
    const agentStorage = getAgentConfigStorage()
    const agentConfig = await agentStorage.getAgentConfig(targetAgentId)

    if (!agentConfig || !agentConfig.enabled) {
      logger.warn(`[Executor Agent API] Agent config not found or disabled`, { agentId: targetAgentId })
      return NextResponse.json(
        { error: `Agent '${targetAgentId}' not found or disabled. Please configure it in Settings > Agent Configurations.` },
        { status: 404 }
      )
    }

    // Initialize agent
    const agent = new ExecutorAgent()
    await agent.initialize(req.headers)

    // Update request context status
    const requestStorage = getRequestMongoDBStorage()
    const updatedRequestContext: RequestContext = {
      ...requestContext,
      userQuery,
      status: 'in-progress',
    }
    await requestStorage.save(updatedRequestContext)

    // Retrieve plan if not provided
    let planToExecute = plan
    if (!planToExecute) {
      logger.info(`[Executor Agent API] Fetching plan from storage`, {
        requestId: requestContext.requestId,
      })
      
      const plannerStorage = getPlannerOutputsStorage()
      const plannerOutput = await plannerStorage.getByRequestId(requestContext.requestId)
      
      if (!plannerOutput || !plannerOutput.plan) {
        logger.warn(`[Executor Agent API] No plan found for request`, {
          requestId: requestContext.requestId,
        })
        return NextResponse.json(
          { error: 'Plan not found. Please provide a plan or ensure planner agent has generated one.' },
          { status: 404 }
        )
      }
      
      planToExecute = plannerOutput.plan
    }

    // Retrieve critique if available
    let critique: CriticAgentOutput | undefined
    try {
      const criticStorage = getCriticOutputsStorage()
      critique = await criticStorage.getByRequestId(requestContext.requestId) || undefined
      
      if (critique) {
        logger.info(`[Executor Agent API] Found critique`, {
          requestId: requestContext.requestId,
          recommendation: critique.critique.recommendation,
        })
      }
    } catch (error: any) {
      logger.warn(`[Executor Agent API] Could not fetch critique`, {
        requestId: requestContext.requestId,
        error: error.message,
      })
      // Continue without critique
    }

    // Handle user feedback - resume execution
    if (userFeedback && userFeedback.length > 0) {
      logger.info(`[Executor Agent API] Resuming execution with user feedback`, {
        requestId: requestContext.requestId,
        feedbackCount: userFeedback.length,
      })

      // Fetch previous execution state
      const executorStorage = getExecutorOutputsStorage()
      const previousExecution = await executorStorage.getByRequestId(requestContext.requestId)

      if (previousExecution) {
        // Merge user answers into questions
        const updatedQuestions = previousExecution.executionResult.questionsAsked.map(q => {
          const feedback = userFeedback.find((f: { questionId: string; answer: string }) => f.questionId === q.id)
          if (feedback) {
            return { ...q, userAnswer: feedback.answer }
          }
          return q
        })

        // Update partial results or parameters based on feedback
        // The agent will use this context when resuming
        logger.debug(`[Executor Agent API] Updated questions with user answers`, {
          requestId: requestContext.requestId,
          answeredCount: updatedQuestions.filter(q => q.userAnswer).length,
        })
      }
    }

    // Execute plan
    logger.info(`[Executor Agent API] Executing plan`, {
      requestId: requestContext.requestId,
      planId: planToExecute.id,
      stepsCount: planToExecute.steps?.length || 0,
      hasCritique: !!critique,
      hasUserFeedback: !!(userFeedback && userFeedback.length > 0),
    })

    const result = await agent.executePlan(
      planToExecute,
      updatedRequestContext,
      critique,
      userFeedback,
      userQuery
    )

    // Store output in MongoDB
    try {
      const outputsStorage = getExecutorOutputsStorage()
      
      // Determine version number
      const existingExecutions = await outputsStorage.getAllVersionsByRequestId(requestContext.requestId)
      const nextVersion = existingExecutions.length > 0 
        ? Math.max(...existingExecutions.map(e => e.executionVersion || 1)) + 1
        : 1
      
      result.executionVersion = nextVersion
      await outputsStorage.save(result)
      
      logger.info(`[Executor Agent API] Saved execution version ${nextVersion}`, {
        requestId: result.requestId,
      })
    } catch (error: any) {
      logger.error(`[Executor Agent API] Failed to store output:`, error.message)
      // Don't fail the request if storage fails
    }

    // Update request context status
    if (result.executionResult.overallSuccess) {
      result.requestContext.status = 'completed'
    } else if (result.requiresUserFeedback) {
      result.requestContext.status = 'in-progress' // Keep in-progress if waiting for feedback
    } else {
      result.requestContext.status = 'failed'
    }
    await requestStorage.save(result.requestContext)

    logger.info(`[Executor Agent API] Execution completed`, {
      requestId: result.requestId,
      overallSuccess: result.executionResult.overallSuccess,
      stepsExecuted: result.executionResult.steps.length,
      stepsSucceeded: result.executionResult.steps.filter(s => s.success).length,
      questionsAsked: result.executionResult.questionsAsked.length,
      requiresFeedback: result.requiresUserFeedback,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    logger.error(`[Executor Agent API] Error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to execute plan' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint - returns agent config or execution by requestId
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const requestId = searchParams.get('requestId')

    // If requestId is provided, return execution
    if (requestId) {
      const storage = getExecutorOutputsStorage()
      const output = await storage.getByRequestId(requestId)

      if (!output) {
        return NextResponse.json(
          { error: 'Execution not found for this request' },
          { status: 404 }
        )
      }

      return NextResponse.json(output, { status: 200 })
    }

    // Otherwise, return agent config
    const storage = getAgentConfigStorage()
    const config = await storage.getAgentConfig('executor-agent')

    if (!config) {
      return NextResponse.json(
        { error: 'Agent config not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ config }, { status: 200 })
  } catch (error: any) {
    logger.error(`[Executor Agent API] GET error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch execution' },
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

    // Ensure agentId is executor-agent
    config.agentId = 'executor-agent'

    const storage = getAgentConfigStorage()
    const success = await storage.saveAgentConfig(config)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update agent config' },
        { status: 500 }
      )
    }

    // Return the updated config
    const updatedConfig = await storage.getAgentConfig('executor-agent')
    return NextResponse.json({ config: updatedConfig }, { status: 200 })
  } catch (error: any) {
    logger.error(`[Executor Agent API] PUT error:`, error.message, error)
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
    const success = await storage.deleteAgentConfig('executor-agent')

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete agent config' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    logger.error(`[Executor Agent API] DELETE error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete agent config' },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { CriticAgent } from '@/lib/agents/critic-agent'
import { getCriticOutputsStorage } from '@/lib/storage/critic-outputs-storage'
import { getThoughtOutputsStorage } from '@/lib/storage/thought-outputs-storage'
import { getPlannerOutputsStorage } from '@/lib/storage/planner-outputs-storage'
import { getAgentConfigStorage } from '@/lib/storage/agent-config-storage'
import { getRequestMongoDBStorage } from '@/lib/storage/request-mongodb-storage'
import { AgentConfig, RequestContext, Plan, FollowUpQuestion } from '@/types'
import { logger } from '@/utils/logger'

/**
 * Format user feedback into context string for plan regeneration
 */
function formatFeedbackContext(
  questions: FollowUpQuestion[], 
  feedback: Array<{questionId: string, answer: string}>
): string {
  const answeredQuestions = questions
    .filter(q => feedback.some(f => f.questionId === q.id))
    .map(q => {
      const answer = feedback.find(f => f.questionId === q.id)?.answer
      return `${q.question} -> ${answer}`
    })
  
  if (answeredQuestions.length === 0) return ''
  
  return `\n\n[User clarifications: ${answeredQuestions.join('; ')}]`
}

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
    const { plan, userQuery, requestContext, userFeedback, refinedUserQuery, agentId } = body

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

    // If user provided a refined query or feedback, regenerate thoughts and plan first
    let finalPlan = plan
    if ((refinedUserQuery && refinedUserQuery.trim()) || (userFeedback && userFeedback.length > 0)) {
      logger.info(`[Critic Agent API] Regenerating thoughts and plan with user input`, {
        requestId: requestContext.requestId,
        originalQuery: userQuery,
        hasRefinedQuery: !!(refinedUserQuery && refinedUserQuery.trim()),
        hasFeedback: !!(userFeedback && userFeedback.length > 0),
      })

      // Build the enhanced query from refined query and/or feedback
      let enhancedQuery = userQuery
      
      // Add refined query if provided
      if (refinedUserQuery && refinedUserQuery.trim()) {
        enhancedQuery = refinedUserQuery.trim()
      }
      
      // Add feedback context if questions were answered
      if (userFeedback && userFeedback.length > 0) {
        // Fetch previous critique to get the questions
        const criticStorage = getCriticOutputsStorage()
        const previousCritique = await criticStorage.getByRequestId(requestContext.requestId)
        
        if (previousCritique && previousCritique.critique.followUpQuestions) {
          const feedbackContext = formatFeedbackContext(
            previousCritique.critique.followUpQuestions,
            userFeedback
          )
          enhancedQuery += feedbackContext
          
          logger.info(`[Critic Agent API] Added feedback context to query`, {
            requestId: requestContext.requestId,
            feedbackLength: feedbackContext.length,
            enhancedQueryLength: enhancedQuery.length,
          })
        } else {
          logger.warn(`[Critic Agent API] Could not fetch previous critique for feedback context`, {
            requestId: requestContext.requestId,
          })
        }
      }
      
      logger.debug(`[Critic Agent API] Enhanced query for regeneration`, {
        requestId: requestContext.requestId,
        originalLength: userQuery.length,
        enhancedLength: enhancedQuery.length,
        hasRefinedQuery: !!(refinedUserQuery && refinedUserQuery.trim()),
        hasFeedbackContext: enhancedQuery !== userQuery,
      })
      
      // Fetch original thought output
      const thoughtStorage = getThoughtOutputsStorage()
      const thoughtOutput = await thoughtStorage.getByRequestId(requestContext.requestId)
      
      if (thoughtOutput && thoughtOutput.thoughts) {
        // Regenerate thoughts with enhanced query
        const ThoughtAgent = (await import('@/lib/agents/thought-agent')).ThoughtAgent
        const thoughtAgent = new ThoughtAgent()
        await thoughtAgent.initialize(req.headers)
        
        const updatedThoughts = await thoughtAgent.generateThought(
          enhancedQuery,
          updatedRequestContext,
          {
            complexityScore: thoughtOutput.complexityScore,
            reasoningPasses: thoughtOutput.totalPasses,
          }
        )
        
        // Regenerate plan with updated thoughts
        const PlannerAgent = (await import('@/lib/agents/planner-agent')).PlannerAgent
        const plannerAgent = new PlannerAgent()
        await plannerAgent.initialize(req.headers)
        
        // Determine next plan version
        const plannerStorage = getPlannerOutputsStorage()
        const existingPlans = await plannerStorage.getAllPlansByRequestId(requestContext.requestId)
        const nextPlanVersion = existingPlans.length > 0 
          ? Math.max(...existingPlans.map(p => p.plan?.planVersion || 1)) + 1
          : 1
        
        const updatedPlanOutput = await plannerAgent.generatePlan(
          updatedThoughts.thoughts,
          enhancedQuery,
          updatedRequestContext
        )
        
        // Set plan version and save
        if (updatedPlanOutput.plan) {
          updatedPlanOutput.plan.planVersion = nextPlanVersion
        }
        
        try {
          await plannerStorage.save(updatedPlanOutput)
          logger.info(`[Critic Agent API] New plan saved with version ${nextPlanVersion}`)
        } catch (error: any) {
          logger.error(`[Critic Agent API] Failed to save new plan:`, error.message)
        }
        
        finalPlan = updatedPlanOutput.plan
        logger.info(`[Critic Agent API] Plan regenerated with user input`, {
          requestId: requestContext.requestId,
          newStepsCount: finalPlan.steps.length,
          planVersion: nextPlanVersion,
        })
      }
    }

    // Generate critique
    logger.info(`[Critic Agent API] Generating critique`, {
      requestId: requestContext.requestId,
      planId: finalPlan.id,
      stepsCount: finalPlan.steps?.length || 0,
      hasUserFeedback: !!userFeedback,
      hasRefinedQuery: !!refinedUserQuery,
    })

    const result = await agent.critiquePlan(
      finalPlan,
      refinedUserQuery?.trim() || userQuery,
      updatedRequestContext,
      userFeedback
    )

    // Store output in MongoDB
    try {
      const outputsStorage = getCriticOutputsStorage()
      
      // Determine version number
      const existingCritiques = await outputsStorage.getAllVersionsByRequestId(requestContext.requestId)
      const nextVersion = existingCritiques.length > 0 
        ? Math.max(...existingCritiques.map(c => c.critiqueVersion || 1)) + 1
        : 1
      
      result.critiqueVersion = nextVersion
      await outputsStorage.save(result)
      
      logger.info(`[Critic Agent API] Saved critique version ${nextVersion}`, {
        requestId: result.requestId,
      })
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

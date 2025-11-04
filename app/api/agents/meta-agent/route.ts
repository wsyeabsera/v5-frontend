import { NextRequest, NextResponse } from 'next/server'
import { MetaAgent } from '@/lib/agents/meta-agent'
import { getMetaOutputsStorage } from '@/lib/storage/meta-outputs-storage'
import { getAgentConfigStorage } from '@/lib/storage/agent-config-storage'
import { getRequestMongoDBStorage } from '@/lib/storage/request-mongodb-storage'
import { RequestContext } from '@/types'
import { logger } from '@/utils/logger'

/**
 * API Route for Meta Agent
 * 
 * POST /api/agents/meta-agent
 * 
 * Body:
 * {
 *   context: {                    // Required: Context from other agents
 *     thoughts?: ThoughtAgentOutput;
 *     plan?: PlannerAgentOutput;
 *     critique?: CriticAgentOutput;
 *     confidenceScore?: ConfidenceScorerOutput;
 *   };
 *   requestContext: RequestContext; // Required: Request context
 *   agentId?: string;               // Optional: Agent config ID (defaults to 'meta-agent')
 * }
 * 
 * Returns:
 * {
 *   reasoningQuality: number;
 *   shouldReplan: boolean;
 *   shouldDeepenReasoning: boolean;
 *   recommendedActions: string[];
 *   assessment: string;
 *   requestId: string;
 *   requestContext: RequestContext;
 *   ...
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { context, requestContext, agentId } = body

    // Validate required fields
    if (!context || typeof context !== 'object') {
      logger.warn(`[Meta Agent API] Missing context`, { body })
      return NextResponse.json(
        { error: 'context (object) is required' },
        { status: 400 }
      )
    }

    if (!requestContext || !requestContext.requestId) {
      logger.warn(`[Meta Agent API] Missing requestContext`, { body })
      return NextResponse.json(
        { error: 'requestContext with requestId is required' },
        { status: 400 }
      )
    }

    // Resolve agent config
    const targetAgentId = agentId || 'meta-agent'
    const agentStorage = getAgentConfigStorage()
    const agentConfig = await agentStorage.getAgentConfig(targetAgentId)

    if (!agentConfig || !agentConfig.enabled) {
      logger.warn(`[Meta Agent API] Agent config not found or disabled`, { agentId: targetAgentId })
      return NextResponse.json(
        { error: `Agent '${targetAgentId}' not found or disabled. Please configure it in Settings > Agent Configurations.` },
        { status: 404 }
      )
    }

    // Initialize agent
    const agent = new MetaAgent()
    await agent.initialize(req.headers)

    // Update request context status
    const requestStorage = getRequestMongoDBStorage()
    const updatedRequestContext: RequestContext = {
      ...requestContext,
      agentChain: requestContext.agentChain || [],
      status: 'in-progress',
    }
    await requestStorage.save(updatedRequestContext)

    // Assess reasoning
    logger.info(`[Meta Agent API] Assessing reasoning quality`, {
      requestId: requestContext.requestId,
      hasThoughts: !!context.thoughts,
      hasPlan: !!context.plan,
      hasCritique: !!context.critique,
      hasConfidenceScore: !!context.confidenceScore,
    })

    const result = await agent.assessReasoning(context, updatedRequestContext)

    // Store output in MongoDB
    try {
      const outputsStorage = getMetaOutputsStorage()
      await outputsStorage.save(result)
    } catch (error: any) {
      logger.error(`[Meta Agent API] Failed to store output:`, error.message)
      // Don't fail the request if storage fails
    }

    // Update request context to completed
    result.requestContext.status = 'completed'
    await requestStorage.save(result.requestContext)

    logger.info(`[Meta Agent API] Reasoning assessment completed`, {
      requestId: result.requestId,
      reasoningQuality: result.reasoningQuality,
      shouldReplan: result.shouldReplan,
      shouldDeepenReasoning: result.shouldDeepenReasoning,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    logger.error(`[Meta Agent API] Error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to assess reasoning' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint - returns meta output by requestId
 * 
 * Query params:
 * - requestId: string (optional) - If provided, returns meta output for that request
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const requestId = searchParams.get('requestId')

    // If requestId is provided, fetch meta output
    if (requestId) {
      const outputsStorage = getMetaOutputsStorage()
      const output = await outputsStorage.getByRequestId(requestId)
      
      if (!output) {
        return NextResponse.json(
          { error: 'Meta output not found for this request' },
          { status: 404 }
        )
      }

      return NextResponse.json(output, { status: 200 })
    }

    // Otherwise, return agent config
    const storage = getAgentConfigStorage()
    const config = await storage.getAgentConfig('meta-agent')

    if (!config) {
      return NextResponse.json(
        { error: 'Agent config not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ config }, { status: 200 })
  } catch (error: any) {
    logger.error(`[Meta Agent API] GET error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch agent config' },
      { status: 500 }
    )
  }
}


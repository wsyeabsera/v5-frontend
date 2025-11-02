import { NextRequest, NextResponse } from 'next/server'
import { ThoughtAgent } from '@/lib/agents/thought-agent'
import { getThoughtOutputsStorage } from '@/lib/storage/thought-outputs-storage'
import { getAgentConfigStorage } from '@/lib/storage/agent-config-storage'
import { getRequestMongoDBStorage } from '@/lib/storage/request-mongodb-storage'
import { AgentConfig, RequestContext } from '@/types'
import { logger } from '@/utils/logger'

/**
 * API Route for Thought Agent
 * 
 * POST /api/agents/thought-agent
 * 
 * Body:
 * {
 *   userQuery: string;           // Required: User query to analyze
 *   requestContext: RequestContext; // Required: Request context from Complexity Detector
 *   agentId?: string;            // Optional: Agent config ID (defaults to 'thought-agent')
 *   context?: {                   // Optional: Additional context
 *     previousThoughts?: Thought[];
 *     availableTools?: string[];
 *     complexityScore?: number;
 *     reasoningPasses?: number;
 *   }
 * }
 * 
 * Returns:
 * {
 *   thoughts: Thought[];
 *   primaryApproach: string;
 *   keyInsights: string[];
 *   recommendedTools: string[];
 *   requestId: string;
 *   requestContext: RequestContext;
 *   ...
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userQuery, requestContext, agentId, context } = body

    // Validate required fields
    if (!userQuery || typeof userQuery !== 'string') {
      logger.warn(`[Thought Agent API] Missing userQuery`, { body })
      return NextResponse.json(
        { error: 'userQuery (string) is required' },
        { status: 400 }
      )
    }

    if (!requestContext || !requestContext.requestId) {
      logger.warn(`[Thought Agent API] Missing requestContext`, { body })
      return NextResponse.json(
        { error: 'requestContext with requestId is required' },
        { status: 400 }
      )
    }

    // Resolve agent config
    const targetAgentId = agentId || 'thought-agent'
    const agentStorage = getAgentConfigStorage()
    const agentConfig = await agentStorage.getAgentConfig(targetAgentId)

    if (!agentConfig || !agentConfig.enabled) {
      logger.warn(`[Thought Agent API] Agent config not found or disabled`, { agentId: targetAgentId })
      return NextResponse.json(
        { error: `Agent '${targetAgentId}' not found or disabled. Please configure it in Settings > Agent Configurations.` },
        { status: 404 }
      )
    }

    // Initialize agent
    const agent = new ThoughtAgent()
    await agent.initialize(req.headers)

    // Update request context status
    const requestStorage = getRequestMongoDBStorage()
    const updatedRequestContext: RequestContext = {
      ...requestContext,
      status: 'in-progress',
    }
    await requestStorage.save(updatedRequestContext)

    // Generate thoughts
    logger.info(`[Thought Agent API] Generating thoughts`, {
      requestId: requestContext.requestId,
      queryLength: userQuery.length,
    })

    const result = await agent.generateThought(
      userQuery,
      updatedRequestContext,
      context || {}
    )

    // Store output in MongoDB
    try {
      const outputsStorage = getThoughtOutputsStorage()
      await outputsStorage.save(result)
    } catch (error: any) {
      logger.error(`[Thought Agent API] Failed to store output:`, error.message)
      // Don't fail the request if storage fails
    }

    // Update request context to completed
    result.requestContext.status = 'completed'
    await requestStorage.save(result.requestContext)

    logger.info(`[Thought Agent API] Thought generation completed`, {
      requestId: result.requestId,
      thoughtsCount: result.thoughts.length,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    logger.error(`[Thought Agent API] Error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate thoughts' },
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
    const config = await storage.getAgentConfig('thought-agent')

    if (!config) {
      return NextResponse.json(
        { error: 'Agent config not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ config }, { status: 200 })
  } catch (error: any) {
    logger.error(`[Thought Agent API] GET error:`, error.message, error)
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

    // Ensure agentId is thought-agent
    config.agentId = 'thought-agent'

    const storage = getAgentConfigStorage()
    const success = await storage.saveAgentConfig(config)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update agent config' },
        { status: 500 }
      )
    }

    // Return the updated config
    const updatedConfig = await storage.getAgentConfig('thought-agent')
    return NextResponse.json({ config: updatedConfig }, { status: 200 })
  } catch (error: any) {
    logger.error(`[Thought Agent API] PUT error:`, error.message, error)
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
    const success = await storage.deleteAgentConfig('thought-agent')

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
    logger.error(`[Thought Agent API] DELETE error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete agent config' },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { ToolMemoryAgent } from '@/lib/agents/tool-memory-agent'
import { getAgentConfigStorage } from '@/lib/storage/agent-config-storage'
import { getRequestMongoDBStorage } from '@/lib/storage/request-mongodb-storage'
import { AgentConfig, RequestContext, ComplexityScore } from '@/types'
import { logger } from '@/utils/logger'

/**
 * API Route for Tool Memory Agent
 * 
 * POST /api/agents/tool-memory-agent
 * 
 * Body:
 * {
 *   userQuery: string;           // Required: User query to analyze
 *   requestContext: RequestContext; // Required: Request context
 *   complexityScore?: ComplexityScore; // Optional: Complexity score from Complexity Detector
 *   agentId?: string;            // Optional: Agent config ID (defaults to 'tool-memory-agent')
 * }
 * 
 * Returns:
 * {
 *   recommendedTools: ToolRecommendation[];
 *   toolChains: ToolChain[];
 *   memoryMatches: Array<{ query, tools, similarity }>;
 *   requestId: string;
 *   requestContext: RequestContext;
 *   ...
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userQuery, requestContext, complexityScore, agentId } = body

    // Validate required fields
    if (!userQuery || typeof userQuery !== 'string') {
      logger.warn(`[Tool Memory Agent API] Missing userQuery`, { body })
      return NextResponse.json(
        { error: 'userQuery (string) is required' },
        { status: 400 }
      )
    }

    if (!requestContext || !requestContext.requestId) {
      logger.warn(`[Tool Memory Agent API] Missing requestContext`, { body })
      return NextResponse.json(
        { error: 'requestContext with requestId is required' },
        { status: 400 }
      )
    }

    // Resolve agent config
    const targetAgentId = agentId || 'tool-memory-agent'
    const agentStorage = getAgentConfigStorage()
    const agentConfig = await agentStorage.getAgentConfig(targetAgentId)

    if (!agentConfig || !agentConfig.enabled) {
      logger.warn(`[Tool Memory Agent API] Agent config not found or disabled`, {
        agentId: targetAgentId,
      })
      return NextResponse.json(
        {
          error: `Agent '${targetAgentId}' not found or disabled. Please configure it in Settings > Agent Configurations.`,
        },
        { status: 404 }
      )
    }

    // Initialize agent
    const agent = new ToolMemoryAgent()
    await agent.initialize(req.headers)

    // Update request context status
    const requestStorage = getRequestMongoDBStorage()
    const updatedRequestContext: RequestContext = {
      ...requestContext,
      userQuery,
      status: 'in-progress',
    }
    await requestStorage.save(updatedRequestContext)

    // Generate tool recommendations
    logger.info(`[Tool Memory Agent API] Generating tool recommendations`, {
      requestId: requestContext.requestId,
      queryLength: userQuery.length,
      hasComplexityScore: !!complexityScore,
    })

    const result = await agent.recommendTools(
      userQuery,
      updatedRequestContext,
      complexityScore,
      undefined // mcpContext will be fetched by agent
    )

    // Update request context to completed
    result.requestContext.status = 'completed'
    await requestStorage.save(result.requestContext)

    logger.info(`[Tool Memory Agent API] Tool recommendations completed`, {
      requestId: result.requestId,
      toolsRecommended: result.recommendedTools.length,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    logger.error(`[Tool Memory Agent API] Error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate tool recommendations' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint - returns agent config
 */
export async function GET(req: NextRequest) {
  try {
    const storage = getAgentConfigStorage()
    const config = await storage.getAgentConfig('tool-memory-agent')

    if (!config) {
      return NextResponse.json(
        { error: 'Agent config not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ config }, { status: 200 })
  } catch (error: any) {
    logger.error(`[Tool Memory Agent API] GET error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch agent config' },
      { status: 500 }
    )
  }
}


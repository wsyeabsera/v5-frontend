import { NextRequest, NextResponse } from 'next/server'
import { getExecutorOutputsStorage } from '@/lib/storage/executor-outputs-storage'
import { logger } from '@/utils/logger'

/**
 * GET /api/agents/executor-agent/versions/[requestId]
 * 
 * Get all execution versions for a specific request, sorted chronologically
 * 
 * Returns: Array of ExecutorAgentOutput sorted by executionVersion ascending
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const { requestId } = params

    if (!requestId) {
      logger.warn('[Executor Agent Versions API] Missing requestId parameter')
      return NextResponse.json(
        { error: 'requestId is required' },
        { status: 400 }
      )
    }

    const storage = getExecutorOutputsStorage()
    const versions = await storage.getAllVersionsByRequestId(requestId)

    logger.info(`[Executor Agent Versions API] Retrieved ${versions.length} versions`, {
      requestId,
      versions: versions.length
    })

    return NextResponse.json(versions, { status: 200 })
  } catch (error: any) {
    logger.error(`[Executor Agent Versions API] Error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch execution versions' },
      { status: 500 }
    )
  }
}


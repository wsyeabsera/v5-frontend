import { NextRequest, NextResponse } from 'next/server'
import { getCriticOutputsStorage } from '@/lib/storage/critic-outputs-storage'
import { logger } from '@/utils/logger'

/**
 * GET /api/agents/critic-agent/versions/[requestId]
 * 
 * Get all critique versions for a specific request, sorted chronologically
 * 
 * Returns: Array of CriticAgentOutput sorted by critiqueVersion ascending
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const { requestId } = params

    if (!requestId) {
      logger.warn('[Critic Agent Versions API] Missing requestId parameter')
      return NextResponse.json(
        { error: 'requestId is required' },
        { status: 400 }
      )
    }

    const storage = getCriticOutputsStorage()
    const versions = await storage.getAllVersionsByRequestId(requestId)

    logger.info(`[Critic Agent Versions API] Retrieved ${versions.length} versions`, {
      requestId,
      versions: versions.length
    })

    return NextResponse.json(versions, { status: 200 })
  } catch (error: any) {
    logger.error(`[Critic Agent Versions API] Error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch critique versions' },
      { status: 500 }
    )
  }
}


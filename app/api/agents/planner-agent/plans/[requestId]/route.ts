import { NextRequest, NextResponse } from 'next/server'
import { getPlannerOutputsStorage } from '@/lib/storage/planner-outputs-storage'
import { logger } from '@/utils/logger'

/**
 * GET /api/agents/planner-agent/plans/[requestId]
 * 
 * Get all plans for a specific request, sorted by timestamp descending (newest first)
 * 
 * Returns: Array of PlannerAgentOutput sorted by timestamp descending
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const { requestId } = params

    if (!requestId) {
      logger.warn('[Planner Agent Plans API] Missing requestId parameter')
      return NextResponse.json(
        { error: 'requestId is required' },
        { status: 400 }
      )
    }

    const storage = getPlannerOutputsStorage()
    const plans = await storage.getAllPlansByRequestId(requestId)

    logger.info(`[Planner Agent Plans API] Retrieved ${plans.length} plans`, {
      requestId,
      plans: plans.length
    })

    return NextResponse.json(plans, { status: 200 })
  } catch (error: any) {
    logger.error(`[Planner Agent Plans API] Error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch plans' },
      { status: 500 }
    )
  }
}


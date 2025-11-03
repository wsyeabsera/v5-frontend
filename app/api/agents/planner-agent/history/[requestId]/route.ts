import { NextRequest, NextResponse } from 'next/server'
import { getPlannerOutputsStorage } from '@/lib/storage/planner-outputs-storage'

/**
 * GET /api/agents/planner-agent/history/[requestId]
 * 
 * Get a single planner output by request ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const { requestId } = params
    const storage = getPlannerOutputsStorage()

    const output = await storage.getByRequestId(requestId)

    if (!output) {
      return NextResponse.json(
        { error: `Planner output for request ${requestId} not found` },
        { status: 404 }
      )
    }

    return NextResponse.json(output, { status: 200 })
  } catch (error: any) {
    console.error('[Planner Agent History API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch planner output' },
      { status: 500 }
    )
  }
}


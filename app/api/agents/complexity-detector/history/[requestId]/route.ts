import { NextRequest, NextResponse } from 'next/server'
import { getComplexityDetectionsStorage } from '@/lib/storage/complexity-detections-storage'

/**
 * GET /api/agents/complexity-detector/history/[requestId]
 * 
 * Get a single complexity detection by request ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const { requestId } = params
    const storage = getComplexityDetectionsStorage()

    const detection = await storage.getByRequestId(requestId)

    if (!detection) {
      return NextResponse.json(
        { error: `Detection for request ${requestId} not found` },
        { status: 404 }
      )
    }

    return NextResponse.json(detection, { status: 200 })
  } catch (error: any) {
    console.error('[Complexity Detector History API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch detection' },
      { status: 500 }
    )
  }
}


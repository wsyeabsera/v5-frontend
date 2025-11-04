import { NextRequest, NextResponse } from 'next/server'
import { getConfidenceOutputsStorage } from '@/lib/storage/confidence-outputs-storage'

/**
 * GET /api/agents/confidence-scorer/history
 * 
 * Get confidence scorer history with optional filters
 * 
 * Query params:
 * - minConfidence: number
 * - maxConfidence: number
 * - decision: 'execute' | 'review' | 'rethink' | 'escalate'
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const minConfidence = searchParams.get('minConfidence')
    const maxConfidence = searchParams.get('maxConfidence')
    const decision = searchParams.get('decision')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const storage = getConfidenceOutputsStorage()

    const filters: any = {}

    if (minConfidence) {
      filters.minConfidence = parseFloat(minConfidence)
    }

    if (maxConfidence) {
      filters.maxConfidence = parseFloat(maxConfidence)
    }

    if (decision) {
      filters.decision = decision as 'execute' | 'review' | 'rethink' | 'escalate'
    }

    if (startDate) {
      filters.startDate = new Date(startDate)
    }

    if (endDate) {
      filters.endDate = new Date(endDate)
    }

    const outputs = await storage.getAll(Object.keys(filters).length > 0 ? filters : undefined)

    return NextResponse.json(outputs, { status: 200 })
  } catch (error: any) {
    console.error('[Confidence Scorer History API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch confidence scorer history' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/agents/confidence-scorer/history
 * 
 * Delete all confidence scorer history
 * 
 * Returns: { success: true, count: number }
 */
export async function DELETE(req: NextRequest) {
  try {
    const storage = getConfidenceOutputsStorage()
    
    // Get count before deletion
    const count = await storage.count()
    
    // Delete all confidence outputs
    await storage.clear()

    return NextResponse.json(
      { success: true, count },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[Confidence Scorer History API] Error deleting all history:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete all history' },
      { status: 500 }
    )
  }
}


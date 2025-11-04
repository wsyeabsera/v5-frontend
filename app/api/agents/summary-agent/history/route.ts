import { NextRequest, NextResponse } from 'next/server'
import { getSummaryOutputsStorage } from '@/lib/storage/summary-outputs-storage'

/**
 * GET /api/agents/summary-agent/history
 * 
 * Get summary agent history with optional filters
 * 
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const storage = getSummaryOutputsStorage()

    const filters: any = {}

    if (startDate) {
      filters.startDate = new Date(startDate)
    }

    if (endDate) {
      filters.endDate = new Date(endDate)
    }

    const summaries = await storage.getAll(Object.keys(filters).length > 0 ? filters : undefined)

    return NextResponse.json(summaries, { status: 200 })
  } catch (error: any) {
    console.error('[Summary Agent History API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch summary agent history' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/agents/summary-agent/history
 * 
 * Delete all summary agent history
 * 
 * Returns: { success: true, count: number }
 */
export async function DELETE(req: NextRequest) {
  try {
    const storage = getSummaryOutputsStorage()
    
    // Get count before deletion
    const count = await storage.count()
    
    // Delete all summaries
    await storage.clear()

    return NextResponse.json(
      { success: true, count },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[Summary Agent History API] Error deleting all history:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete all history' },
      { status: 500 }
    )
  }
}


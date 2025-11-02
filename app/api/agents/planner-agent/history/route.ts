import { NextRequest, NextResponse } from 'next/server'
import { getPlannerOutputsStorage } from '@/lib/storage/planner-outputs-storage'

/**
 * GET /api/agents/planner-agent/history
 * 
 * Get planner agent history with optional filters
 * 
 * Query params:
 * - minComplexity: number
 * - maxComplexity: number
 * - minConfidence: number
 * - maxConfidence: number
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const minComplexity = searchParams.get('minComplexity')
    const maxComplexity = searchParams.get('maxComplexity')
    const minConfidence = searchParams.get('minConfidence')
    const maxConfidence = searchParams.get('maxConfidence')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const storage = getPlannerOutputsStorage()

    const filters: any = {}

    if (minComplexity) {
      filters.minComplexity = parseFloat(minComplexity)
    }

    if (maxComplexity) {
      filters.maxComplexity = parseFloat(maxComplexity)
    }

    if (minConfidence) {
      filters.minConfidence = parseFloat(minConfidence)
    }

    if (maxConfidence) {
      filters.maxConfidence = parseFloat(maxConfidence)
    }

    if (startDate) {
      filters.startDate = new Date(startDate)
    }

    if (endDate) {
      filters.endDate = new Date(endDate)
    }

    const plans = await storage.getAll(Object.keys(filters).length > 0 ? filters : undefined)

    return NextResponse.json(plans, { status: 200 })
  } catch (error: any) {
    console.error('[Planner Agent History API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch planner agent history' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/agents/planner-agent/history
 * 
 * Delete all planner agent history
 * 
 * Returns: { success: true, count: number }
 */
export async function DELETE(req: NextRequest) {
  try {
    const storage = getPlannerOutputsStorage()
    
    // Get count before deletion
    const count = await storage.count()
    
    // Delete all plans
    await storage.clear()

    return NextResponse.json(
      { success: true, count },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[Planner Agent History API] Error deleting all history:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete all history' },
      { status: 500 }
    )
  }
}


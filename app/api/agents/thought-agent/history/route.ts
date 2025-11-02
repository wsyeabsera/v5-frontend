import { NextRequest, NextResponse } from 'next/server'
import { getThoughtOutputsStorage } from '@/lib/storage/thought-outputs-storage'

/**
 * GET /api/agents/thought-agent/history
 * 
 * Get thought agent history with optional filters
 * 
 * Query params:
 * - minComplexityScore: number
 * - maxComplexityScore: number
 * - reasoningPass: number
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const minComplexityScore = searchParams.get('minComplexityScore')
    const maxComplexityScore = searchParams.get('maxComplexityScore')
    const reasoningPass = searchParams.get('reasoningPass')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const storage = getThoughtOutputsStorage()

    const filters: any = {}

    if (minComplexityScore) {
      filters.minComplexityScore = parseFloat(minComplexityScore)
    }

    if (maxComplexityScore) {
      filters.maxComplexityScore = parseFloat(maxComplexityScore)
    }

    if (reasoningPass) {
      filters.reasoningPass = parseInt(reasoningPass, 10)
    }

    if (startDate) {
      filters.startDate = new Date(startDate)
    }

    if (endDate) {
      filters.endDate = new Date(endDate)
    }

    const thoughts = await storage.getAll(Object.keys(filters).length > 0 ? filters : undefined)

    return NextResponse.json(thoughts, { status: 200 })
  } catch (error: any) {
    console.error('[Thought Agent History API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch thought agent history' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/agents/thought-agent/history
 * 
 * Delete all thought agent history
 * 
 * Returns: { success: true, count: number }
 */
export async function DELETE(req: NextRequest) {
  try {
    const storage = getThoughtOutputsStorage()
    
    // Get count before deletion
    const count = await storage.count()
    
    // Delete all thoughts
    await storage.clear()

    return NextResponse.json(
      { success: true, count },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[Thought Agent History API] Error deleting all history:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete all history' },
      { status: 500 }
    )
  }
}


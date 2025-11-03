import { NextRequest, NextResponse } from 'next/server'
import { getCriticOutputsStorage } from '@/lib/storage/critic-outputs-storage'

/**
 * GET /api/agents/critic-agent/history
 * 
 * Get critic agent history with optional filters
 * 
 * Query params:
 * - recommendation: 'approve' | 'revise' | 'reject'
 * - minScore: number
 * - maxScore: number
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const recommendation = searchParams.get('recommendation')
    const minScore = searchParams.get('minScore')
    const maxScore = searchParams.get('maxScore')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const storage = getCriticOutputsStorage()

    const filters: any = {}

    if (recommendation) {
      filters.recommendation = recommendation as 'approve' | 'revise' | 'reject'
    }

    if (minScore) {
      filters.minScore = parseFloat(minScore)
    }

    if (maxScore) {
      filters.maxScore = parseFloat(maxScore)
    }

    if (startDate) {
      filters.startDate = new Date(startDate)
    }

    if (endDate) {
      filters.endDate = new Date(endDate)
    }

    const critiques = await storage.getAll(Object.keys(filters).length > 0 ? filters : undefined)

    return NextResponse.json(critiques, { status: 200 })
  } catch (error: any) {
    console.error('[Critic Agent History API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch critic agent history' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/agents/critic-agent/history
 * 
 * Delete all critic agent history
 * 
 * Returns: { success: true, count: number }
 */
export async function DELETE(req: NextRequest) {
  try {
    const storage = getCriticOutputsStorage()
    
    // Get count before deletion
    const count = await storage.count()
    
    // Delete all critiques
    await storage.clear()

    return NextResponse.json(
      { success: true, count },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[Critic Agent History API] Error deleting all history:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete all history' },
      { status: 500 }
    )
  }
}


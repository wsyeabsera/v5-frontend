import { NextRequest, NextResponse } from 'next/server'
import { getMetaOutputsStorage } from '@/lib/storage/meta-outputs-storage'

/**
 * GET /api/agents/meta-agent/history
 * 
 * Get meta agent history with optional filters
 * 
 * Query params:
 * - minReasoningQuality: number
 * - maxReasoningQuality: number
 * - shouldReplan: boolean
 * - shouldDeepenReasoning: boolean
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const minReasoningQuality = searchParams.get('minReasoningQuality')
    const maxReasoningQuality = searchParams.get('maxReasoningQuality')
    const shouldReplan = searchParams.get('shouldReplan')
    const shouldDeepenReasoning = searchParams.get('shouldDeepenReasoning')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const storage = getMetaOutputsStorage()

    const filters: any = {}

    if (minReasoningQuality) {
      filters.minReasoningQuality = parseFloat(minReasoningQuality)
    }

    if (maxReasoningQuality) {
      filters.maxReasoningQuality = parseFloat(maxReasoningQuality)
    }

    if (shouldReplan !== null) {
      filters.shouldReplan = shouldReplan === 'true'
    }

    if (shouldDeepenReasoning !== null) {
      filters.shouldDeepenReasoning = shouldDeepenReasoning === 'true'
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
    console.error('[Meta Agent History API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch meta agent history' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/agents/meta-agent/history
 * 
 * Delete all meta agent history
 * 
 * Returns: { success: true, count: number }
 */
export async function DELETE(req: NextRequest) {
  try {
    const storage = getMetaOutputsStorage()
    
    // Get count before deletion
    const count = await storage.count()
    
    // Delete all meta outputs
    await storage.clear()

    return NextResponse.json(
      { success: true, count },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[Meta Agent History API] Error deleting all history:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete all history' },
      { status: 500 }
    )
  }
}


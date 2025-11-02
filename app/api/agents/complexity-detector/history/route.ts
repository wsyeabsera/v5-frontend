import { NextRequest, NextResponse } from 'next/server'
import { getComplexityDetectionsStorage } from '@/lib/storage/complexity-detections-storage'

/**
 * GET /api/agents/complexity-detector/history
 * 
 * Get complexity detector history with optional filters
 * 
 * Query params:
 * - detectionMethod: 'semantic' | 'keyword'
 * - minScore: number
 * - maxScore: number
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const detectionMethod = searchParams.get('detectionMethod') as 'semantic' | 'keyword' | null
    const minScore = searchParams.get('minScore')
    const maxScore = searchParams.get('maxScore')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const storage = getComplexityDetectionsStorage()

    const filters: any = {}

    if (detectionMethod) {
      filters.detectionMethod = detectionMethod
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

    const detections = await storage.getAll(Object.keys(filters).length > 0 ? filters : undefined)

    return NextResponse.json(detections, { status: 200 })
  } catch (error: any) {
    console.error('[Complexity Detector History API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch complexity detector history' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/agents/complexity-detector/history
 * 
 * Delete all complexity detector history
 * 
 * Returns: { success: true, count: number }
 */
export async function DELETE(req: NextRequest) {
  try {
    const storage = getComplexityDetectionsStorage()
    
    // Get count before deletion
    const count = await storage.count()
    
    // Delete all detections
    await storage.clear()

    return NextResponse.json(
      { success: true, count },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[Complexity Detector History API] Error deleting all history:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete all history' },
      { status: 500 }
    )
  }
}



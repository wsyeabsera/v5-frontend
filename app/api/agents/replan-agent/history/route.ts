import { NextRequest, NextResponse } from 'next/server'
import { getReplanOutputsStorage } from '@/lib/storage/replan-outputs-storage'

/**
 * GET /api/agents/replan-agent/history
 * 
 * Get replan agent history with optional filters
 * 
 * Query params:
 * - minConfidence: number
 * - maxConfidence: number
 * - planVersion: number
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const minConfidence = searchParams.get('minConfidence')
    const maxConfidence = searchParams.get('maxConfidence')
    const planVersion = searchParams.get('planVersion')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const storage = getReplanOutputsStorage()

    // Get all replan outputs
    const outputs = await storage.getAll()

    // Apply filters manually if needed
    let filteredOutputs = outputs
    
    if (minConfidence || maxConfidence) {
      filteredOutputs = filteredOutputs.filter(output => {
        if (minConfidence && output.confidence < parseFloat(minConfidence)) return false
        if (maxConfidence && output.confidence > parseFloat(maxConfidence)) return false
        return true
      })
    }

    if (planVersion) {
      filteredOutputs = filteredOutputs.filter(output => output.planVersion === parseInt(planVersion, 10))
    }

    if (startDate || endDate) {
      filteredOutputs = filteredOutputs.filter(output => {
        const outputDate = new Date(output.timestamp).getTime()
        if (startDate && outputDate < new Date(startDate).getTime()) return false
        if (endDate && outputDate > new Date(endDate).getTime()) return false
        return true
      })
    }

    return NextResponse.json(filteredOutputs, { status: 200 })
  } catch (error: any) {
    console.error('[Replan Agent History API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch replan agent history' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/agents/replan-agent/history
 * 
 * Delete all replan agent history
 * 
 * Returns: { success: true, count: number }
 */
export async function DELETE(req: NextRequest) {
  try {
    const storage = getReplanOutputsStorage()
    
    // Get count before deletion
    const count = await storage.count()
    
    // Delete all replan outputs
    await storage.clear()

    return NextResponse.json(
      { success: true, count },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[Replan Agent History API] Error deleting all history:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete all history' },
      { status: 500 }
    )
  }
}


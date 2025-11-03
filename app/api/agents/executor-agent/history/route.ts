import { NextRequest, NextResponse } from 'next/server'
import { getExecutorOutputsStorage } from '@/lib/storage/executor-outputs-storage'
import { logger } from '@/utils/logger'

/**
 * GET /api/agents/executor-agent/history
 * 
 * Get executor agent history with optional filters
 * 
 * Query params:
 * - overallSuccess: boolean
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - planId: string
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const overallSuccess = searchParams.get('overallSuccess')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const planId = searchParams.get('planId')

    const storage = getExecutorOutputsStorage()

    const filters: any = {}

    if (overallSuccess !== null && overallSuccess !== undefined) {
      filters.overallSuccess = overallSuccess === 'true'
    }

    if (startDate) {
      filters.startDate = new Date(startDate)
    }

    if (endDate) {
      filters.endDate = new Date(endDate)
    }

    if (planId) {
      filters.planId = planId
    }

    const executions = await storage.getAll(Object.keys(filters).length > 0 ? filters : undefined)

    logger.info(`[Executor Agent History API] Retrieved ${executions.length} executions`)

    return NextResponse.json(executions, { status: 200 })
  } catch (error: any) {
    logger.error('[Executor Agent History API] Error:', error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch executor agent history' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/agents/executor-agent/history
 * 
 * Delete all executor agent history
 * 
 * Returns: { success: true, count: number }
 */
export async function DELETE(req: NextRequest) {
  try {
    const storage = getExecutorOutputsStorage()
    const count = await storage.count()
    
    await storage.clear()

    logger.info(`[Executor Agent History API] Deleted ${count} executions`)

    return NextResponse.json(
      { success: true, count },
      { status: 200 }
    )
  } catch (error: any) {
    logger.error('[Executor Agent History API] DELETE Error:', error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete executor agent history' },
      { status: 500 }
    )
  }
}


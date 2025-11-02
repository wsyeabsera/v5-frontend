import { NextResponse } from 'next/server'
import { getAgentConfigStorage } from '@/lib/storage/agent-config-storage'

/**
 * POST /api/agents/init
 * 
 * Initialize MongoDB indexes for agent configs collection.
 * Call this once on application startup.
 */
export async function POST() {
  try {
    const storage = getAgentConfigStorage()
    await storage.initialize()

    return NextResponse.json(
      { message: 'Agent config indexes initialized successfully' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[Agents Init API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to initialize indexes' },
      { status: 500 }
    )
  }
}


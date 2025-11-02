import { NextResponse } from 'next/server'
import { getRequestMongoDBStorage } from '@/lib/storage/request-mongodb-storage'

/**
 * POST /api/requests/init
 * 
 * Initialize MongoDB indexes for requests collection.
 * Call this once on application startup.
 */
export async function POST() {
  try {
    const storage = getRequestMongoDBStorage()
    await storage.initialize()

    return NextResponse.json(
      { message: 'MongoDB indexes initialized successfully' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[Requests Init API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to initialize indexes' },
      { status: 500 }
    )
  }
}


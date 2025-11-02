import { NextRequest, NextResponse } from 'next/server'
import { getRequestMongoDBStorage } from '@/lib/storage/request-mongodb-storage'
import { testConnection } from '@/lib/storage/mongodb-client'
import { RequestContext } from '@/types'

/**
 * GET /api/requests
 * 
 * List all requests with optional filters
 * 
 * Query params:
 * - status: Filter by status
 * - agentName: Filter by agent name in chain
 * - search: Search query (searches requestId and userQuery)
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
export async function GET(req: NextRequest) {
  try {
    // Check MongoDB connection first
    const isConnected = await testConnection()
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Database connection failed. Please check MongoDB configuration.' },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const agentName = searchParams.get('agentName')
    const search = searchParams.get('search')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const storage = getRequestMongoDBStorage()
    
    // Ensure MongoDB is initialized and indexes exist
    try {
      await storage.initialize()
    } catch (initError: any) {
      console.warn('[Requests API] Index initialization warning:', initError.message)
      // Continue anyway - indexes might already exist
    }

    let requests: RequestContext[] = []

    // Apply filters
    if (search) {
      requests = await storage.search(search)
    } else if (startDate || endDate) {
      requests = await storage.getByDateRange(
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      )
    } else {
      requests = await storage.getAll()
    }

    // Apply additional filters
    if (status && status !== 'all') {
      requests = requests.filter((r) => r.status === status)
    }

    if (agentName) {
      requests = requests.filter((r) => r.agentChain.includes(agentName))
    }

    return NextResponse.json(requests, { status: 200 })
  } catch (error: any) {
    console.error('[Requests API] Error fetching requests:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch requests' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/requests
 * 
 * Create a new request
 * 
 * Body: RequestContext (without _id)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const context: RequestContext = body

    // Validate required fields
    if (!context.requestId || !context.createdAt) {
      return NextResponse.json(
        { error: 'requestId and createdAt are required' },
        { status: 400 }
      )
    }

    // Ensure createdAt is a Date
    if (typeof context.createdAt === 'string') {
      context.createdAt = new Date(context.createdAt)
    }

    const storage = getRequestMongoDBStorage()
    
    // Ensure MongoDB is initialized and indexes exist
    try {
      await storage.initialize()
    } catch (initError: any) {
      console.warn('[Requests API] Index initialization warning:', initError.message)
      // Continue anyway - indexes might already exist
    }
    
    await storage.save(context)

    return NextResponse.json(context, { status: 201 })
  } catch (error: any) {
    console.error('[Requests API] Error creating request:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create request' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/requests
 * 
 * Delete all requests
 * 
 * Returns: { success: true, count: number }
 */
export async function DELETE(req: NextRequest) {
  try {
    const storage = getRequestMongoDBStorage()
    
    // Get count before deletion
    const count = await storage.count()
    
    // Delete all requests
    await storage.clear()

    return NextResponse.json(
      { success: true, count },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[Requests API] Error deleting all requests:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete all requests' },
      { status: 500 }
    )
  }
}


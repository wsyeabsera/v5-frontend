import { NextRequest, NextResponse } from 'next/server'
import { getRequestMongoDBStorage } from '@/lib/storage/request-mongodb-storage'
import { getPlannerOutputsStorage } from '@/lib/storage/planner-outputs-storage'
import { testConnection } from '@/lib/storage/mongodb-client'

/**
 * GET /api/requests/with-thought-agent
 * 
 * Get all requests that have thought-agent in their agent chain.
 * Also includes whether each request already has planner output.
 * 
 * Returns: Array of requests with plannerOutputExists boolean
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

    const storage = getRequestMongoDBStorage()
    
    // Ensure MongoDB is initialized
    try {
      await storage.initialize()
    } catch (initError: any) {
      console.warn('[Requests API] Index initialization warning:', initError.message)
    }

    // Get all requests
    const allRequests = await storage.getAll()
    
    // Filter for requests that have thought-agent in their agent chain
    const filteredRequests = allRequests.filter((r) => 
      r.agentChain.includes('thought-agent')
    )
    
    // Sort by newest first
    filteredRequests.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    
    // Check which requests already have planner output
    const plannerStorage = getPlannerOutputsStorage()
    const requestsWithPlannerStatus = await Promise.all(
      filteredRequests.map(async (request) => {
        const plannerOutput = await plannerStorage.getByRequestId(request.requestId)
        return {
          ...request,
          plannerOutputExists: plannerOutput !== null,
        }
      })
    )
    
    return NextResponse.json(requestsWithPlannerStatus, { status: 200 })
  } catch (error: any) {
    console.error('[Requests API] Error fetching requests with thought-agent:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch requests' },
      { status: 500 }
    )
  }
}


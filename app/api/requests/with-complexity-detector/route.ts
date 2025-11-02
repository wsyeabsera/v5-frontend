import { NextRequest, NextResponse } from 'next/server'
import { getRequestMongoDBStorage } from '@/lib/storage/request-mongodb-storage'
import { getThoughtOutputsStorage } from '@/lib/storage/thought-outputs-storage'
import { testConnection } from '@/lib/storage/mongodb-client'

/**
 * GET /api/requests/with-complexity-detector
 * 
 * Get all requests that have complexity-detector in their agent chain.
 * Also includes whether each request already has thought output.
 * 
 * Returns: Array of requests with thoughtOutputExists boolean
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
    
    // Filter for requests that have complexity-detector in their agent chain
    const filteredRequests = allRequests.filter((r) => 
      r.agentChain.includes('complexity-detector')
    )
    
    // Sort by newest first
    filteredRequests.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    
    // Check which requests already have thought output
    const thoughtStorage = getThoughtOutputsStorage()
    const requestsWithThoughtStatus = await Promise.all(
      filteredRequests.map(async (request) => {
        const thoughtOutput = await thoughtStorage.getByRequestId(request.requestId)
        return {
          ...request,
          thoughtOutputExists: thoughtOutput !== null,
        }
      })
    )
    
    return NextResponse.json(requestsWithThoughtStatus, { status: 200 })
  } catch (error: any) {
    console.error('[Requests API] Error fetching requests with complexity-detector:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch requests' },
      { status: 500 }
    )
  }
}


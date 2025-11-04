import { NextRequest, NextResponse } from 'next/server'
import { getRequestMongoDBStorage } from '@/lib/storage/request-mongodb-storage'
import { getConfidenceOutputsStorage } from '@/lib/storage/confidence-outputs-storage'
import { testConnection } from '@/lib/storage/mongodb-client'

/**
 * GET /api/requests/with-critic-agent
 * 
 * Get all requests that have critic-agent in their agent chain.
 * Also includes whether each request already has confidence output.
 * 
 * Returns: Array of requests with confidenceOutputExists boolean
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
    
    // Filter for requests that have critic-agent in their agent chain
    const filteredRequests = allRequests.filter((r) => 
      r.agentChain && Array.isArray(r.agentChain) && r.agentChain.includes('critic-agent')
    )
    
    // Sort by newest first
    filteredRequests.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    
    // Check which requests already have confidence output
    const confidenceStorage = getConfidenceOutputsStorage()
    const requestsWithConfidenceStatus = await Promise.all(
      filteredRequests.map(async (request) => {
        const confidenceOutput = await confidenceStorage.getByRequestId(request.requestId)
        return {
          ...request,
          confidenceOutputExists: confidenceOutput !== null,
        }
      })
    )
    
    return NextResponse.json(requestsWithConfidenceStatus, { status: 200 })
  } catch (error: any) {
    console.error('[Requests API] Error fetching requests with critic-agent:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch requests' },
      { status: 500 }
    )
  }
}


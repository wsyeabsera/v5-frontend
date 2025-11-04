import { NextRequest, NextResponse } from 'next/server'
import { getRequestMongoDBStorage } from '@/lib/storage/request-mongodb-storage'
import { getMetaOutputsStorage } from '@/lib/storage/meta-outputs-storage'
import { testConnection } from '@/lib/storage/mongodb-client'

/**
 * GET /api/requests/with-confidence-scorer
 * 
 * Get all requests that have confidence-scorer in their agent chain.
 * Also includes whether each request already has meta output.
 * 
 * Returns: Array of requests with metaOutputExists boolean
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
    
    // Filter for requests that have confidence-scorer in their agent chain
    const filteredRequests = allRequests.filter((r) => 
      r.agentChain && Array.isArray(r.agentChain) && r.agentChain.includes('confidence-scorer')
    )
    
    // Sort by newest first
    filteredRequests.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    
    // Check which requests already have meta output
    const metaStorage = getMetaOutputsStorage()
    const requestsWithMetaStatus = await Promise.all(
      filteredRequests.map(async (request) => {
        const metaOutput = await metaStorage.getByRequestId(request.requestId)
        return {
          ...request,
          metaOutputExists: metaOutput !== null,
        }
      })
    )
    
    return NextResponse.json(requestsWithMetaStatus, { status: 200 })
  } catch (error: any) {
    console.error('[Requests API] Error fetching requests with confidence-scorer:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch requests' },
      { status: 500 }
    )
  }
}


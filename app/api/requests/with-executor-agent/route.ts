import { NextRequest, NextResponse } from 'next/server'
import { getRequestMongoDBStorage } from '@/lib/storage/request-mongodb-storage'
import { getSummaryOutputsStorage } from '@/lib/storage/summary-outputs-storage'
import { testConnection } from '@/lib/storage/mongodb-client'

/**
 * GET /api/requests/with-executor-agent
 * 
 * Get all requests that have executor-agent in their agent chain.
 * Also includes whether each request already has summary output.
 * 
 * Returns: Array of requests with summaryOutputExists boolean
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
    
    // Filter for requests that have executor-agent in their agent chain
    const filteredRequests = allRequests.filter((r) => 
      r.agentChain.includes('executor-agent')
    )
    
    // Sort by newest first
    filteredRequests.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    
    // Check which requests already have summary output
    const summaryStorage = getSummaryOutputsStorage()
    const requestsWithSummaryStatus = await Promise.all(
      filteredRequests.map(async (request) => {
        const summaryOutput = await summaryStorage.getByRequestId(request.requestId)
        return {
          ...request,
          summaryOutputExists: summaryOutput !== null,
        }
      })
    )
    
    return NextResponse.json(requestsWithSummaryStatus, { status: 200 })
  } catch (error: any) {
    console.error('[Requests API] Error fetching requests with executor-agent:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch requests' },
      { status: 500 }
    )
  }
}


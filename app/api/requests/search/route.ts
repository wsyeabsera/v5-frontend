import { NextRequest, NextResponse } from 'next/server'
import { getRequestMongoDBStorage } from '@/lib/storage/request-mongodb-storage'
import { RequestContext } from '@/types'

/**
 * POST /api/requests/search
 * 
 * Search requests with filters
 * 
 * Body:
 * {
 *   query?: string;           // Text search
 *   filters?: {
 *     status?: string;
 *     agentName?: string;
 *     startDate?: string;     // ISO date
 *     endDate?: string;       // ISO date
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { query, filters } = body

    const storage = getRequestMongoDBStorage()

    let requests: RequestContext[] = []

    // Start with search or getAll
    if (query && typeof query === 'string') {
      requests = await storage.search(query)
    } else {
      requests = await storage.getAll()
    }

    // Apply filters
    if (filters) {
      if (filters.status && filters.status !== 'all') {
        requests = requests.filter((r) => r.status === filters.status)
      }

      if (filters.agentName) {
        requests = requests.filter((r) => r.agentChain.includes(filters.agentName))
      }

      if (filters.startDate || filters.endDate) {
        const dateFiltered = await storage.getByDateRange(
          filters.startDate ? new Date(filters.startDate) : undefined,
          filters.endDate ? new Date(filters.endDate) : undefined
        )
        // Intersect with existing results
        const dateFilteredIds = new Set(dateFiltered.map((r) => r.requestId))
        requests = requests.filter((r) => dateFilteredIds.has(r.requestId))
      }
    }

    return NextResponse.json(requests, { status: 200 })
  } catch (error: any) {
    console.error('[Requests API] Error searching requests:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to search requests' },
      { status: 500 }
    )
  }
}


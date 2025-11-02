import { NextRequest, NextResponse } from 'next/server'
import { getRequestMongoDBStorage } from '@/lib/storage/request-mongodb-storage'
import { RequestContext } from '@/types'

/**
 * GET /api/requests/[id]
 * 
 * Get a single request by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const storage = getRequestMongoDBStorage()
    
    // Ensure MongoDB is initialized
    try {
      await storage.initialize()
    } catch (initError: any) {
      console.warn('[Requests API] Index initialization warning:', initError.message)
    }

    const request = await storage.get(id)

    if (!request) {
      return NextResponse.json(
        { error: `Request ${id} not found` },
        { status: 404 }
      )
    }

    return NextResponse.json(request, { status: 200 })
  } catch (error: any) {
    console.error('[Requests API] Error fetching request:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch request' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/requests/[id]
 * 
 * Update a request by ID
 * 
 * Body: Partial RequestContext
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await req.json()
    const storage = getRequestMongoDBStorage()

    // Get existing request
    const existing = await storage.get(id)
    if (!existing) {
      return NextResponse.json(
        { error: `Request ${id} not found` },
        { status: 404 }
      )
    }

    // Merge updates
    const updated: RequestContext = {
      ...existing,
      ...body,
      requestId: id, // Ensure requestId doesn't change
      updatedAt: new Date(),
    }

    // Handle createdAt if provided
    if (body.createdAt) {
      updated.createdAt =
        body.createdAt instanceof Date
          ? body.createdAt
          : new Date(body.createdAt)
    }

    await storage.save(updated)

    return NextResponse.json(updated, { status: 200 })
  } catch (error: any) {
    console.error('[Requests API] Error updating request:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update request' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/requests/[id]
 * 
 * Delete a request by ID
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const storage = getRequestMongoDBStorage()

    await storage.delete(id)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error('[Requests API] Error deleting request:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete request' },
      { status: 500 }
    )
  }
}


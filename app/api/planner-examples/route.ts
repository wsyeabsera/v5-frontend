import { NextRequest, NextResponse } from 'next/server'
import {
  storePlanExample,
  getAllPlanExamples,
  deletePlanExample,
  querySimilarPlanExamples,
} from '@/lib/pinecone/planner-examples'
import { generateEmbedding } from '@/lib/ollama/embeddings'
import { PlanExample } from '@/types'

/**
 * GET /api/planner-examples
 * 
 * List all planner examples
 * 
 * Returns: Array of PlanExample
 */
export async function GET() {
  try {
    const examples = await getAllPlanExamples()
    return NextResponse.json(examples, { status: 200 })
  } catch (error: any) {
    console.error('[Planner Examples API] Error fetching examples:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch examples' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/planner-examples
 * 
 * Create a new planner example
 * 
 * Body:
 * {
 *   query: string;
 *   goal: string;
 *   steps: Array<{ description: string; action: string; parameters?: Record<string, any> }>;
 *   rationale: string;
 *   successRating: number;
 *   tags: string[];
 * }
 * 
 * Returns: Created PlanExample
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { query, goal, steps, rationale, successRating, tags } = body

    // Validate input
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'query (string) is required' },
        { status: 400 }
      )
    }

    if (!goal || typeof goal !== 'string') {
      return NextResponse.json(
        { error: 'goal (string) is required' },
        { status: 400 }
      )
    }

    if (!rationale || typeof rationale !== 'string') {
      return NextResponse.json(
        { error: 'rationale (string) is required' },
        { status: 400 }
      )
    }

    if (typeof successRating !== 'number' || successRating < 0 || successRating > 1) {
      return NextResponse.json(
        { error: 'successRating must be a number between 0 and 1' },
        { status: 400 }
      )
    }

    if (!Array.isArray(steps)) {
      return NextResponse.json(
        { error: 'steps must be an array' },
        { status: 400 }
      )
    }

    // Create example (embedding will be generated in storePlanExample)
    const now = new Date().toISOString()
    const example: Omit<PlanExample, 'id' | 'embedding'> = {
      query: query.trim(),
      goal: goal.trim(),
      steps: Array.isArray(steps) ? steps : [],
      rationale: rationale.trim(),
      successRating,
      tags: Array.isArray(tags) ? tags : [],
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    }

    const created = await storePlanExample(example)

    return NextResponse.json(created, { status: 201 })
  } catch (error: any) {
    console.error('[Planner Examples API] Error creating example:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create example' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/planner-examples
 * 
 * Update an existing planner example
 * 
 * Body:
 * {
 *   id: string;
 *   query?: string;
 *   goal?: string;
 *   steps?: Array<{ description: string; action: string; parameters?: Record<string, any> }>;
 *   rationale?: string;
 *   successRating?: number;
 *   tags?: string[];
 * }
 * 
 * Returns: Updated PlanExample
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...fields } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Get existing example
    const allExamples = await getAllPlanExamples()
    const existing = allExamples.find((ex) => ex.id === id)

    if (!existing) {
      return NextResponse.json(
        { error: `Example ${id} not found` },
        { status: 404 }
      )
    }

    // Update fields
    const updated: Omit<PlanExample, 'id' | 'embedding'> = {
      query: fields.query !== undefined ? fields.query.trim() : existing.query,
      goal: fields.goal !== undefined ? fields.goal.trim() : existing.goal,
      steps: fields.steps !== undefined ? fields.steps : existing.steps,
      rationale: fields.rationale !== undefined ? fields.rationale.trim() : existing.rationale,
      successRating: fields.successRating !== undefined ? fields.successRating : existing.successRating,
      tags: fields.tags !== undefined ? fields.tags : existing.tags,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
      usageCount: existing.usageCount,
    }

    // If query changed, regenerate embedding
    if (fields.query !== undefined && fields.query !== existing.query) {
      // Delete old and create new
      await deletePlanExample(id)
      const created = await storePlanExample(updated)
      return NextResponse.json(created, { status: 200 })
    } else {
      // Just update metadata (no embedding change needed)
      await deletePlanExample(id)
      const created = await storePlanExample(updated)
      return NextResponse.json(created, { status: 200 })
    }
  } catch (error: any) {
    console.error('[Planner Examples API] Error updating example:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update example' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/planner-examples
 * 
 * Delete a planner example or all examples
 * 
 * Query params:
 * - ?id=<example-id> - Delete specific example
 * - ?all=true - Delete all examples
 * 
 * Returns: { success: true, count?: number }
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const deleteAll = searchParams.get('all') === 'true'

    if (deleteAll) {
      // Delete all examples from Pinecone
      const allExamples = await getAllPlanExamples()
      const count = allExamples.length

      // Delete each example
      for (const example of allExamples) {
        await deletePlanExample(example.id)
      }

      return NextResponse.json(
        { success: true, count },
        { status: 200 }
      )
    }

    if (!id) {
      return NextResponse.json(
        { error: 'id query parameter is required, or use ?all=true to delete all' },
        { status: 400 }
      )
    }

    await deletePlanExample(id)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error('[Planner Examples API] Error deleting example:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete example' },
      { status: 500 }
    )
  }
}


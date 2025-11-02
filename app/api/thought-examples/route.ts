import { NextRequest, NextResponse } from 'next/server'
import {
  storeThoughtExample,
  getAllThoughtExamples,
  deleteThoughtExample,
  querySimilarThoughtExamples,
} from '@/lib/pinecone/thought-examples'
import { generateEmbedding } from '@/lib/ollama/embeddings'
import { ThoughtExample } from '@/types'

/**
 * GET /api/thought-examples
 * 
 * List all thought examples
 * 
 * Returns: Array of ThoughtExample
 */
export async function GET() {
  try {
    const examples = await getAllThoughtExamples()
    return NextResponse.json(examples, { status: 200 })
  } catch (error: any) {
    console.error('[Thought Examples API] Error fetching examples:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch examples' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/thought-examples
 * 
 * Create a new thought example
 * 
 * Body:
 * {
 *   query: string;
 *   reasoning: string;
 *   approaches: string[];
 *   constraints: string[];
 *   assumptions: string[];
 *   uncertainties: string[];
 *   recommendedTools: string[];
 *   successRating: number;
 *   tags: string[];
 * }
 * 
 * Returns: Created ThoughtExample
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { query, reasoning, approaches, constraints, assumptions, uncertainties, recommendedTools, successRating, tags } = body

    // Validate input
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'query (string) is required' },
        { status: 400 }
      )
    }

    if (!reasoning || typeof reasoning !== 'string') {
      return NextResponse.json(
        { error: 'reasoning (string) is required' },
        { status: 400 }
      )
    }

    if (typeof successRating !== 'number' || successRating < 0 || successRating > 1) {
      return NextResponse.json(
        { error: 'successRating must be a number between 0 and 1' },
        { status: 400 }
      )
    }

    // Create example (embedding will be generated in storeThoughtExample)
    const now = new Date().toISOString()
    const example: Omit<ThoughtExample, 'id' | 'embedding'> = {
      query: query.trim(),
      reasoning: reasoning.trim(),
      approaches: Array.isArray(approaches) ? approaches : [],
      constraints: Array.isArray(constraints) ? constraints : [],
      assumptions: Array.isArray(assumptions) ? assumptions : [],
      uncertainties: Array.isArray(uncertainties) ? uncertainties : [],
      recommendedTools: Array.isArray(recommendedTools) ? recommendedTools : [],
      successRating,
      tags: Array.isArray(tags) ? tags : [],
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    }

    const created = await storeThoughtExample(example)

    return NextResponse.json(created, { status: 201 })
  } catch (error: any) {
    console.error('[Thought Examples API] Error creating example:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create example' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/thought-examples
 * 
 * Update an existing thought example
 * 
 * Body:
 * {
 *   id: string;
 *   query?: string;
 *   reasoning?: string;
 *   approaches?: string[];
 *   constraints?: string[];
 *   assumptions?: string[];
 *   uncertainties?: string[];
 *   recommendedTools?: string[];
 *   successRating?: number;
 *   tags?: string[];
 * }
 * 
 * Returns: Updated ThoughtExample
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...fields } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Get existing example
    const allExamples = await getAllThoughtExamples()
    const existing = allExamples.find((ex) => ex.id === id)

    if (!existing) {
      return NextResponse.json(
        { error: `Example ${id} not found` },
        { status: 404 }
      )
    }

    // Update fields
    const updated: Omit<ThoughtExample, 'id' | 'embedding'> = {
      query: fields.query !== undefined ? fields.query.trim() : existing.query,
      reasoning: fields.reasoning !== undefined ? fields.reasoning.trim() : existing.reasoning,
      approaches: fields.approaches !== undefined ? fields.approaches : existing.approaches,
      constraints: fields.constraints !== undefined ? fields.constraints : existing.constraints,
      assumptions: fields.assumptions !== undefined ? fields.assumptions : existing.assumptions,
      uncertainties: fields.uncertainties !== undefined ? fields.uncertainties : existing.uncertainties,
      recommendedTools: fields.recommendedTools !== undefined ? fields.recommendedTools : existing.recommendedTools,
      successRating: fields.successRating !== undefined ? fields.successRating : existing.successRating,
      tags: fields.tags !== undefined ? fields.tags : existing.tags,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
      usageCount: existing.usageCount,
    }

    // If query changed, regenerate embedding
    if (fields.query !== undefined && fields.query !== existing.query) {
      // Delete old and create new
      await deleteThoughtExample(id)
      const created = await storeThoughtExample(updated)
      return NextResponse.json(created, { status: 200 })
    } else {
      // Just update metadata (no embedding change needed)
      await deleteThoughtExample(id)
      const created = await storeThoughtExample(updated)
      return NextResponse.json(created, { status: 200 })
    }
  } catch (error: any) {
    console.error('[Thought Examples API] Error updating example:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update example' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/thought-examples
 * 
 * Delete a thought example or all examples
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
      const allExamples = await getAllThoughtExamples()
      const count = allExamples.length

      // Delete each example
      for (const example of allExamples) {
        await deleteThoughtExample(example.id)
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

    await deleteThoughtExample(id)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error('[Thought Examples API] Error deleting example:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete example' },
      { status: 500 }
    )
  }
}


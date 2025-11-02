import { NextRequest, NextResponse } from 'next/server'
import {
  storeComplexityExample,
  getAllExamples,
  deleteComplexityExample,
  querySimilarExamples,
} from '@/lib/pinecone/complexity-examples'
import { generateEmbedding } from '@/lib/ollama/embeddings'
import { ComplexityExample, ComplexityConfig } from '@/types'

/**
 * GET /api/complexity-examples
 * 
 * List all complexity examples
 * 
 * Returns: Array of ComplexityExample
 */
export async function GET() {
  try {
    const examples = await getAllExamples()
    return NextResponse.json(examples, { status: 200 })
  } catch (error: any) {
    console.error('[Complexity Examples API] Error fetching examples:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch examples' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/complexity-examples
 * 
 * Create a new complexity example
 * 
 * Body:
 * {
 *   query: string;
 *   config: ComplexityConfig;
 * }
 * 
 * Returns: Created ComplexityExample
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { query, config } = body

    // Validate input
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'query (string) is required' },
        { status: 400 }
      )
    }

    if (!config || typeof config.complexityScore !== 'number' || typeof config.reasoningPasses !== 'number') {
      return NextResponse.json(
        { error: 'config with complexityScore and reasoningPasses is required' },
        { status: 400 }
      )
    }

    // Validate config values
    if (config.complexityScore < 0 || config.complexityScore > 1) {
      return NextResponse.json(
        { error: 'complexityScore must be between 0 and 1' },
        { status: 400 }
      )
    }

    if (![1, 2, 3].includes(config.reasoningPasses)) {
      return NextResponse.json(
        { error: 'reasoningPasses must be 1, 2, or 3' },
        { status: 400 }
      )
    }

    // Create example (embedding will be generated in storeComplexityExample)
    const now = new Date().toISOString()
    const example: Omit<ComplexityExample, 'id' | 'embedding'> = {
      query: query.trim(),
      config: config as ComplexityConfig,
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    }

    const created = await storeComplexityExample(example)

    return NextResponse.json(created, { status: 201 })
  } catch (error: any) {
    console.error('[Complexity Examples API] Error creating example:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create example' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/complexity-examples
 * 
 * Update an existing complexity example
 * 
 * Body:
 * {
 *   id: string;
 *   query?: string;
 *   config?: ComplexityConfig;
 * }
 * 
 * Returns: Updated ComplexityExample
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, query, config } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Get existing example
    const allExamples = await getAllExamples()
    const existing = allExamples.find((ex) => ex.id === id)

    if (!existing) {
      return NextResponse.json(
        { error: `Example ${id} not found` },
        { status: 404 }
      )
    }

    // Update fields
    const updated: Omit<ComplexityExample, 'id' | 'embedding'> = {
      query: query !== undefined ? query.trim() : existing.query,
      config: config || existing.config,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
      usageCount: existing.usageCount,
    }

    // If query changed, regenerate embedding
    if (query !== undefined && query !== existing.query) {
      const embedding = await generateEmbedding(updated.query)
      // Delete old and create new
      await deleteComplexityExample(id)
      const created = await storeComplexityExample(updated)
      return NextResponse.json(created, { status: 200 })
    } else {
      // Just update metadata (no embedding change needed)
      // For simplicity, we'll delete and recreate with same embedding
      // In production, you might want a direct update method
      await deleteComplexityExample(id)
      const created = await storeComplexityExample(updated)
      return NextResponse.json(created, { status: 200 })
    }
  } catch (error: any) {
    console.error('[Complexity Examples API] Error updating example:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update example' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/complexity-examples
 * 
 * Delete a complexity example or all examples
 * 
 * Query params:
 * - ?id=<example-id> - Delete specific example
 * - ?all=true - Delete all examples (requires confirmation)
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
      const allExamples = await getAllExamples()
      const count = allExamples.length

      // Delete each example
      for (const example of allExamples) {
        await deleteComplexityExample(example.id)
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

    await deleteComplexityExample(id)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error('[Complexity Examples API] Error deleting example:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete example' },
      { status: 500 }
    )
  }
}



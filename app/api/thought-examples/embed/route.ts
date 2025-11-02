import { NextRequest, NextResponse } from 'next/server'
import { generateEmbedding } from '@/lib/ollama/embeddings'

/**
 * POST /api/thought-examples/embed
 * 
 * Generate embedding for a text (utility endpoint)
 * 
 * Body:
 * {
 *   text: string;
 * }
 * 
 * Returns: { embedding: number[] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { text } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text (string) is required' }, { status: 400 })
    }

    const embedding = await generateEmbedding(text)

    return NextResponse.json({ embedding }, { status: 200 })
  } catch (error: any) {
    console.error('[Thought Examples API] Error generating embedding:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate embedding' },
      { status: 500 }
    )
  }
}


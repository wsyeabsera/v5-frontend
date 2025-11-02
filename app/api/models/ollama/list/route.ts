import { NextRequest, NextResponse } from 'next/server'
import { Ollama } from 'ollama'

/**
 * POST /api/models/ollama/list
 * 
 * List available Ollama models
 * 
 * Body: { ollamaUrl: string }
 * 
 * Returns: { models: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { ollamaUrl } = body

    if (!ollamaUrl) {
      return NextResponse.json(
        { error: 'ollamaUrl is required' },
        { status: 400 }
      )
    }

    const client = new Ollama({ host: ollamaUrl })
    const response = await client.list()
    const models = response.models.map((model: any) => model.name)

    return NextResponse.json({ models })
  } catch (error: any) {
    console.error('[Ollama List API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to list Ollama models' },
      { status: 500 }
    )
  }
}


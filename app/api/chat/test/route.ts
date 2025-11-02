import { NextResponse } from 'next/server'
import { createOpenAI } from '@ai-sdk/openai'

// Simple test endpoint to verify Groq connection
export async function POST(req: Request) {
  try {
    const { apiKey } = await req.json()
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 400 })
    }

    console.log('[Test] Testing Groq connection with key:', apiKey.substring(0, 10) + '...')

    // Try to initialize Groq client
    const groq = createOpenAI({ 
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1'
    })

    console.log('[Test] Groq client created successfully')

    // Try to create a model instance
    const model = groq('llama-3.3-70b-versatile')
    
    console.log('[Test] Model instance created:', typeof model)

    return NextResponse.json({ 
      success: true,
      message: 'Groq client initialized successfully',
      model: 'llama-3.3-70b-versatile'
    })
  } catch (error: any) {
    console.error('[Test] Error:', error)
    return NextResponse.json({ 
      error: error.message,
      details: error.toString(),
      stack: error.stack?.split('\n').slice(0, 3)
    }, { status: 500 })
  }
}


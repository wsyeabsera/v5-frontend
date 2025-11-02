import { NextRequest, NextResponse } from 'next/server'
import { Ollama } from 'ollama'

/**
 * POST /api/models/test
 * 
 * Test a model's API connection
 * 
 * Body:
 * {
 *   provider: 'anthropic' | 'openai' | 'google' | 'groq' | 'ollama';
 *   modelId: string;
 *   apiKey?: string;
 *   ollamaUrl?: string;
 * }
 * 
 * Returns: { success: boolean, message: string, latency?: number }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { provider, modelId, apiKey, ollamaUrl } = body

    if (!provider || !modelId) {
      return NextResponse.json(
        { error: 'provider and modelId are required' },
        { status: 400 }
      )
    }

    const startTime = Date.now()

    let success = false
    let message = ''

    try {
      switch (provider) {
        case 'ollama': {
          if (!ollamaUrl) {
            return NextResponse.json(
              { error: 'ollamaUrl is required for Ollama provider' },
              { status: 400 }
            )
          }

          const client = new Ollama({ host: ollamaUrl })
          
          // Test connection by listing models
          const response = await client.list()
          
          // Check if the requested model is available
          const isModelAvailable = response.models.some((model: any) => 
            model.name === modelId || model.name.includes(modelId)
          )

          if (isModelAvailable) {
            // Check if this is an embedding model
            const isEmbeddingModel = modelId.includes('embed')
            
            if (isEmbeddingModel) {
              // Try to generate a test embedding
              await client.embeddings({
                model: modelId,
                prompt: 'test sample text',
              })
              success = true
              message = `Ollama embedding model "${modelId}" is working`
            } else {
              // Try to generate a test completion
              await client.generate({
                model: modelId,
                prompt: 'test',
                options: {
                  num_predict: 5, // Very short test
                },
              })
              success = true
              message = `Ollama model "${modelId}" is working`
            }
          } else {
            success = false
            message = `Model "${modelId}" not found. Available models: ${response.models.map((m: any) => m.name).join(', ')}`
          }
          break
        }

        case 'anthropic': {
          if (!apiKey) {
            return NextResponse.json(
              { error: 'apiKey is required for Anthropic provider' },
              { status: 400 }
            )
          }

          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: modelId,
              max_tokens: 10,
              messages: [{ role: 'user', content: 'test' }],
            }),
          })

          if (response.ok) {
            await response.json()
            success = true
            message = `Anthropic API key is valid`
          } else {
            const error = await response.json()
            success = false
            message = error.error?.message || 'Invalid API key or model'
          }
          break
        }

        case 'openai': {
          if (!apiKey) {
            return NextResponse.json(
              { error: 'apiKey is required for OpenAI provider' },
              { status: 400 }
            )
          }

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: modelId,
              max_tokens: 10,
              messages: [{ role: 'user', content: 'test' }],
            }),
          })

          if (response.ok) {
            await response.json()
            success = true
            message = `OpenAI API key is valid`
          } else {
            const error = await response.json()
            success = false
            message = error.error?.message || 'Invalid API key or model'
          }
          break
        }

        case 'google': {
          if (!apiKey) {
            return NextResponse.json(
              { error: 'apiKey is required for Google provider' },
              { status: 400 }
            )
          }

          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: 'test' }],
              }],
              generationConfig: {
                maxOutputTokens: 10,
              },
            }),
          })

          if (response.ok) {
            await response.json()
            success = true
            message = `Google API key is valid`
          } else {
            const error = await response.json()
            success = false
            message = error.error?.message || 'Invalid API key or model'
          }
          break
        }

        case 'groq': {
          if (!apiKey) {
            return NextResponse.json(
              { error: 'apiKey is required for Groq provider' },
              { status: 400 }
            )
          }

          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: modelId,
              max_tokens: 10,
              messages: [{ role: 'user', content: 'test' }],
            }),
          })

          if (response.ok) {
            await response.json()
            success = true
            message = `Groq API key is valid`
          } else {
            const error = await response.json()
            success = false
            message = error.error?.message || 'Invalid API key or model'
          }
          break
        }

        default:
          success = false
          message = `Unknown provider: ${provider}`
      }

      const latency = Date.now() - startTime

      return NextResponse.json({
        success,
        message,
        latency,
      })
    } catch (error: any) {
      const latency = Date.now() - startTime
      
      return NextResponse.json({
        success: false,
        message: error.message || 'Test failed',
        latency,
      })
    }
  } catch (error: any) {
    console.error('[Model Test API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

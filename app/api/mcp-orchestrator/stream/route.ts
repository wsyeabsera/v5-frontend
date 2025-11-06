import { NextRequest } from 'next/server'

const MCP_ORCHESTRATOR_SERVER_URL = process.env.NEXT_PUBLIC_MCP_ORCHESTRATOR_SERVER_URL || 'http://localhost:5001/sse'

/**
 * Stream endpoint for orchestrator execution
 * Proxies SSE stream from orchestrator server to frontend
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orchestratorId, userQuery, conversationHistory, stream = true, summaryFormat } = body

    if (!orchestratorId || !userQuery) {
      return new Response(
        JSON.stringify({ error: 'orchestratorId and userQuery are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Create a readable stream for SSE
    const encoder = new TextEncoder()
    const sseStream = new ReadableStream({
      async start(controller) {
        try {
          // Make request to orchestrator server
          const response = await fetch(MCP_ORCHESTRATOR_SERVER_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: Date.now(),
              method: 'tools/call',
              params: {
                name: 'execute_orchestration',
                arguments: {
                  orchestratorId,
                  userQuery,
                  conversationHistory,
                  stream,
                  ...(summaryFormat && { summaryFormat }),
                },
              },
            }),
          })

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          // Check if response is SSE
          const contentType = response.headers.get('content-type')
          if (contentType?.includes('text/event-stream')) {
            // Forward SSE stream
            const reader = response.body?.getReader()
            if (!reader) {
              throw new Error('No response body')
            }

            const decoder = new TextDecoder()

            while (true) {
              const { done, value } = await reader.read()

              if (done) {
                controller.close()
                break
              }

              // Decode and forward the chunk
              const chunk = decoder.decode(value, { stream: true })
              controller.enqueue(encoder.encode(chunk))
            }
          } else {
            // Non-streaming response - convert to SSE format
            const data = await response.json()
            if (data.error) {
              controller.enqueue(
                encoder.encode(`event: error\ndata: ${JSON.stringify(data.error)}\n\n`)
              )
            } else {
              controller.enqueue(
                encoder.encode(`event: complete\ndata: ${JSON.stringify(data.result)}\n\n`)
              )
            }
            controller.close()
          }
        } catch (error: any) {
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`)
          )
          controller.close()
        }
      },
    })

    // Return SSE response
    return new Response(sseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}


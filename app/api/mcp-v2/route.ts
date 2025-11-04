import { NextRequest, NextResponse } from 'next/server'

const MCP_V2_SERVER_URL = process.env.NEXT_PUBLIC_MCP_V2_SERVER_URL || 'http://localhost:4000/sse'

let requestId = 0

async function mcpRequest(method: string, params: any = {}) {
  requestId++
  
  const response = await fetch(MCP_V2_SERVER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: requestId,
      method,
      params,
    }),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(data.error.message || 'MCP request failed')
  }

  return data.result
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { method, params } = body

    // Handle both direct method calls and tools/call format from client
    let actualMethod = method
    let actualParams = params

    // If client sends tools/call format, extract the actual method and params
    if (method === 'tools/call' && params?.name && params?.arguments) {
      // Need to make a tools/call request with the tool name
      requestId++
      
      const response = await fetch(MCP_V2_SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: requestId,
          method: 'tools/call',
          params: {
            name: params.name,
            arguments: params.arguments,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error.message || 'MCP request failed')
      }

      return NextResponse.json({ result: data.result })
    }

    if (!actualMethod) {
      return NextResponse.json(
        { error: 'Method is required' },
        { status: 400 }
      )
    }

    const result = await mcpRequest(actualMethod, actualParams)
    
    return NextResponse.json({ result })
  } catch (error: any) {
    console.error('[MCP V2 API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'

const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'http://localhost:3000/sse'

let requestId = 0

async function mcpRequest(method: string, params: any = {}) {
  requestId++
  
  const response = await fetch(MCP_SERVER_URL, {
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

    if (!method) {
      return NextResponse.json(
        { error: 'Method is required' },
        { status: 400 }
      )
    }

    const result = await mcpRequest(method, params)
    
    return NextResponse.json({ result })
  } catch (error: any) {
    console.error('[MCP API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


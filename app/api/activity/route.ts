import { NextResponse } from 'next/server'

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

export async function GET() {
  try {
    // Read the activity://recent resource
    const result = await mcpRequest('resources/read', {
      uri: 'activity://recent'
    })
    
    // Parse the content from the resource
    if (result.contents && result.contents.length > 0) {
      const content = result.contents[0]
      if (content.text) {
        const activity = JSON.parse(content.text)
        return NextResponse.json(activity)
      }
    }
    
    // Return empty activity if no content
    return NextResponse.json({
      recentInspections: [],
      recentShipments: [],
      recentContaminants: []
    })
  } catch (error: any) {
    console.error('[Activity API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch activity' },
      { status: 500 }
    )
  }
}


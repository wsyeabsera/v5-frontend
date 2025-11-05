import { NextRequest, NextResponse } from 'next/server'

const MCP_V2_SERVER_URL = process.env.NEXT_PUBLIC_MCP_V2_SERVER_URL || 'http://localhost:4000/sse'

let requestId = 0

/**
 * Cleans and parses MCP result by:
 * 1. Extracting text content from content array
 * 2. Removing newlines (both literal and escaped \n patterns)
 * 3. Removing trailing \n4 patterns
 * 4. Parsing as JSON if valid
 */
function cleanAndParseMCPResult(result: any): any {
  // If result has content array with text, extract and clean it
  if (result?.content && Array.isArray(result.content)) {
    const textContent = result.content
      .map((item: any) => item?.text || '')
      .join('')
      .trim()

    if (textContent) {
      // Remove all newlines: literal newlines, escaped newlines (\n), and whitespace
      // First handle escaped newlines (backslash followed by n)
      let cleaned = textContent.replace(/\\n/g, '')
      // Then remove literal newlines
      cleaned = cleaned.replace(/\n/g, '')
      // Remove any trailing whitespace
      cleaned = cleaned.trim()
      
      // Remove trailing patterns like \n4 (both escaped and literal)
      cleaned = cleaned.replace(/\\n\d+$/g, '')
      cleaned = cleaned.replace(/\n\d+$/g, '')
      cleaned = cleaned.trim()
      
      // Try to parse as JSON
      try {
        const parsed = JSON.parse(cleaned)
        // Ensure arrays are returned as arrays (not wrapped)
        return Array.isArray(parsed) ? parsed : parsed
      } catch (e) {
        // If not valid JSON, return cleaned text
        console.warn('[MCP V2 API] Failed to parse JSON:', e)
        return cleaned
      }
    }
    // If content array exists but no text content, return empty array
    return []
  }

  // If result is a string, try to clean and parse it
  if (typeof result === 'string') {
    let cleaned = result.replace(/\\n/g, '').replace(/\n/g, '').trim()
    cleaned = cleaned.replace(/\\n\d+$/g, '').replace(/\n\d+$/g, '').trim()
    
    try {
      const parsed = JSON.parse(cleaned)
      return Array.isArray(parsed) ? parsed : parsed
    } catch {
      return cleaned
    }
  }

  // If result is already an array, return it directly
  if (Array.isArray(result)) {
    return result
  }

  // Return result as-is if no cleaning needed
  return result
}

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

      // Clean and parse the result
      const cleanedResult = cleanAndParseMCPResult(data.result)

      return NextResponse.json({ result: cleanedResult })
    }

    if (!actualMethod) {
      return NextResponse.json(
        { error: 'Method is required' },
        { status: 400 }
      )
    }

    const result = await mcpRequest(actualMethod, actualParams)
    
    // Clean and parse the result
    const cleanedResult = cleanAndParseMCPResult(result)
    
    return NextResponse.json({ result: cleanedResult })
  } catch (error: any) {
    console.error('[MCP V2 API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

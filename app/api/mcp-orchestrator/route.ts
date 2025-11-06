import { NextRequest, NextResponse } from 'next/server'

const MCP_ORCHESTRATOR_SERVER_URL = process.env.NEXT_PUBLIC_MCP_ORCHESTRATOR_SERVER_URL || 'http://localhost:5001/sse'

let requestId = 0

/**
 * Cleans and parses MCP result by:
 * 1. Extracting text content from content array
 * 2. Removing newlines (both literal and escaped \n patterns) - EXCEPT for markdown/text content
 * 3. Removing trailing \n4 patterns
 * 4. Parsing as JSON if valid
 */
function cleanAndParseMCPResult(result: any, preserveNewlines: boolean = false): any {
  // If result has content array with text, extract and clean it
  if (result?.content && Array.isArray(result.content)) {
    const textContent = result.content
      .map((item: any) => item?.text || '')
      .join('')
      .trim()

    if (textContent) {
      let cleaned = textContent
      
      if (!preserveNewlines) {
        // Remove all newlines: literal newlines, escaped newlines (\n), and whitespace
        // First handle escaped newlines (backslash followed by n)
        cleaned = cleaned.replace(/\\n/g, '')
        // Then remove literal newlines
        cleaned = cleaned.replace(/\n/g, '')
        // Remove any trailing whitespace
        cleaned = cleaned.trim()
        
        // Remove trailing patterns like \n4 (both escaped and literal)
        cleaned = cleaned.replace(/\\n\d+$/g, '')
        cleaned = cleaned.replace(/\n\d+$/g, '')
        cleaned = cleaned.trim()
        
        // Fix invalid escape sequences that break JSON.parse()
        // Replace invalid escape sequences (like \@, \!, etc.) with the actual character
        // Valid JSON escape sequences are: \\, \/, \b, \f, \n, \r, \t, \uXXXX
        cleaned = cleaned.replace(/\\([^"\\/bfnrtu])/g, '$1')
      } else {
        // For markdown/text content, preserve newlines but clean up problematic patterns
        // Remove trailing patterns like \n4 (both escaped and literal)
        cleaned = cleaned.replace(/\\n\d+$/g, '')
        cleaned = cleaned.replace(/\n\d+$/g, '')
        // Normalize escaped newlines to actual newlines - preserve all newlines
        // First convert escaped newlines to actual newlines
        cleaned = cleaned.replace(/\\n/g, '\n')
        // Then ensure we preserve the actual newlines (don't remove them)
        // Only trim leading/trailing whitespace, not internal newlines
        cleaned = cleaned.trim()
      }
      
      // Try to parse as JSON only if not preserving newlines
      // (preserving newlines usually means markdown/text content, not JSON)
      if (!preserveNewlines) {
        try {
          const parsed = JSON.parse(cleaned)
          // Ensure arrays are returned as arrays (not wrapped)
          return Array.isArray(parsed) ? parsed : parsed
        } catch (e) {
          // If not valid JSON, return cleaned text
          console.warn('[MCP Orchestrator API] Failed to parse JSON:', e)
          return cleaned
        }
      } else {
        // For markdown/text content, return as-is (don't try to parse as JSON)
        return cleaned
      }
    }
    // If content array exists but no text content, return empty array
    return []
  }

  // If result is a string, try to clean and parse it
  if (typeof result === 'string') {
    let cleaned = result
    if (!preserveNewlines) {
      cleaned = cleaned.replace(/\\n/g, '').replace(/\n/g, '').trim()
      cleaned = cleaned.replace(/\\n\d+$/g, '').replace(/\n\d+$/g, '').trim()
      
      // Fix invalid escape sequences that break JSON.parse()
      cleaned = cleaned.replace(/\\([^"\\/bfnrtu])/g, '$1')

      try {
        const parsed = JSON.parse(cleaned)
        return Array.isArray(parsed) ? parsed : parsed
      } catch {
        return cleaned
      }
    } else {
      // For markdown/text content, preserve newlines
      cleaned = cleaned.replace(/\\n\d+$/g, '')
      cleaned = cleaned.replace(/\n\d+$/g, '')
      // Normalize escaped newlines to actual newlines
      cleaned = cleaned.replace(/\\n/g, '\n')
      // Only trim leading/trailing whitespace, preserve internal newlines
      cleaned = cleaned.trim()
      // Don't try to parse as JSON for markdown/text content
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

/**
 * Parse SSE-formatted response
 */
async function parseSSEResponse(response: Response): Promise<any> {
  const text = await response.text()
  const lines = text.split('\n')
  
  // Find the last complete data line
  let lastData: string | null = null
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      lastData = line.substring(6).trim()
    }
  }
  
  if (!lastData) {
    throw new Error('No data found in SSE response')
  }
  
  try {
    return JSON.parse(lastData)
  } catch (error) {
    throw new Error(`Failed to parse SSE data as JSON: ${error}`)
  }
}

async function mcpRequest(method: string, params: any = {}) {
  requestId++
  
  const response = await fetch(MCP_ORCHESTRATOR_SERVER_URL, {
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

  // Check if response is SSE format
  const contentType = response.headers.get('content-type') || ''
  let data: any
  
  if (contentType.includes('text/event-stream')) {
    // Parse SSE format
    data = await parseSSEResponse(response)
  } else {
    // Parse as JSON
    data = await response.json()
  }

  if (data.error) {
    throw new Error(data.error.message || 'MCP request failed')
  }

  return data.result
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { method, params, options } = body

    // Handle both direct method calls and tools/call format from client
    let actualMethod = method
    let actualParams = params

    // If client sends tools/call format, extract the actual method and params
    if (method === 'tools/call' && params?.name && params?.arguments) {
      // Need to make a tools/call request with the tool name
      requestId++
      
      // For non-streaming tools, explicitly set stream: false
      const toolName = params.name
      const isStreamingTool = toolName === 'execute_orchestration'
      const toolArguments = {
        ...params.arguments,
        // Only allow streaming for execute_orchestration
        stream: isStreamingTool ? (params.arguments?.stream !== false) : false,
      }
      
      const response = await fetch(MCP_ORCHESTRATOR_SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: requestId,
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: toolArguments,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Check if response is SSE format
      const contentType = response.headers.get('content-type') || ''
      let data: any
      
      if (contentType.includes('text/event-stream')) {
        // Parse SSE format
        data = await parseSSEResponse(response)
      } else {
        // Parse as JSON
        data = await response.json()
      }

      if (data.error) {
        throw new Error(data.error.message || 'MCP request failed')
      }

      // Check for preserveNewlines in options
      const preserveNewlines = options?.preserveNewlines ?? false
      let cleanedResult = cleanAndParseMCPResult(data.result, preserveNewlines)
      
      // If the result is still a string after cleaning, try to parse it as JSON
      // This handles cases where the backend returns a JSON string that wasn't parsed
      if (typeof cleanedResult === 'string' && cleanedResult.trim().startsWith('{')) {
        try {
          // Additional cleaning for invalid escape sequences
          let stringToParse = cleanedResult.trim()
          // Fix invalid escape sequences
          stringToParse = stringToParse.replace(/\\([^"\\/bfnrtu])/g, '$1')
          cleanedResult = JSON.parse(stringToParse)
        } catch (e) {
          // If parsing fails, keep the string as-is
          console.warn('[MCP Orchestrator API] Failed to parse cleaned result as JSON:', e)
        }
      }

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
    console.error('[MCP Orchestrator API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


/**
 * MCP Tool Adapter
 * 
 * Handles communication with MCP server for tool execution
 */

const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'http://localhost:3000/sse'

let requestId = 0

/**
 * Make a request to MCP server
 */
async function serverMCPRequest(method: string, params: any = {}): Promise<any> {
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

/**
 * Call an MCP tool
 * Handles MCP text format responses by parsing JSON from text field
 */
export async function callMCPTool(name: string, args: any): Promise<any> {
  const result = await serverMCPRequest('tools/call', { name, arguments: args })
  
  // Handle MCP text format: {"type": "text", "text": "[...JSON...]"}
  let parsedResult = result.content || result
  
  // If result is array with text format objects, extract JSON from text field
  if (Array.isArray(parsedResult)) {
    parsedResult = parsedResult.map((item: any) => {
      // If item has type="text" and text field contains JSON, parse it
      if (item && item.type === 'text' && typeof item.text === 'string') {
        try {
          const parsed = JSON.parse(item.text)
          // If parsed is an array (common case), return it directly
          if (Array.isArray(parsed)) {
            return parsed
          }
          return parsed
        } catch {
          // If parsing fails, return original text
          return item.text
        }
      }
      return item
    })
    
    // Flatten if we got arrays inside arrays
    if (parsedResult.length === 1 && Array.isArray(parsedResult[0])) {
      parsedResult = parsedResult[0]
    }
  } else if (parsedResult && typeof parsedResult === 'object') {
    // Single object with text format
    if (parsedResult.type === 'text' && typeof parsedResult.text === 'string') {
      try {
        const parsed = JSON.parse(parsedResult.text)
        parsedResult = parsed
      } catch {
        parsedResult = parsedResult.text
      }
    }
  }
  
  return {
    message: 'Success',
    tools: [name],
    result: parsedResult,
  }
}

/**
 * Validate tool parameters using MCP server's tools/validate endpoint
 * 
 * @param toolName - Name of the tool to validate
 * @param arguments - Current arguments/parameters to validate
 * @param context - Optional context (e.g., facilityCode, shortCode) for better categorization
 * @returns Validation result with categorization (resolvable, mustAskUser, canInfer)
 */
export async function validateToolParameters(
  toolName: string,
  args: Record<string, any>,
  context?: Record<string, any>
): Promise<{
  toolName: string
  requiredParams: string[]
  providedParams: string[]
  missingParams: string[]
  categorization: {
    resolvable: string[]
    mustAskUser: string[]
    canInfer: string[]
  }
  validation: {
    isValid: boolean
    invalidParams: string[]
  }
  confidence: number
}> {
  const result = await serverMCPRequest('tools/validate', {
    name: toolName,
    arguments: args,
    context: context || {},
  })
  
  // Return the validation result directly
  return result
}


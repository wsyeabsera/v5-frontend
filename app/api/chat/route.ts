import { listMCPPrompts, listMCPTools, formatPromptsForContext, formatToolsForContext } from '@/lib/mcp-prompts'

const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:3002/stream'

// Health check
export async function GET() {
  return Response.json({ 
    status: 'ok', 
    message: 'Chat API proxy is running',
    aiServer: AI_SERVER_URL,
    timestamp: new Date().toISOString()
  })
}

export async function POST(req: Request) {
  const startTime = Date.now()
  
  try {
    console.log('[Chat API Proxy] Received request')
    const { messages, modelId, apiKey } = await req.json()
    console.log('[Chat API Proxy] Model:', modelId, 'Messages:', messages?.length || 0)

    if (!apiKey) {
      console.error('[Chat API Proxy] Missing API key')
      return new Response(JSON.stringify({ error: 'API key is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!modelId) {
      console.error('[Chat API Proxy] Missing model ID')
      return new Response(JSON.stringify({ error: 'Model ID is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Fetch MCP context
    console.log('[Chat API Proxy] Fetching MCP context')
    const [prompts, tools] = await Promise.all([
      listMCPPrompts().catch(() => []),
      listMCPTools().catch(() => []),
    ])

    // Build system prompt with MCP context
    const systemPrompt = `You are an intelligent waste management assistant with access to real-time facility data and powerful analysis tools.

${formatPromptsForContext(prompts)}

${formatToolsForContext(tools)}

## How to Help Users

1. **Answer Questions**: Use the available tools to fetch real data about facilities, shipments, inspections, and contaminants.

2. **Provide Analysis**: When users ask "how is [facility] doing?" or "analyze [something]", use the AI-powered analysis tools:
   - generate_facility_report: For comprehensive facility health analysis
   - analyze_shipment_risk: For shipment risk assessment
   - suggest_inspection_questions: For generating inspection checklists

3. **Be Proactive**: If you see patterns or concerns in the data, mention them and suggest actions.

4. **Format Responses**: Present data in clear, readable formats (tables, lists, summaries).

5. **Use Tools Wisely**: Call tools to get accurate data rather than guessing.

Remember: You have access to real data through these tools. Use them to provide accurate, actionable insights.`

    console.log('[Chat API Proxy] Proxying to AI server:', AI_SERVER_URL)
    
    // Proxy to AI streaming server
    const response = await fetch(AI_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        modelId,
        apiKey,
        systemPrompt,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[Chat API Proxy] AI server error:', response.status, error)
      return new Response(JSON.stringify({ error: `AI server error: ${error}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const elapsed = Date.now() - startTime
    console.log('[Chat API Proxy] Streaming response from AI server in', elapsed, 'ms')

    // Return the streaming response
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error: any) {
    const elapsed = Date.now() - startTime
    console.error('[Chat API Proxy] Request failed after', elapsed, 'ms')
    console.error('[Chat API Proxy] Error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        type: error.constructor.name,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

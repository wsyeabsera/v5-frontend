// MCP Prompts Helper - Fetch and format MCP workflow templates

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

export interface MCPPrompt {
  name: string
  description: string
  arguments: Array<{
    name: string
    description: string
    required: boolean
  }>
}

export async function listMCPPrompts(): Promise<MCPPrompt[]> {
  const result = await mcpRequest('prompts/list')
  return result.prompts || []
}

export async function getMCPPrompt(name: string, args: Record<string, any> = {}) {
  const result = await mcpRequest('prompts/get', { name, arguments: args })
  return result
}

export async function listMCPTools() {
  const result = await mcpRequest('tools/list')
  return result.tools || []
}

export function formatPromptsForContext(prompts: MCPPrompt[]): string {
  if (prompts.length === 0) return ''
  
  return `
## Available Workflow Templates (MCP Prompts)

You have access to these pre-built analysis workflows:

${prompts.map(p => `### ${p.name}
Description: ${p.description}
Arguments: ${p.arguments.map(a => `${a.name}${a.required ? ' (required)' : ''} - ${a.description}`).join(', ')}
`).join('\n')}

Use these prompts to provide comprehensive analysis when users ask about facilities, compliance, contamination, or performance.
`
}

export function formatToolsForContext(tools: any[]): string {
  if (tools.length === 0) return ''
  
  // Group tools by category
  const categories: Record<string, any[]> = {
    Facilities: [],
    Contaminants: [],
    Inspections: [],
    Shipments: [],
    Contracts: [],
    Analysis: [],
  }
  
  tools.forEach(tool => {
    if (tool.name.includes('facility')) categories.Facilities.push(tool)
    else if (tool.name.includes('contaminant')) categories.Contaminants.push(tool)
    else if (tool.name.includes('inspection')) categories.Inspections.push(tool)
    else if (tool.name.includes('shipment')) categories.Shipments.push(tool)
    else if (tool.name.includes('contract')) categories.Contracts.push(tool)
    else if (tool.name.includes('intelligent') || tool.name.includes('analyze') || tool.name.includes('suggest')) {
      categories.Analysis.push(tool)
    }
  })
  
  return `
## Available MCP Tools

You can call these tools to interact with the waste management system:

${Object.entries(categories).filter(([_, tools]) => tools.length > 0).map(([category, tools]) => `
### ${category}
${tools.map(t => `- **${t.name}**: ${t.description}`).join('\n')}
`).join('\n')}

When users ask questions, use these tools to fetch real data and provide accurate responses.
`
}


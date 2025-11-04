/**
 * Tool Schema Formatter
 * 
 * Dynamically formats MCP tool schemas for LLM prompts
 * No hardcoded domain knowledge - everything derived from schemas
 */

import { MCPContext } from '@/types'

/**
 * Format MCP tools and prompts for LLM prompt context
 */
export function formatMCPToolsForPrompt(mcpContext?: MCPContext): string {
  if (!mcpContext) {
    return ''
  }

  let formatted = ''

  // Format tools
  if (mcpContext.tools && mcpContext.tools.length > 0) {
    formatted += '\n## Available MCP Tools\n\n'
    formatted += `There are ${mcpContext.tools.length} tools available. Each tool has specific parameter requirements.\n\n`

  for (const tool of mcpContext.tools) {
    formatted += `### ${tool.name}\n`
    formatted += `${tool.description}\n\n`

    if (tool.inputSchema?.properties) {
      const requiredParams: string[] = tool.inputSchema.required || []
      const allParams = Object.entries(tool.inputSchema.properties)

      if (allParams.length > 0) {
        formatted += 'Parameters:\n'

        for (const [paramName, paramSchema] of allParams) {
          const schema = paramSchema as any
          const isRequired = requiredParams.includes(paramName)
          const requiredMark = isRequired ? ' ⚠️ REQUIRED' : ' (optional)'
          
          formatted += `  • **${paramName}**${requiredMark}\n`
          formatted += `    - Type: ${schema.type || 'any'}\n`
          
          if (schema.description) {
            formatted += `    - Description: ${schema.description}\n`
          }
          
          if (schema.enum) {
            formatted += `    - Allowed values: ${schema.enum.join(', ')}\n`
          }

          formatted += '\n'
        }
      } else {
        formatted += 'No parameters required.\n\n'
      }
    } else {
      formatted += 'No parameter schema available.\n\n'
    }
  }

    formatted += '## Tool Usage Guidelines\n\n'
    formatted += '1. Always use EXACT parameter names from tool schemas above\n'
    formatted += '2. All REQUIRED parameters must be provided\n'
    formatted += '3. Parameter types must match schema (string, number, boolean, etc.)\n'
    formatted += '4. If a tool requires an ID parameter, check if lookup tools exist to resolve names to IDs\n'
    formatted += '5. Discover tool relationships dynamically from names and descriptions\n'
  }

  // Format prompts/workflow templates
  if (mcpContext.prompts && mcpContext.prompts.length > 0) {
    formatted += '\n## Available Workflow Templates (MCP Prompts)\n\n'
    formatted += `There are ${mcpContext.prompts.length} workflow templates available. These are pre-built analysis workflows.\n\n`
    
    for (const prompt of mcpContext.prompts) {
      formatted += `### ${prompt.name}\n`
      formatted += `${prompt.description || 'No description available'}\n\n`
      
      if (prompt.arguments && prompt.arguments.length > 0) {
        formatted += 'Arguments:\n'
        for (const arg of prompt.arguments) {
          const requiredMark = arg.required ? ' ⚠️ REQUIRED' : ' (optional)'
          formatted += `  • **${arg.name}**${requiredMark}\n`
          if (arg.description) {
            formatted += `    - Description: ${arg.description}\n`
          }
          formatted += '\n'
        }
      } else {
        formatted += 'No arguments required.\n\n'
      }
    }
    
    formatted += '## Prompt Usage Guidelines\n\n'
    formatted += '1. Prompts are workflow templates that may call multiple tools internally\n'
    formatted += '2. Use prompt names exactly as shown above\n'
    formatted += '3. Provide all required arguments when calling a prompt\n'
    formatted += '4. Prompts return analysis results, not raw tool outputs\n\n'
  }

  return formatted
}

/**
 * Find tool by name
 */
export function findToolByName(mcpContext: MCPContext | undefined, toolName: string) {
  if (!mcpContext || !mcpContext.tools) return null
  return mcpContext.tools.find(t => t.name === toolName)
}

/**
 * Get all tools that match a pattern (for discovering related tools)
 */
export function findToolsByPattern(mcpContext: MCPContext | undefined, pattern: string | RegExp): Array<{ name: string; description: string; inputSchema: any }> {
  if (!mcpContext || !mcpContext.tools) return []
  
  const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern
  return mcpContext.tools.filter(t => regex.test(t.name))
}

/**
 * Get parameter requirements for a tool
 */
export function getToolParameters(tool: { inputSchema?: any }): {
  required: string[]
  optional: string[]
  all: Array<{ name: string; schema: any; required: boolean }>
} {
  if (!tool.inputSchema?.properties) {
    return { required: [], optional: [], all: [] }
  }

  const required = tool.inputSchema.required || []
  const allParams = Object.entries(tool.inputSchema.properties)
  
  const all = allParams.map(([name, schema]) => ({
    name,
    schema: schema as any,
    required: required.includes(name),
  }))

  const optional = allParams
    .map(([name]) => name)
    .filter(name => !required.includes(name))

  return { required, optional, all }
}

/**
 * Detect if a tool likely needs a lookup flow (has ID parameter, likely has list counterpart)
 */
export function detectLookupFlow(mcpContext: MCPContext | undefined, toolName: string): {
  needsLookup: boolean
  lookupTool?: string
  idParamName?: string
  reason: string
} {
  const tool = findToolByName(mcpContext, toolName)
  if (!tool) {
    return { needsLookup: false, reason: 'Tool not found' }
  }

  const params = getToolParameters(tool)
  
  // Check if tool has an ID parameter
  const idParam = params.all.find(p => 
    p.name.toLowerCase().includes('id') || 
    p.name.toLowerCase() === 'id' ||
    (p.schema.type === 'string' && p.required)
  )

  if (!idParam || !idParam.required) {
    return { needsLookup: false, reason: 'No required ID parameter found' }
  }

  // Try to find a corresponding list/search tool
  // Patterns: get_X might have list_X or list_Xs counterpart
  const toolBaseName = toolName.replace(/^get_|^create_|^update_|^delete_/, '')
  const listPatterns = [
    new RegExp(`list_${toolBaseName}s?`, 'i'),
    new RegExp(`list_${toolBaseName}`, 'i'),
    new RegExp(`.*${toolBaseName}.*list`, 'i'),
  ]

  for (const pattern of listPatterns) {
    const listTool = findToolsByPattern(mcpContext, pattern).find(t => t.name !== toolName)
    if (listTool) {
      return {
        needsLookup: true,
        lookupTool: listTool.name,
        idParamName: idParam.name,
        reason: `${toolName} requires ${idParam.name} parameter. Use ${listTool.name} to find the ID first.`,
      }
    }
  }

  return {
    needsLookup: true,
    idParamName: idParam.name,
    reason: `${toolName} requires ${idParam.name} parameter, but no obvious lookup tool found. May need to search available tools.`,
  }
}

/**
 * Validate MongoDB ObjectId format
 * MongoDB ObjectIds are 24-character hexadecimal strings
 */
export function isValidMongoDBObjectId(id: any): boolean {
  if (typeof id !== 'string') return false
  if (id.length !== 24) return false
  // Check if all characters are hexadecimal
  return /^[0-9a-fA-F]{24}$/.test(id)
}

/**
 * Extract MongoDB _id from array results with validation
 * Tries multiple common ID field names
 */
export function extractMongoDBIdFromArrayItem(item: any): string | null {
  if (!item || typeof item !== 'object') return null
  
  // Try common ID field names
  const idFields = ['_id', 'id', 'facilityId', 'shipmentId', 'contractId', 'inspectionId', 'contaminantId']
  
  for (const field of idFields) {
    const value = item[field]
    if (value && isValidMongoDBObjectId(value)) {
      return value
    }
  }
  
  return null
}

/**
 * Format array results with highlighted _id fields for better LLM extraction
 */
export function formatArrayResultsForExtraction(result: any, maxItems: number = 3): string {
  if (!Array.isArray(result) || result.length === 0) {
    return 'Empty array or not an array'
  }
  
  // Format first few items with emphasis on _id fields
  const items = result.slice(0, maxItems).map((item, index) => {
    if (typeof item !== 'object' || item === null) {
      return `Item ${index + 1}: ${JSON.stringify(item)}`
    }
    
    // Highlight _id field if it exists
    let formatted = `Item ${index + 1}:\n`
    if (item._id) {
      formatted += `  ⭐ _id: "${item._id}" (MongoDB ObjectId - use this for 'id' parameter)\n`
    }
    if (item.id && item.id !== item._id) {
      formatted += `  id: "${item.id}"\n`
    }
    
    // Add other identifying fields
    const identifyingFields = ['name', 'shortCode', 'location', 'license_plate', 'wasteItemDetected']
    for (const field of identifyingFields) {
      if (item[field]) {
        formatted += `  ${field}: ${JSON.stringify(item[field])}\n`
      }
    }
    
    // Add other fields (but truncated)
    const otherFields = Object.keys(item).filter(k => 
      k !== '_id' && k !== 'id' && !identifyingFields.includes(k) && 
      !k.startsWith('__') && k !== 'createdAt' && k !== 'updatedAt'
    )
    
    if (otherFields.length > 0) {
      const otherData: any = {}
      otherFields.slice(0, 5).forEach(k => {
        otherData[k] = item[k]
      })
      formatted += `  ... other fields: ${JSON.stringify(otherData).substring(0, 100)}${otherData.toString().length > 100 ? '...' : ''}\n`
    }
    
    return formatted
  })
  
  const resultStr = `Array with ${result.length} item(s):\n\n${items.join('\n')}${result.length > maxItems ? `\n... (${result.length - maxItems} more items)` : ''}`
  
  return resultStr
}


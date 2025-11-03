import { NextResponse } from 'next/server'
import { listMCPTools, listMCPPrompts } from '@/lib/mcp-prompts'
import {
  storeToolMemoryExample,
  deleteAllToolMemories,
} from '@/lib/pinecone/tool-memory'
import { logger } from '@/utils/logger'

/**
 * POST /api/agents/tool-memory-agent/init
 * 
 * Initialize tool memory vector database:
 * 1. Fetch all tools and prompts from MCP server
 * 2. Delete all existing vectors (full reset)
 * 3. Seed tool/prompt metadata entries
 * 4. Generate synthetic tool usage examples
 * 5. Store all seed examples in Pinecone
 * 
 * Returns: { message, toolsMetadataSeeded, promptsMetadataSeeded, usageExamplesSeeded, totalExamples }
 */
export async function POST() {
  try {
    logger.info(`[Tool Memory Init] Starting initialization`)

    // Step 1: Fetch tools and prompts from MCP server
    logger.info(`[Tool Memory Init] Fetching MCP tools and prompts`)
    const [tools, prompts] = await Promise.all([
      listMCPTools().catch((error) => {
        logger.error(`[Tool Memory Init] Failed to fetch tools:`, error)
        return []
      }),
      listMCPPrompts().catch((error) => {
        logger.error(`[Tool Memory Init] Failed to fetch prompts:`, error)
        return []
      }),
    ])

    logger.info(`[Tool Memory Init] Fetched ${tools.length} tools and ${prompts.length} prompts`)

    // Step 2: Delete all existing vectors (full reset)
    logger.info(`[Tool Memory Init] Deleting all existing vectors`)
    const deletedCount = await deleteAllToolMemories()
    logger.info(`[Tool Memory Init] Deleted ${deletedCount} existing vectors`)

    let toolsMetadataSeeded = 0
    let promptsMetadataSeeded = 0
    let usageExamplesSeeded = 0

    const now = new Date().toISOString()

    // Step 3: Seed tool metadata entries
    logger.info(`[Tool Memory Init] Seeding tool metadata entries`)
    for (const tool of tools) {
      try {
        const params = tool.inputSchema?.properties
          ? Object.entries(tool.inputSchema.properties)
              .map(([key, schema]: [string, any]) => {
                const required = tool.inputSchema.required?.includes(key)
                  ? ' (required)'
                  : ''
                return `${key}${required}: ${schema.description || schema.type || 'any'}`
              })
              .join(', ')
          : 'none'

        await storeToolMemoryExample({
          query: '', // Metadata entries don't need query
          tools: [tool.name],
          toolSequence: [tool.name],
          complexityScore: 0.5,
          success: true,
          entryType: 'metadata',
          toolName: tool.name,
          description: tool.description || '',
          parameters: params,
          successRating: 0.8, // Default for seeds
          createdAt: now,
          updatedAt: now,
          usageCount: 0,
        })

        toolsMetadataSeeded++
      } catch (error: any) {
        logger.error(
          `[Tool Memory Init] Failed to seed tool metadata for ${tool.name}:`,
          error.message
        )
      }
    }

    // Step 4: Seed prompt metadata entries
    logger.info(`[Tool Memory Init] Seeding prompt metadata entries`)
    for (const prompt of prompts) {
      try {
        const args = prompt.arguments
          ? prompt.arguments
              .map(
                (a) =>
                  `${a.name}${a.required ? ' (required)' : ''}: ${a.description}`
              )
              .join(', ')
          : 'none'

        await storeToolMemoryExample({
          query: '', // Metadata entries don't need query
          tools: [prompt.name],
          toolSequence: [prompt.name],
          complexityScore: 0.5,
          success: true,
          entryType: 'metadata',
          toolName: prompt.name,
          description: prompt.description || '',
          parameters: args,
          successRating: 0.8, // Default for seeds
          createdAt: now,
          updatedAt: now,
          usageCount: 0,
        })

        promptsMetadataSeeded++
      } catch (error: any) {
        logger.error(
          `[Tool Memory Init] Failed to seed prompt metadata for ${prompt.name}:`,
          error.message
        )
      }
    }

    // Step 5: Generate synthetic tool usage examples
    logger.info(`[Tool Memory Init] Generating synthetic tool usage examples`)

    // Helper function to generate example query from tool description
    const generateExampleQuery = (
      toolName: string,
      description: string,
      isPrompt: boolean = false
    ): string => {
      const name = toolName.toLowerCase()

      // Generate query based on tool name patterns
      if (name.includes('facility') && name.includes('report')) {
        return 'analyze facility health and performance'
      }
      if (name.includes('facility') && name.includes('list')) {
        return 'list all facilities'
      }
      if (name.includes('facility') && name.includes('get')) {
        return 'get facility details'
      }
      if (name.includes('shipment') && name.includes('risk')) {
        return 'analyze shipment risk and contamination patterns'
      }
      if (name.includes('shipment') && name.includes('list')) {
        return 'list shipments for a facility'
      }
      if (name.includes('contaminant') && name.includes('list')) {
        return 'find contaminant records'
      }
      if (name.includes('inspection') && name.includes('suggest')) {
        return 'generate inspection checklist questions'
      }
      if (name.includes('compliance')) {
        return 'check facility compliance status'
      }
      if (name.includes('performance') && name.includes('compare')) {
        return 'compare facilities performance metrics'
      }

      // Generic generation from description
      const desc = description.toLowerCase()
      if (desc.includes('analyze') || desc.includes('analysis')) {
        return `analyze ${desc.split('analyze')[1]?.split('.')[0]?.trim() || 'data'}`
      }
      if (desc.includes('generate') || desc.includes('create')) {
        return `generate ${desc.split('generate')[1]?.split('.')[0]?.trim() || 'report'}`
      }
      if (desc.includes('list') || desc.includes('get')) {
        return `get ${desc.split('list')[1] || desc.split('get')[1] || 'information'}`
      }

      // Fallback
      return isPrompt
        ? `use ${prompt.name} workflow template`
        : `use ${toolName} to ${description.substring(0, 50)}`
    }

    // Generate usage examples for tools
    for (const tool of tools) {
      try {
        const exampleQuery = generateExampleQuery(
          tool.name,
          tool.description || '',
          false
        )

        await storeToolMemoryExample({
          query: exampleQuery,
          tools: [tool.name],
          toolSequence: [tool.name],
          complexityScore: 0.5,
          success: true,
          entryType: 'usage-example',
          toolName: tool.name,
          description: tool.description || '',
          successRating: 0.8, // Default for seeds
          createdAt: now,
          updatedAt: now,
          usageCount: 0,
        })

        usageExamplesSeeded++
      } catch (error: any) {
        logger.error(
          `[Tool Memory Init] Failed to generate usage example for ${tool.name}:`,
          error.message
        )
      }
    }

    // Generate usage examples for prompts
    for (const prompt of prompts) {
      try {
        const exampleQuery = generateExampleQuery(
          prompt.name,
          prompt.description || '',
          true
        )

        await storeToolMemoryExample({
          query: exampleQuery,
          tools: [prompt.name],
          toolSequence: [prompt.name],
          complexityScore: 0.6, // Prompts typically for more complex queries
          success: true,
          entryType: 'usage-example',
          mcpPrompts: [prompt.name],
          successRating: 0.8, // Default for seeds
          createdAt: now,
          updatedAt: now,
          usageCount: 0,
        })

        usageExamplesSeeded++
      } catch (error: any) {
        logger.error(
          `[Tool Memory Init] Failed to generate usage example for ${prompt.name}:`,
          error.message
        )
      }
    }

    const totalExamples =
      toolsMetadataSeeded + promptsMetadataSeeded + usageExamplesSeeded

    logger.info(`[Tool Memory Init] Initialization complete`, {
      toolsMetadataSeeded,
      promptsMetadataSeeded,
      usageExamplesSeeded,
      totalExamples,
    })

    return NextResponse.json(
      {
        message: 'Tool memory initialized successfully',
        toolsMetadataSeeded,
        promptsMetadataSeeded,
        usageExamplesSeeded,
        totalExamples,
        deletedCount,
      },
      { status: 200 }
    )
  } catch (error: any) {
    logger.error(`[Tool Memory Init] Error:`, error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to initialize tool memory',
      },
      { status: 500 }
    )
  }
}


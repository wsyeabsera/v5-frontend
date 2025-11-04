/**
 * Demo Reset API
 * 
 * POST /api/demo/reset
 * 
 * Clears all agent outputs and request contexts, then populates fresh demo requests
 * that showcase all agent capabilities.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRequestMongoDBStorage } from '@/lib/storage/request-mongodb-storage'
import { getThoughtOutputsStorage } from '@/lib/storage/thought-outputs-storage'
import { getPlannerOutputsStorage } from '@/lib/storage/planner-outputs-storage'
import { getCriticOutputsStorage } from '@/lib/storage/critic-outputs-storage'
import { getExecutorOutputsStorage } from '@/lib/storage/executor-outputs-storage'
import { logger } from '@/utils/logger'
import { listMCPPrompts, type MCPPrompt } from '@/lib/mcp-prompts'

export async function POST(req: NextRequest) {
  try {
    logger.info('[Demo Reset] Starting demo reset...')
    
    // Clear all data
    const requestStorage = getRequestMongoDBStorage()
    const thoughtStorage = getThoughtOutputsStorage()
    const plannerStorage = getPlannerOutputsStorage()
    const criticStorage = getCriticOutputsStorage()
    const executorStorage = getExecutorOutputsStorage()
    
    await Promise.all([
      requestStorage.clear(),
      thoughtStorage.clear(),
      plannerStorage.clear(),
      criticStorage.clear(),
      executorStorage.clear(),
    ])
    
    logger.info('[Demo Reset] All agent outputs and requests cleared')
    
    // Helper function to generate natural language queries from prompt metadata
    const generateQueryFromPrompt = (prompt: MCPPrompt): string => {
      // Map known prompt names to natural language queries
      const promptQueryMap: Record<string, string> = {
        'analyze-facility-compliance': 'Analyze facility compliance for Hannover facility',
        'generate-contamination-report': 'Generate a contamination report for Central Waste Processing Hub',
        'review-shipment-inspection': 'Review shipment inspection for license plate ABC-123',
        'compare-facilities-performance': 'Compare performance of all facilities in New York'
      }
      
      // If mapping exists, use it
      if (promptQueryMap[prompt.name]) {
        return promptQueryMap[prompt.name]
      }
      
      // Fallback: extract key words from description and build query
      const description = prompt.description.toLowerCase()
      if (description.includes('facility') || description.includes('facilities')) {
        return `${prompt.name.replace(/-/g, ' ')} for Hannover facility`
      }
      if (description.includes('shipment')) {
        return `${prompt.name.replace(/-/g, ' ')} for license plate ABC-123`
      }
      if (description.includes('contaminant') || description.includes('contamination')) {
        return `${prompt.name.replace(/-/g, ' ')} for Central Waste Processing Hub`
      }
      if (description.includes('inspection')) {
        return `${prompt.name.replace(/-/g, ' ')} for facility HAN`
      }
      if (description.includes('contract')) {
        return `${prompt.name.replace(/-/g, ' ')} for Green Industries Inc`
      }
      // Generic fallback
      return `${prompt.name.replace(/-/g, ' ')}`
    }
    
    // Fetch MCP prompts dynamically
    let mcpPrompts: MCPPrompt[] = []
    try {
      mcpPrompts = await listMCPPrompts()
      logger.info(`[Demo Reset] Fetched ${mcpPrompts.length} MCP prompts from server`)
    } catch (error: any) {
      logger.warn(`[Demo Reset] Failed to fetch MCP prompts: ${error.message}. Continuing with static requests only.`)
    }
    
    // Generate demo requests for each MCP prompt
    const promptRequests = mcpPrompts.map(prompt => ({
      query: generateQueryFromPrompt(prompt),
      category: 'mcp-prompt' as const,
      toolsCovered: [prompt.name]
    }))
    
    // Static tool-coverage requests covering all 28 MCP tools
    const toolCoverageRequests = [
      // Basic CRUD Operations (10 requests)
      // Tools: list_facilities, list_contracts, list_inspections, get_facility, 
      //        list_contaminants, get_contaminant, list_inspections, get_inspection,
      //        list_shipments, get_shipment, list_contracts, get_contract,
      //        update_facility, update_contaminant
      { query: 'Show me all facilities', category: 'basic' as const, toolsCovered: ['list_facilities'] },
      { query: 'List all contracts', category: 'basic' as const, toolsCovered: ['list_contracts'] },
      { query: 'List all inspections', category: 'basic' as const, toolsCovered: ['list_inspections'] },
      { query: 'List facilities in New York', category: 'basic' as const, toolsCovered: ['list_facilities'] },
      { query: 'Get details for facility HAN', category: 'basic' as const, toolsCovered: ['get_facility'] },
      { query: 'List contaminants and get details for the first one', category: 'basic' as const, toolsCovered: ['list_contaminants', 'get_contaminant'] },
      { query: 'Get inspection details for facility HAN', category: 'basic' as const, toolsCovered: ['list_inspections', 'get_inspection'] },
      { query: 'Get shipment with license plate ABC-123', category: 'basic' as const, toolsCovered: ['list_shipments', 'get_shipment'] },
      { query: 'Get contract for producer Green Industries Inc', category: 'basic' as const, toolsCovered: ['list_contracts', 'get_contract'] },
      { query: 'Update facility HAN location to Amsterdam, Netherlands', category: 'basic' as const, toolsCovered: ['update_facility'] },
      { query: 'List contaminants and update the first one\'s explosive level to low', category: 'basic' as const, toolsCovered: ['list_contaminants', 'update_contaminant'] },
      
      // Multi-Step Coordination (8 requests)
      // Tools: get_facility, generate_intelligent_facility_report, list_facilities,
      //        analyze_shipment_risk, list_shipments, create_contaminant, create_inspection,
      //        create_contract, list_contaminants, get_contaminant, update_contaminant
      { query: 'Get facility HAN and generate an intelligent report for it with recommendations', category: 'multi-step' as const, toolsCovered: ['get_facility', 'generate_intelligent_facility_report'] },
      { query: "List facilities, get the first one's details, and analyze its shipment risks", category: 'multi-step' as const, toolsCovered: ['list_facilities', 'get_facility', 'analyze_shipment_risk'] },
      { query: 'List all shipments and analyze the risk of shipments from Green Industries Inc', category: 'multi-step' as const, toolsCovered: ['list_shipments', 'analyze_shipment_risk'] },
      { query: 'Create a new contaminant for facility HAN with high explosive level, medium HCl level, and medium SO2 level', category: 'multi-step' as const, toolsCovered: ['get_facility', 'create_contaminant'] },
      { query: 'Create an inspection for facility AMS', category: 'multi-step' as const, toolsCovered: ['get_facility', 'create_inspection'] },
      { query: 'List shipments and get details for the first one', category: 'multi-step' as const, toolsCovered: ['list_shipments', 'get_shipment'] },
      { query: 'Create a contract for producer Acme Corp with waste code 20-01-01', category: 'multi-step' as const, toolsCovered: ['create_contract'] },
      { query: 'List contaminants, get details for one with high explosive level, then update its status', category: 'multi-step' as const, toolsCovered: ['list_contaminants', 'get_contaminant', 'update_contaminant'] },
      { query: 'List facilities in New York and update their locations to Amsterdam', category: 'multi-step' as const, toolsCovered: ['list_facilities', 'update_facility'] },
      
      // AI-Powered Analysis (3 requests)
      // Tools: suggest_inspection_questions, analyze_shipment_risk, generate_intelligent_facility_report
      { query: 'Suggest inspection questions for facility HAN', category: 'advanced' as const, toolsCovered: ['suggest_inspection_questions'] },
      { query: 'Analyze shipment risk for shipments from Green Industries Inc', category: 'advanced' as const, toolsCovered: ['list_shipments', 'analyze_shipment_risk'] },
      { query: 'Generate intelligent facility report for Central Waste Processing Hub with recommendations', category: 'advanced' as const, toolsCovered: ['list_facilities', 'generate_intelligent_facility_report'] },
      { query: 'Find all contaminants with high explosive levels and analyze shipment risks for those facilities', category: 'advanced' as const, toolsCovered: ['list_contaminants', 'list_shipments', 'analyze_shipment_risk'] },
      
      // Edge Cases & Error Handling (5 requests)
      // Tools: get_facility (error), create_contaminant (missing params), create_shipment (missing params),
      //        update_facility (error), delete_contaminant (error)
      { query: 'Get facility with code NONEXIST', category: 'edge-case' as const, toolsCovered: ['get_facility'] },
      { query: 'Create a contaminant record for plastic containers with high explosive level', category: 'edge-case' as const, toolsCovered: ['create_contaminant'] },
      { query: 'Create a new shipment with license plate TEST-001', category: 'edge-case' as const, toolsCovered: ['create_shipment'] },
      { query: 'Update facility with code NONEXIST', category: 'edge-case' as const, toolsCovered: ['update_facility'] },
      { query: 'Delete contaminant with ID that does not exist', category: 'edge-case' as const, toolsCovered: ['delete_contaminant'] },
    ]
    
    // Combine static tool-coverage requests with dynamic prompt requests
    const queries = [...toolCoverageRequests, ...promptRequests]
    
    let successCount = 0
    let failCount = 0
    
    for (const { query, category } of queries) {
      try {
        const requestId = `demo-${Date.now()}-${Math.random().toString(36).substring(7)}`
        const context = {
          requestId,
          agentChain: [],
          status: 'pending' as const,
          userQuery: query,
          createdAt: new Date(),
        }
        
        await requestStorage.save(context)
        successCount++
        logger.debug(`[Demo Reset] Created request: ${query.substring(0, 50)}`)
      } catch (error: any) {
        logger.error(`[Demo Reset] Failed to create request for: "${query}"`, error)
        failCount++
      }
      
      // Small delay to avoid request ID collisions
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    
    logger.info(`[Demo Reset] Demo requests created: ${successCount} successful, ${failCount} failed`)
    logger.info(`[Demo Reset] Tool coverage requests: ${toolCoverageRequests.length}, Prompt requests: ${promptRequests.length}, Total: ${queries.length}`)
    
    return NextResponse.json({
      success: true,
      message: 'Demo reset complete',
      stats: {
        requestsCreated: successCount,
        requestsFailed: failCount,
        totalQueries: queries.length,
        toolCoverageRequests: toolCoverageRequests.length,
        promptRequests: promptRequests.length,
        mcpPromptsFetched: mcpPrompts.length,
      }
    })
  } catch (error: any) {
    logger.error('[Demo Reset] Failed:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reset demo data' },
      { status: 500 }
    )
  }
}

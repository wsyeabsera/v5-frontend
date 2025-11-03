/**
 * Demo Reset Script
 * 
 * Clears all agent outputs and request contexts, then populates fresh demo requests
 * that showcase all agent capabilities.
 */

import { getRequestMongoDBStorage } from '@/lib/storage/request-mongodb-storage'
import { getThoughtOutputsStorage } from '@/lib/storage/thought-outputs-storage'
import { getPlannerOutputsStorage } from '@/lib/storage/planner-outputs-storage'
import { getCriticOutputsStorage } from '@/lib/storage/critic-outputs-storage'
import { getExecutorOutputsStorage } from '@/lib/storage/executor-outputs-storage'

async function clearAllData() {
  console.log('🧹 Clearing all agent outputs and request contexts...')
  
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
  
  console.log('✅ All agent outputs and requests cleared')
}

async function populateDemoRequests() {
  console.log('📝 Populating demo requests...')
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'
  const queries = [
    // Set 1: Basic Functionality (3 requests)
    { query: 'Show me all facilities', category: 'basic', expected: 'single-step list operation' },
    { query: 'List facilities in Amsterdam', category: 'basic', expected: 'location filter' },
    { query: 'Get details for facility HAN', category: 'basic', expected: 'shortCode filter' },
    
    // Set 2: Multi-Step Coordination (3 requests)
    { query: 'Get facility AMS and generate a report for it', category: 'multi-step', expected: 'ID extraction and coordination' },
    { query: "List facilities, get the first one's details, and analyze its risk", category: 'multi-step', expected: 'complex coordination chain' },
    { query: 'List shipments from facility AMS and analyze the risk of the first one', category: 'multi-step', expected: 'cross-entity coordination' },
    
    // Set 3: Edge Cases & Error Handling (3 requests)
    { query: 'Get facility with code NONEXIST', category: 'edge-case', expected: 'empty result handling' },
    { query: 'Create a contaminant record with high explosive level', category: 'edge-case', expected: 'missing params, questions generated' },
    { query: 'Create a shipment', category: 'edge-case', expected: 'plan rejection' },
    
    // Set 4: Advanced Features (2 requests)
    { query: 'Generate an intelligent facility report for HAN with recommendations', category: 'advanced', expected: 'AI-powered analysis' },
    { query: 'Find all shipments and analyze risks for any with contaminants', category: 'advanced', expected: 'complex multi-tool scenario' },
  ]
  
  const requestStorage = getRequestMongoDBStorage()
  let successCount = 0
  let failCount = 0
  
  for (const { query } of queries) {
    try {
      // Create request context
      const requestId = `demo-${Date.now()}-${Math.random().toString(36).substring(7)}`
      const context = {
        requestId,
        agentChain: [],
        status: 'pending' as const,
        userQuery: query,
        createdAt: new Date(),
      }
      
      await requestStorage.save(context)
      console.log(`  ✓ Created request for: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`)
      successCount++
    } catch (error) {
      console.error(`  ✗ Failed to create request for: "${query}"`, error)
      failCount++
    }
  }
  
  console.log(`✅ Demo requests created: ${successCount} successful, ${failCount} failed`)
  console.log('\n💡 Note: These are placeholder requests. To actually execute them, run the queries through the agent pipeline.')
}

async function main() {
  try {
    await clearAllData()
    await populateDemoRequests()
    console.log('\n🎉 Demo reset complete!')
  } catch (error) {
    console.error('❌ Demo reset failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { clearAllData, populateDemoRequests }

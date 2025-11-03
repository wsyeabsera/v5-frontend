#!/usr/bin/env node

/**
 * Test script to verify coordinator and planner fixes
 */

const BASE_URL = 'http://localhost:3001'

async function testRequest(name, query) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`🧪 Test: ${name}`)
  console.log(`Query: "${query}"`)
  console.log(`${'='.repeat(80)}\n`)
  
  const requestId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    // Step 1: Generate thoughts
    console.log('1️⃣  Generating thoughts...')
    const thoughtRes = await fetch(`${BASE_URL}/api/agents/thought-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userQuery: query,
        requestContext: {
          requestId,
          createdAt: new Date().toISOString(),
          agentChain: [],
          status: 'pending'
        }
      })
    })
    const thought = await thoughtRes.json()
    if (!thought.thoughts) {
      console.log('❌ Failed to generate thoughts')
      return false
    }
    console.log('✅ Thoughts generated')
    
    // Step 2: Generate plan
    console.log('2️⃣  Generating plan...')
    const planRes = await fetch(`${BASE_URL}/api/agents/planner-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        thoughts: thought.thoughts,
        userQuery: query,
        requestContext: thought.requestContext
      })
    })
    const plan = await planRes.json()
    if (!plan.plan || !plan.plan.steps) {
      console.log('❌ Failed to generate plan')
      return false
    }
    console.log(`✅ Plan generated (${plan.plan.steps.length} steps)`)
    plan.plan.steps.forEach((step, i) => {
      console.log(`   Step ${step.order}: ${step.action}`)
    })
    
    // Check for invalid tools
    const invalidTools = plan.plan.steps
      .map(s => s.action)
      .filter(a => a.includes('multi_tool_use') || a.includes('functions.') || a.startsWith('analyze') || a.startsWith('calculate'))
    
    if (invalidTools.length > 0) {
      console.log(`\n❌ Found invalid tools: ${invalidTools.join(', ')}`)
      return false
    } else {
      console.log('✅ All tools are valid MCP tools')
    }
    
    // Step 3: Execute
    console.log('3️⃣  Executing plan...')
    const execRes = await fetch(`${BASE_URL}/api/agents/executor-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestContext: thought.requestContext,
        userQuery: query
      })
    })
    const exec = await execRes.json()
    
    if (!exec.executionResult) {
      console.log('❌ Failed to execute plan')
      return false
    }
    
    const success = exec.executionResult.overallSuccess || false
    const steps = exec.executionResult.steps || []
    const succeeded = steps.filter(s => s.success).length
    const planUpdates = exec.executionResult.planUpdates || []
    
    console.log(`✅ Execution completed`)
    console.log(`\n📊 Results:`)
    console.log(`   Success: ${success}`)
    console.log(`   Steps: ${succeeded}/${steps.length} succeeded`)
    console.log(`   Plan Updates: ${planUpdates.length}`)
    
    if (planUpdates.length > 0) {
      console.log(`\n📝 Plan Updates:`)
      planUpdates.forEach(update => {
        console.log(`   Step ${update.stepOrder}:`)
        console.log(`     Original: ${JSON.stringify(update.originalParameters)}`)
        console.log(`     Updated:  ${JSON.stringify(update.updatedParameters)}`)
        
        // Check for valid MongoDB IDs
        Object.entries(update.updatedParameters || {}).forEach(([key, value]) => {
          if (key.toLowerCase().includes('id') && typeof value === 'string') {
            const isValid = /^[0-9a-fA-F]{24}$/.test(value)
            if (isValid) {
              console.log(`     ✅ ${key}: Valid MongoDB ObjectId (${value})`)
            } else if (value === '' || value === null) {
              console.log(`     ❌ ${key}: Empty or null (extraction failed)`)
            } else {
              console.log(`     ⚠️  ${key}: "${value}" (${value.length} chars - may be invalid)`)
            }
          }
        })
      })
    }
    
    if (success && succeeded === steps.length) {
      console.log(`\n✅ Test PASSED`)
      return true
    } else {
      console.log(`\n❌ Test FAILED`)
      if (exec.executionResult.errors && exec.executionResult.errors.length > 0) {
        console.log(`   Errors:`)
        exec.executionResult.errors.forEach(err => console.log(`     - ${err}`))
      }
      return false
    }
  } catch (error) {
    console.log(`\n❌ Test ERROR: ${error.message}`)
    return false
  }
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════════════════════')
  console.log('COORDINATOR & PLANNER FIX VERIFICATION TESTS')
  console.log('═══════════════════════════════════════════════════════════════════════════')
  
  const tests = [
    {
      name: 'Facility by Name (ID Extraction)',
      query: 'get me details of facility hannover'
    },
    {
      name: 'Contaminants (ID Extraction)',
      query: 'what contaminants are at hannover facility'
    },
    {
      name: 'Shipment by License Plate',
      query: 'show me the shipment with license plate ABC-123'
    },
    {
      name: 'Planner Tool Constraints',
      query: 'list all facilities and show me which one has the most shipments'
    },
    {
      name: 'Simple Execution',
      query: 'list all facilities'
    }
  ]
  
  let passed = 0
  let failed = 0
  
  for (const test of tests) {
    const result = await testRequest(test.name, test.query)
    if (result) {
      passed++
    } else {
      failed++
    }
    await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2s between tests
  }
  
  console.log(`\n${'='.repeat(80)}`)
  console.log(`📊 SUMMARY`)
  console.log(`${'='.repeat(80)}`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📈 Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`)
  console.log(`${'='.repeat(80)}\n`)
  
  process.exit(failed > 0 ? 1 : 0)
}

runAllTests().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})


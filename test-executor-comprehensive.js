/**
 * Comprehensive Test Suite for Executor Agent
 * 
 * Tests multiple scenarios:
 * 1. Simple single-step execution
 * 2. Multi-step execution with dependencies
 * 3. Error handling and recovery
 * 4. User feedback integration
 * 5. Critique integration
 * 6. Version tracking
 * 7. Edge cases
 */

const BASE_URL = 'http://localhost:3001'

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function testScenario(name, testFn) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`🧪 TEST: ${name}`)
  console.log('='.repeat(80))
  
  try {
    await testFn()
    console.log(`✅ ${name} - PASSED`)
    return true
  } catch (error) {
    console.error(`❌ ${name} - FAILED:`, error.message)
    console.error(error.stack)
    return false
  }
}

// Test 1: Simple single-step execution
async function testSimpleExecution() {
  const userQuery = 'List all facilities'
  const requestId = `test-simple-${Date.now()}`
  
  let requestContext = {
    requestId,
    createdAt: new Date(),
    agentChain: [],
    status: 'pending',
    userQuery,
  }
  
  // Generate thoughts and plan
  const thoughtResponse = await fetch(`${BASE_URL}/api/agents/thought-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userQuery, requestContext }),
  })
  
  if (!thoughtResponse.ok) throw new Error('Thought generation failed')
  const thoughtData = await thoughtResponse.json()
  requestContext = thoughtData.requestContext
  
  const planResponse = await fetch(`${BASE_URL}/api/agents/planner-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      thoughts: thoughtData.thoughts,
      userQuery,
      requestContext,
    }),
  })
  
  if (!planResponse.ok) throw new Error('Plan generation failed')
  const planData = await planResponse.json()
  requestContext = planData.requestContext
  
  // Execute
  const execResponse = await fetch(`${BASE_URL}/api/agents/executor-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan: planData.plan,
      userQuery,
      requestContext,
    }),
  })
  
  if (!execResponse.ok) {
    const error = await execResponse.json()
    throw new Error(`Execution failed: ${error.error}`)
  }
  
  const execution = await execResponse.json()
  
  // Validate results
  if (!execution.executionResult) throw new Error('Missing executionResult')
  if (!execution.executionResult.steps || execution.executionResult.steps.length === 0) {
    throw new Error('No steps executed')
  }
  
  const firstStep = execution.executionResult.steps[0]
  if (!firstStep.success) {
    throw new Error(`Step failed: ${firstStep.error}`)
  }
  
  if (!firstStep.result) {
    throw new Error('Step has no result')
  }
  
  console.log(`   ✅ Step 1 executed successfully`)
  console.log(`   ✅ Result received: ${JSON.stringify(firstStep.result).substring(0, 100)}...`)
  
  return execution
}

// Test 2: Execution without plan (should fetch from storage)
async function testExecutionWithoutPlan() {
  const userQuery = 'Get facility by short code ABC'
  const requestId = `test-no-plan-${Date.now()}`
  
  let requestContext = {
    requestId,
    createdAt: new Date(),
    agentChain: [],
    status: 'pending',
    userQuery,
  }
  
  // Generate thoughts and plan
  const thoughtResponse = await fetch(`${BASE_URL}/api/agents/thought-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userQuery, requestContext }),
  })
  
  if (!thoughtResponse.ok) throw new Error('Thought generation failed')
  const thoughtData = await thoughtResponse.json()
  requestContext = thoughtData.requestContext
  
  const planResponse = await fetch(`${BASE_URL}/api/agents/planner-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      thoughts: thoughtData.thoughts,
      userQuery,
      requestContext,
    }),
  })
  
  if (!planResponse.ok) throw new Error('Plan generation failed')
  const planData = await planResponse.json()
  requestContext = planData.requestContext
  
  // Execute WITHOUT providing plan (should fetch from storage)
  const execResponse = await fetch(`${BASE_URL}/api/agents/executor-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // plan NOT provided - should fetch from storage
      userQuery,
      requestContext,
    }),
  })
  
  if (!execResponse.ok) {
    const error = await execResponse.json()
    throw new Error(`Execution failed: ${error.error}`)
  }
  
  const execution = await execResponse.json()
  
  if (!execution.executionResult) throw new Error('Missing executionResult')
  if (execution.executionResult.steps.length === 0) {
    throw new Error('No steps executed')
  }
  
  console.log(`   ✅ Plan fetched from storage automatically`)
  console.log(`   ✅ Executed ${execution.executionResult.steps.length} step(s)`)
  
  return execution
}

// Test 3: Execution with critique
async function testExecutionWithCritique() {
  const userQuery = 'List facilities in Amsterdam'
  const requestId = `test-critique-${Date.now()}`
  
  let requestContext = {
    requestId,
    createdAt: new Date(),
    agentChain: [],
    status: 'pending',
    userQuery,
  }
  
  // Generate thoughts and plan
  const thoughtResponse = await fetch(`${BASE_URL}/api/agents/thought-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userQuery, requestContext }),
  })
  
  if (!thoughtResponse.ok) throw new Error('Thought generation failed')
  const thoughtData = await thoughtResponse.json()
  requestContext = thoughtData.requestContext
  
  const planResponse = await fetch(`${BASE_URL}/api/agents/planner-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      thoughts: thoughtData.thoughts,
      userQuery,
      requestContext,
    }),
  })
  
  if (!planResponse.ok) throw new Error('Plan generation failed')
  const planData = await planResponse.json()
  requestContext = planData.requestContext
  
  // Generate critique
  const critiqueResponse = await fetch(`${BASE_URL}/api/agents/critic-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan: planData.plan,
      userQuery,
      requestContext,
    }),
  })
  
  if (!critiqueResponse.ok) throw new Error('Critique generation failed')
  const critique = await critiqueResponse.json()
  
  // Execute with critique
  const execResponse = await fetch(`${BASE_URL}/api/agents/executor-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan: planData.plan,
      userQuery,
      requestContext,
      // Critique will be fetched automatically from storage
    }),
  })
  
  if (!execResponse.ok) {
    const error = await execResponse.json()
    throw new Error(`Execution failed: ${error.error}`)
  }
  
  const execution = await execResponse.json()
  
  if (!execution.critiqueAvailable) {
    throw new Error('Critique was not used')
  }
  
  if (execution.critiqueRecommendation !== critique.critique.recommendation) {
    throw new Error('Critique recommendation mismatch')
  }
  
  console.log(`   ✅ Critique integrated (${execution.critiqueRecommendation})`)
  console.log(`   ✅ Execution respects critique`)
  
  return execution
}

// Test 4: Version tracking
async function testVersionTracking() {
  const userQuery = 'List all facilities'
  const requestId = `test-versions-${Date.now()}`
  
  let requestContext = {
    requestId,
    createdAt: new Date(),
    agentChain: [],
    status: 'pending',
    userQuery,
  }
  
  // Generate thoughts and plan
  const thoughtResponse = await fetch(`${BASE_URL}/api/agents/thought-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userQuery, requestContext }),
  })
  
  if (!thoughtResponse.ok) throw new Error('Thought generation failed')
  const thoughtData = await thoughtResponse.json()
  requestContext = thoughtData.requestContext
  
  const planResponse = await fetch(`${BASE_URL}/api/agents/planner-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      thoughts: thoughtData.thoughts,
      userQuery,
      requestContext,
    }),
  })
  
  if (!planResponse.ok) throw new Error('Plan generation failed')
  const planData = await planResponse.json()
  requestContext = planData.requestContext
  
  // First execution
  const exec1Response = await fetch(`${BASE_URL}/api/agents/executor-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan: planData.plan,
      userQuery,
      requestContext,
    }),
  })
  
  if (!exec1Response.ok) throw new Error('First execution failed')
  const exec1 = await exec1Response.json()
  
  if (exec1.executionVersion !== 1) {
    throw new Error(`Expected version 1, got ${exec1.executionVersion}`)
  }
  
  // Second execution (should be version 2)
  await sleep(100) // Small delay to ensure different timestamps
  
  const exec2Response = await fetch(`${BASE_URL}/api/agents/executor-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan: planData.plan,
      userQuery,
      requestContext,
    }),
  })
  
  if (!exec2Response.ok) throw new Error('Second execution failed')
  const exec2 = await exec2Response.json()
  
  if (exec2.executionVersion !== 2) {
    throw new Error(`Expected version 2, got ${exec2.executionVersion}`)
  }
  
  // Check versions endpoint
  const versionsResponse = await fetch(
    `${BASE_URL}/api/agents/executor-agent/versions/${requestId}`
  )
  
  if (!versionsResponse.ok) throw new Error('Versions retrieval failed')
  const versions = await versionsResponse.json()
  
  if (versions.length !== 2) {
    throw new Error(`Expected 2 versions, got ${versions.length}`)
  }
  
  if (versions[0].executionVersion !== 1 || versions[1].executionVersion !== 2) {
    throw new Error('Version ordering incorrect')
  }
  
  console.log(`   ✅ Version 1 created`)
  console.log(`   ✅ Version 2 created`)
  console.log(`   ✅ Versions endpoint returns ${versions.length} version(s)`)
  
  return { exec1, exec2, versions }
}

// Test 5: GET endpoint
async function testGETEndpoint() {
  const userQuery = 'List all facilities'
  const requestId = `test-get-${Date.now()}`
  
  let requestContext = {
    requestId,
    createdAt: new Date(),
    agentChain: [],
    status: 'pending',
    userQuery,
  }
  
  // Generate thoughts and plan
  const thoughtResponse = await fetch(`${BASE_URL}/api/agents/thought-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userQuery, requestContext }),
  })
  
  if (!thoughtResponse.ok) throw new Error('Thought generation failed')
  const thoughtData = await thoughtResponse.json()
  requestContext = thoughtData.requestContext
  
  const planResponse = await fetch(`${BASE_URL}/api/agents/planner-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      thoughts: thoughtData.thoughts,
      userQuery,
      requestContext,
    }),
  })
  
  if (!planResponse.ok) throw new Error('Plan generation failed')
  const planData = await planResponse.json()
  requestContext = planData.requestContext
  
  // Execute
  const execResponse = await fetch(`${BASE_URL}/api/agents/executor-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan: planData.plan,
      userQuery,
      requestContext,
    }),
  })
  
  if (!execResponse.ok) throw new Error('Execution failed')
  const execution = await execResponse.json()
  
  // Get via GET endpoint
  const getResponse = await fetch(
    `${BASE_URL}/api/agents/executor-agent?requestId=${requestId}`
  )
  
  if (!getResponse.ok) {
    const error = await getResponse.json()
    throw new Error(`GET failed: ${error.error}`)
  }
  
  const retrieved = await getResponse.json()
  
  if (retrieved.requestId !== execution.requestId) {
    throw new Error('Request ID mismatch')
  }
  
  if (retrieved.executionVersion !== execution.executionVersion) {
    throw new Error('Version mismatch')
  }
  
  console.log(`   ✅ GET endpoint returns execution correctly`)
  console.log(`   ✅ Retrieved version ${retrieved.executionVersion}`)
  
  return retrieved
}

// Test 6: Error handling - invalid request
async function testErrorHandling() {
  // Test missing requestContext
  const response1 = await fetch(`${BASE_URL}/api/agents/executor-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userQuery: 'test',
    }),
  })
  
  if (response1.ok) {
    throw new Error('Should have failed with missing requestContext')
  }
  
  const error1 = await response1.json()
  if (!error1.error || !error1.error.includes('requestContext')) {
    throw new Error('Wrong error message for missing requestContext')
  }
  
  console.log(`   ✅ Missing requestContext properly rejected`)
  
  // Test invalid requestId in GET
  const response2 = await fetch(
    `${BASE_URL}/api/agents/executor-agent?requestId=`
  )
  
  if (response2.ok) {
    throw new Error('Should have failed with missing requestId')
  }
  
  const error2 = await response2.json()
  if (!error2.error || !error2.error.includes('requestId')) {
    throw new Error('Wrong error message for missing requestId')
  }
  
  console.log(`   ✅ Missing requestId properly rejected`)
  
  // Test non-existent requestId
  const response3 = await fetch(
    `${BASE_URL}/api/agents/executor-agent?requestId=nonexistent-${Date.now()}`
  )
  
  if (response3.ok) {
    throw new Error('Should have failed with non-existent requestId')
  }
  
  const error3 = await response3.json()
  if (!error3.error || !error3.error.includes('not found')) {
    throw new Error('Wrong error message for non-existent requestId')
  }
  
  console.log(`   ✅ Non-existent requestId properly handled`)
  
  return true
}

async function runAllTests() {
  console.log('\n🚀 Starting Comprehensive Executor Agent Tests\n')
  console.log('='.repeat(80))
  
  const tests = [
    ['Simple Single-Step Execution', testSimpleExecution],
    ['Execution Without Plan (Auto-fetch)', testExecutionWithoutPlan],
    ['Execution With Critique Integration', testExecutionWithCritique],
    ['Version Tracking', testVersionTracking],
    ['GET Endpoint', testGETEndpoint],
    ['Error Handling', testErrorHandling],
  ]
  
  const results = []
  
  for (const [name, testFn] of tests) {
    const passed = await testScenario(name, testFn)
    results.push({ name, passed })
    
    // Small delay between tests
    await sleep(500)
  }
  
  // Summary
  console.log(`\n${'='.repeat(80)}`)
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(80))
  
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  
  results.forEach(({ name, passed }) => {
    const icon = passed ? '✅' : '❌'
    console.log(`${icon} ${name}`)
  })
  
  console.log(`\nTotal: ${results.length} tests`)
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)
  
  if (failed > 0) {
    console.log('\n❌ Some tests failed!')
    process.exit(1)
  } else {
    console.log('\n✅ All tests passed!')
  }
}

// Run all tests
runAllTests().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})


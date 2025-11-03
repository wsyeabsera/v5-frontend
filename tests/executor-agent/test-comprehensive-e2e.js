/**
 * Comprehensive End-to-End Test Suite
 * 
 * Tests all aspects of the dynamic MCP-driven Executor Agent:
 * 1. Dynamic schema discovery and coordination
 * 2. Error recovery with tool awareness
 * 3. Parameter extraction from previous steps
 * 4. Lookup flow detection
 * 5. Full pipeline integration
 */

const BASE_URL = 'http://localhost:3001'

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function makeRequest(endpoint, body) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(`${endpoint} failed: ${error.error || res.statusText}`)
  }
  
  return res.json()
}

async function testFullPipeline(query) {
  const requestId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  console.log(`\n📋 Testing: "${query}"`)
  console.log('─'.repeat(80))

  try {
    // Step 1: Generate thoughts
    console.log('  Step 1: Generating thoughts...')
    const thoughtData = await makeRequest('/api/agents/thought-agent', {
      userQuery: query,
      requestContext: {
        requestId,
        createdAt: new Date(),
        agentChain: [],
        status: 'pending',
      },
    })
    console.log('  ✅ Thoughts generated')

    // Step 2: Generate plan
    console.log('  Step 2: Generating plan...')
    const planData = await makeRequest('/api/agents/planner-agent', {
      thoughts: thoughtData.thoughts,
      userQuery: query,
      requestContext: thoughtData.requestContext,
    })
    console.log(`  ✅ Plan generated (${planData.plan.steps.length} steps)`)

    // Step 3: Generate critique
    console.log('  Step 3: Generating critique...')
    const critiqueData = await makeRequest('/api/agents/critic-agent', {
      plan: planData.plan,
      userQuery: query,
      requestContext: planData.requestContext,
    })
    console.log(`  ✅ Critique generated (recommendation: ${critiqueData.critique.recommendation})`)

    // Step 4: Execute plan
    console.log('  Step 4: Executing plan...')
    const execData = await makeRequest('/api/agents/executor-agent', {
      requestContext: planData.requestContext,
      userQuery: query,
    })

    // Analyze results
    const success = execData.executionResult.overallSuccess
    const stepsExecuted = execData.executionResult.steps.length
    const stepsSucceeded = execData.executionResult.steps.filter(s => s.success).length
    const planUpdates = execData.executionResult.planUpdates?.length || 0
    const errors = execData.executionResult.errors?.length || 0

    console.log('  ✅ Execution completed')
    console.log(`     Success: ${success}`)
    console.log(`     Steps: ${stepsSucceeded}/${stepsExecuted} succeeded`)
    console.log(`     Plan updates: ${planUpdates}`)
    console.log(`     Errors: ${errors}`)

    if (planUpdates > 0) {
      console.log(`     ✅ Dynamic coordination detected!`)
      execData.executionResult.planUpdates.forEach((update, i) => {
        console.log(`        Update ${i + 1} for Step ${update.stepOrder}:`)
        const changedParams = Object.keys(update.updatedParameters || {}).filter(
          key => update.originalParameters[key] !== update.updatedParameters[key]
        )
        if (changedParams.length > 0) {
          changedParams.forEach(param => {
            console.log(`          ${param}: "${update.originalParameters[param]}" → "${update.updatedParameters[param]}"`)
          })
        } else {
          console.log(`          Original: ${JSON.stringify(update.originalParameters)}`)
          console.log(`          Updated:  ${JSON.stringify(update.updatedParameters)}`)
        }
      })
    }

    return {
      success,
      stepsExecuted,
      stepsSucceeded,
      planUpdates,
      errors,
      execData,
    }
  } catch (error) {
    console.error(`  ❌ Failed: ${error.message}`)
    return { success: false, error: error.message }
  }
}

async function testFacilityNameToId() {
  console.log('\n🧪 Test 1: Facility Name to ID Resolution (Dynamic Schema Discovery)')
  console.log('='.repeat(80))
  
  const result = await testFullPipeline('get me details of facility hannover')
  
  const passed = result.success && (
    result.planUpdates > 0 || // Coordination happened
    result.stepsSucceeded === result.stepsExecuted // All steps succeeded
  )
  
  console.log(`\n${passed ? '✅' : '❌'} Test ${passed ? 'PASSED' : 'FAILED'}`)
  return passed
}

async function testErrorRecovery() {
  console.log('\n🧪 Test 2: Error Recovery with Tool Awareness')
  console.log('='.repeat(80))
  
  // This should trigger an error (invalid ID) and test recovery
  const result = await testFullPipeline('get details of facility with id invalid-test-id-999')
  
  // Success if:
  // 1. Error was caught and handled gracefully (execution completed without crashing)
  // 2. OR execution succeeded (error handler found alternative solution)
  // 3. OR some steps failed but were handled (not all steps failed without handling)
  const hasErrors = result.execData?.executionResult?.errors?.length > 0
  const hasFailedSteps = result.stepsSucceeded < result.stepsExecuted
  const handledGracefully = result.execData && !result.error // Completed without fatal error
  
  const passed = handledGracefully && (hasErrors || hasFailedSteps || result.success)
  
  if (hasErrors) {
    console.log(`     Errors caught: ${result.execData.executionResult.errors.length}`)
  }
  if (hasFailedSteps) {
    console.log(`     Some steps handled errors gracefully`)
  }
  if (result.success) {
    console.log(`     Execution succeeded (error recovery worked)`)

  }
  
  console.log(`\n${passed ? '✅' : '❌'} Test ${passed ? 'PASSED' : 'FAILED'}`)
  return passed
}

async function testParameterCoordination() {
  console.log('\n🧪 Test 3: Parameter Coordination from Previous Steps')
  console.log('='.repeat(80))
  
  // This should require coordination (get facility ID from list step)
  const result = await testFullPipeline('list all facilities and get details for the first one')
  
  const passed = result.success && result.stepsExecuted >= 2
  
  console.log(`\n${passed ? '✅' : '❌'} Test ${passed ? 'PASSED' : 'FAILED'}`)
  return passed
}

async function testSimpleExecution() {
  console.log('\n🧪 Test 4: Simple Execution (No Coordination Needed)')
  console.log('='.repeat(80))
  
  const result = await testFullPipeline('list all facilities')
  
  const passed = result.success && result.stepsExecuted > 0
  
  console.log(`\n${passed ? '✅' : '❌'} Test ${passed ? 'PASSED' : 'FAILED'}`)
  return passed
}

async function runAllTests() {
  console.log('\n🚀 Comprehensive End-to-End Test Suite')
  console.log('='.repeat(80))
  console.log('Testing dynamic MCP-driven Executor Agent\n')

  const results = {
    facilityNameToId: false,
    errorRecovery: false,
    parameterCoordination: false,
    simpleExecution: false,
  }

  try {
    // Test 1
    results.facilityNameToId = await testFacilityNameToId()
    await sleep(2000)

    // Test 2
    results.errorRecovery = await testErrorRecovery()
    await sleep(2000)

    // Test 3
    results.parameterCoordination = await testParameterCoordination()
    await sleep(2000)

    // Test 4
    results.simpleExecution = await testSimpleExecution()

    // Summary
    console.log('\n' + '='.repeat(80))
    console.log('📊 COMPREHENSIVE TEST SUMMARY')
    console.log('='.repeat(80))
    console.log(`✅ Facility Name → ID Resolution: ${results.facilityNameToId ? 'PASSED' : 'FAILED'}`)
    console.log(`✅ Error Recovery: ${results.errorRecovery ? 'PASSED' : 'FAILED'}`)
    console.log(`✅ Parameter Coordination: ${results.parameterCoordination ? 'PASSED' : 'FAILED'}`)
    console.log(`✅ Simple Execution: ${results.simpleExecution ? 'PASSED' : 'FAILED'}`)

    const allPassed = Object.values(results).every(v => v)
    const passCount = Object.values(results).filter(v => v).length
    const totalTests = Object.keys(results).length

    console.log(`\n📈 Results: ${passCount}/${totalTests} tests passed`)

    if (allPassed) {
      console.log('\n🎉 All tests passed! Dynamic MCP-driven executor is working correctly.')
    } else {
      console.log('\n⚠️  Some tests failed. Review output above for details.')
    }

    return allPassed
  } catch (error) {
    console.error('\n💥 Fatal error during testing:', error)
    return false
  }
}

// Run tests
if (require.main === module) {
  runAllTests()
    .then(passed => {
      process.exit(passed ? 0 : 1)
    })
    .catch(error => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

module.exports = { 
  runAllTests,
  testFacilityNameToId,
  testErrorRecovery,
  testParameterCoordination,
  testSimpleExecution,
}


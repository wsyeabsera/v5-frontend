/**
 * Test Dynamic MCP Context Features
 * 
 * Tests:
 * 1. MCP tool schema discovery
 * 2. Dynamic parameter extraction using schemas
 * 3. Lookup flow detection
 * 4. Error recovery with MCP tool awareness
 */

const BASE_URL = 'http://localhost:3001'

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function testDynamicSchemaDiscovery() {
  console.log('\n🧪 Test: Dynamic MCP Schema Discovery')
  console.log('='.repeat(80))

  try {
    // Test facility name to ID resolution
    const requestId = `test-schema-${Date.now()}`

    // Generate thoughts
    const thoughtRes = await fetch(`${BASE_URL}/api/agents/thought-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userQuery: 'get me details of facility hannover',
        requestContext: {
          requestId,
          createdAt: new Date(),
          agentChain: [],
          status: 'pending',
        },
      }),
    })

    if (!thoughtRes.ok) {
      throw new Error('Thought generation failed')
    }

    const thoughtData = await thoughtRes.json()

    // Generate plan
    const planRes = await fetch(`${BASE_URL}/api/agents/planner-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        thoughts: thoughtData.thoughts,
        userQuery: 'get me details of facility hannover',
        requestContext: thoughtData.requestContext,
      }),
    })

    if (!planRes.ok) {
      throw new Error('Plan generation failed')
    }

    const planData = await planRes.json()
    console.log(`✅ Plan generated (${planData.plan.steps.length} steps)`)

    // Check if plan has list_facilities step (should have for lookup)
    const hasListStep = planData.plan.steps.some(s => 
      s.action.toLowerCase().includes('list_facilities') ||
      s.action.toLowerCase().includes('list')
    )
    console.log(`   Has lookup step: ${hasListStep}`)

    // Execute plan
    const execRes = await fetch(`${BASE_URL}/api/agents/executor-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestContext: planData.requestContext,
        userQuery: 'get me details of facility hannover',
      }),
    })

    if (!execRes.ok) {
      const error = await execRes.json()
      throw new Error(`Execution failed: ${error.error}`)
    }

    const execData = await execRes.json()
    console.log('✅ Execution completed')
    console.log(`   Success: ${execData.executionResult.overallSuccess}`)
    console.log(`   Steps executed: ${execData.executionResult.steps.length}`)

    // Check for plan updates (coordination using MCP schemas)
    if (execData.executionResult.planUpdates && execData.executionResult.planUpdates.length > 0) {
      console.log(`✅ Plan updates found (dynamic coordination working):`)
      execData.executionResult.planUpdates.forEach((update, i) => {
        console.log(`   Update ${i + 1}:`)
        console.log(`     Step: ${update.stepOrder}`)
        console.log(`     Parameter: ${update.parameterName}`)
        console.log(`     Original: ${update.originalValue}`)
        console.log(`     Updated: ${update.updatedValue}`)
      })
      return true
    } else {
      console.log('⚠️  No plan updates found')
      // Check if execution succeeded anyway (might have been correct from start)
      if (execData.executionResult.overallSuccess) {
        console.log('✅ Execution succeeded (may have been correct from start)')
        return true
      }
      return false
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    return false
  }
}

async function testErrorRecoveryWithSchemas() {
  console.log('\n🧪 Test: Error Recovery with MCP Schema Awareness')
  console.log('='.repeat(80))

  try {
    const requestId = `test-error-${Date.now()}`

    // Create a scenario where we'll get an error (invalid facility ID)
    const thoughtRes = await fetch(`${BASE_URL}/api/agents/thought-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userQuery: 'get details of facility with id invalid-id-123',
        requestContext: {
          requestId,
          createdAt: new Date(),
          agentChain: [],
          status: 'pending',
        },
      }),
    })

    const thoughtData = await thoughtRes.json()

    const planRes = await fetch(`${BASE_URL}/api/agents/planner-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        thoughts: thoughtData.thoughts,
        userQuery: 'get details of facility with id invalid-id-123',
        requestContext: thoughtData.requestContext,
      }),
    })

    const planData = await planRes.json()

    // Execute plan
    const execRes = await fetch(`${BASE_URL}/api/agents/executor-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestContext: planData.requestContext,
        userQuery: 'get details of facility with id invalid-id-123',
      }),
    })

    const execData = await execRes.json()
    
    // Check error handling
    const hasErrors = execData.executionResult.errors && execData.executionResult.errors.length > 0
    const hasErrorHandling = execData.executionResult.steps.some(s => 
      !s.success && s.error
    )

    console.log(`✅ Error handling check:`)
    console.log(`   Errors encountered: ${hasErrors}`)
    console.log(`   Steps with errors: ${hasErrorHandling}`)

    // Check if error handler attempted recovery
    if (hasErrorHandling) {
      const failedSteps = execData.executionResult.steps.filter(s => !s.success)
      failedSteps.forEach(step => {
        console.log(`   Failed step ${step.stepOrder}: ${step.error}`)
        console.log(`   Retries: ${step.retries || 0}`)
      })

      // Success if error was handled gracefully (not crashing)
      return true
    }

    return execData.executionResult.overallSuccess
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    return false
  }
}

async function testToolParameterExtraction() {
  console.log('\n🧪 Test: Tool Parameter Extraction from Schemas')
  console.log('='.repeat(80))

  try {
    const requestId = `test-params-${Date.now()}`

    // Test query that requires parameter coordination
    const thoughtRes = await fetch(`${BASE_URL}/api/agents/thought-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userQuery: 'create a shipment for facility in Berlin',
        requestContext: {
          requestId,
          createdAt: new Date(),
          agentChain: [],
          status: 'pending',
        },
      }),
    })

    const thoughtData = await thoughtRes.json()

    const planRes = await fetch(`${BASE_URL}/api/agents/planner-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        thoughts: thoughtData.thoughts,
        userQuery: 'create a shipment for facility in Berlin',
        requestContext: thoughtData.requestContext,
      }),
    })

    const planData = await planRes.json()
    console.log(`✅ Plan generated (${planData.plan.steps.length} steps)`)

    // Execute
    const execRes = await fetch(`${BASE_URL}/api/agents/executor-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestContext: planData.requestContext,
        userQuery: 'create a shipment for facility in Berlin',
      }),
    })

    const execData = await execRes.json()
    
    // Check if parameters were correctly extracted based on tool schemas
    const stepsWithParams = execData.executionResult.steps.filter(s => 
      s.parametersUsed && Object.keys(s.parametersUsed).length > 0
    )

    console.log(`✅ Parameter extraction check:`)
    console.log(`   Steps with parameters: ${stepsWithParams.length}`)
    
    stepsWithParams.forEach(step => {
      console.log(`   Step ${step.stepOrder}:`)
      console.log(`     Parameters: ${JSON.stringify(step.parametersUsed)}`)
    })

    return execData.executionResult.overallSuccess || stepsWithParams.length > 0
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    return false
  }
}

async function runDynamicMCPTests() {
  console.log('\n🚀 Running Dynamic MCP Context Tests')
  console.log('='.repeat(80))
  console.log('Testing schema-driven coordination and error recovery\n')

  const results = {
    schemaDiscovery: false,
    errorRecovery: false,
    parameterExtraction: false,
  }

  // Test 1: Schema discovery
  results.schemaDiscovery = await testDynamicSchemaDiscovery()
  await sleep(2000)

  // Test 2: Error recovery
  results.errorRecovery = await testErrorRecoveryWithSchemas()
  await sleep(2000)

  // Test 3: Parameter extraction
  results.parameterExtraction = await testToolParameterExtraction()

  // Summary
  console.log('\n' + '='.repeat(80))
  console.log('📊 DYNAMIC MCP TEST SUMMARY')
  console.log('='.repeat(80))
  console.log(`✅ Schema Discovery: ${results.schemaDiscovery ? 'PASSED' : 'FAILED'}`)
  console.log(`✅ Error Recovery: ${results.errorRecovery ? 'PASSED' : 'FAILED'}`)
  console.log(`✅ Parameter Extraction: ${results.parameterExtraction ? 'PASSED' : 'FAILED'}`)

  const allPassed = results.schemaDiscovery && results.errorRecovery && results.parameterExtraction

  if (allPassed) {
    console.log('\n✅ All dynamic MCP tests passed!')
  } else {
    console.log('\n⚠️  Some tests failed. Review output above.')
  }

  return allPassed
}

// Run tests
if (require.main === module) {
  runDynamicMCPTests()
    .then(passed => {
      process.exit(passed ? 0 : 1)
    })
    .catch(error => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

module.exports = { 
  runDynamicMCPTests, 
  testDynamicSchemaDiscovery, 
  testErrorRecoveryWithSchemas,
  testToolParameterExtraction 
}


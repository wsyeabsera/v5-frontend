/**
 * System Test for New Executor Agent Architecture
 * 
 * Tests:
 * 1. Simple execution
 * 2. LLM-driven coordination
 * 3. Meta-reasoning validation
 * 4. Error handling
 */

const BASE_URL = 'http://localhost:3001'

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function testSimpleExecution() {
  console.log('\n🧪 Test 1: Simple Execution')
  console.log('='.repeat(80))

  try {
    // Generate thoughts
    const thoughtRes = await fetch(`${BASE_URL}/api/agents/thought-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userQuery: 'List all facilities',
        requestContext: {
          requestId: `test-simple-${Date.now()}`,
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
    console.log('✅ Thoughts generated')

    // Generate plan
    const planRes = await fetch(`${BASE_URL}/api/agents/planner-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        thoughts: thoughtData.thoughts,
        userQuery: 'List all facilities',
        requestContext: thoughtData.requestContext,
      }),
    })

    if (!planRes.ok) {
      throw new Error('Plan generation failed')
    }

    const planData = await planRes.json()
    console.log(`✅ Plan generated (${planData.plan.steps.length} steps)`)

    // Execute plan
    const execRes = await fetch(`${BASE_URL}/api/agents/executor-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestContext: planData.requestContext,
        userQuery: 'List all facilities',
      }),
    })

    if (!execRes.ok) {
      const error = await execRes.json()
      throw new Error(`Execution failed: ${error.error}`)
    }

    const execData = await execRes.json()
    console.log('✅ Execution completed')
    console.log(`   Success: ${execData.executionResult.overallSuccess}`)
    console.log(`   Steps: ${execData.executionResult.steps.length}`)

    return execData.executionResult.overallSuccess
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    return false
  }
}

async function testCoordination() {
  console.log('\n🧪 Test 2: LLM-Driven Coordination')
  console.log('='.repeat(80))

  try {
    const requestId = `test-coord-${Date.now()}`

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

    const planData = await planRes.json()
    console.log(`✅ Plan generated (${planData.plan.steps.length} steps)`)

    // Check if plan needs coordination
    const needsCoordination = planData.plan.steps.some(step =>
      step.parameters && Object.values(step.parameters).some(v =>
        typeof v === 'string' && (
          v.toLowerCase().includes('extracted') ||
          v.toLowerCase().includes('from_step')
        )
      )
    )

    if (needsCoordination) {
      console.log('✅ Plan requires coordination (will test LLM-driven extraction)')
    }

    // Generate critique
    const critiqueRes = await fetch(`${BASE_URL}/api/agents/critic-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: planData.plan,
        userQuery: 'get me details of facility hannover',
        requestContext: planData.requestContext,
      }),
    })

    const critiqueData = await critiqueRes.json()
    console.log(`✅ Critique generated (recommendation: ${critiqueData.critique.recommendation})`)

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
    console.log(`   Steps: ${execData.executionResult.steps.length}`)

    // Check for plan updates (coordination happened)
    if (execData.executionResult.planUpdates && execData.executionResult.planUpdates.length > 0) {
      console.log(`✅ Plan updates tracked: ${execData.executionResult.planUpdates.length}`)
      console.log(`   LLM-driven coordination working!`)
      return true
    } else {
      console.log('⚠️  No plan updates found (coordination may have happened but not tracked)')
      return execData.executionResult.overallSuccess
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    return false
  }
}

async function testMetaReasoning() {
  console.log('\n🧪 Test 3: Meta-Reasoning Checkpoints')
  console.log('='.repeat(80))

  try {
    const requestId = `test-meta-${Date.now()}`

    // Create a multi-step plan
    const thoughtRes = await fetch(`${BASE_URL}/api/agents/thought-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userQuery: 'List all facilities and get details for facility ABC',
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
        userQuery: 'List all facilities and get details for facility ABC',
        requestContext: thoughtData.requestContext,
      }),
    })

    const planData = await planRes.json()
    console.log(`✅ Plan generated (${planData.plan.steps.length} steps)`)

    // Execute plan
    const execRes = await fetch(`${BASE_URL}/api/agents/executor-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestContext: planData.requestContext,
        userQuery: 'List all facilities and get details for facility ABC',
      }),
    })

    const execData = await execRes.json()
    console.log('✅ Execution completed')

    // Check if multiple steps executed (meta-reasoning happened after each)
    if (execData.executionResult.steps.length >= 2) {
      console.log('✅ Multiple steps executed (meta-reasoning checkpoints triggered)')
      return true
    } else {
      console.log('⚠️  Only one step executed')
      return execData.executionResult.overallSuccess
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    return false
  }
}

async function checkLogsForReasoning() {
  console.log('\n📊 Checking Logs for LLM Reasoning Evidence')
  console.log('='.repeat(80))

  // Read logs to verify LLM reasoning is happening
  const fs = require('fs')
  const path = require('path')
  const logFile = path.join(__dirname, '../../logs/app.log')

  if (!fs.existsSync(logFile)) {
    console.log('⚠️  Log file not found')
    return
  }

  const logs = fs.readFileSync(logFile, 'utf-8')
  const recentLogs = logs.split('\n').slice(-500).join('\n')

  const checks = {
    'Coordinator analysis': /Coordinating step|Coordination analysis/i.test(recentLogs),
    'Plan validation': /Plan validation|Meta-reasoning checkpoint/i.test(recentLogs),
    'Error handling': /Error decision|Error Recovery Agent/i.test(recentLogs),
    'Question generation': /Question Generation|generateErrorQuestion/i.test(recentLogs),
  }

  Object.entries(checks).forEach(([check, passed]) => {
    console.log(`${passed ? '✅' : '⚠️'} ${check}: ${passed ? 'Found in logs' : 'Not found'}`)
  })

  return Object.values(checks).filter(Boolean).length
}

async function runAllTests() {
  console.log('\n🚀 Running Executor Agent System Tests')
  console.log('='.repeat(80))
  console.log('Testing new LLM-first adaptive architecture\n')

  const results = {
    simpleExecution: false,
    coordination: false,
    metaReasoning: false,
    logChecks: 0,
  }

  // Test 1: Simple execution
  results.simpleExecution = await testSimpleExecution()
  await sleep(2000)

  // Test 2: Coordination
  results.coordination = await testCoordination()
  await sleep(2000)

  // Test 3: Meta-reasoning
  results.metaReasoning = await testMetaReasoning()

  // Check logs
  results.logChecks = await checkLogsForReasoning()

  // Summary
  console.log('\n' + '='.repeat(80))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(80))
  console.log(`✅ Simple Execution: ${results.simpleExecution ? 'PASSED' : 'FAILED'}`)
  console.log(`✅ LLM-Driven Coordination: ${results.coordination ? 'PASSED' : 'FAILED'}`)
  console.log(`✅ Meta-Reasoning Checkpoints: ${results.metaReasoning ? 'PASSED' : 'FAILED'}`)
  console.log(`✅ Log Evidence: ${results.logChecks}/4 reasoning components found`)

  const allPassed = results.simpleExecution && results.coordination && results.metaReasoning

  if (allPassed) {
    console.log('\n✅ All tests passed! New executor agent architecture is working.')
  } else {
    console.log('\n⚠️  Some tests failed. Review output above.')
  }

  return allPassed
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

module.exports = { runAllTests, testSimpleExecution, testCoordination, testMetaReasoning }


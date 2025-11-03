/**
 * Test End-to-End Dynamic Plan Update Flow
 * 
 * Tests the scenario: "get me details of facility hannover"
 * - Step 1: List facilities (returns array with Hannover facility)
 * - Step 2: Get facility details (needs facilityId)
 * 
 * Verifies:
 * - Critic recommends "approve-with-dynamic-fix"
 * - Executor extracts facilityId from step 1 result
 * - Step 2 parameters updated with correct facilityId
 * - Step 2 executes successfully with updated parameters
 * - planUpdates shows the parameter update
 * - Execution doesn't restart
 */

const BASE_URL = 'http://localhost:3001'

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function testDynamicPlanUpdateFlow() {
  console.log('\n🧪 Testing Dynamic Plan Update Flow')
  console.log('='.repeat(80))
  console.log('Scenario: "get me details of facility hannover"\n')

  try {
    // === PHASE 1: Create plan from scratch ===
    console.log('📝 PHASE 1: Creating plan...')
    const userQuery = 'get me details of facility hannover'
    const requestId = `test-dynamic-${Date.now()}`
    
    let requestContext = {
      requestId,
      createdAt: new Date(),
      agentChain: [],
      status: 'pending',
      userQuery,
    }

    // Step 1: Generate thoughts
    console.log('💭 Generating thoughts...')
    const thoughtResponse = await fetch(`${BASE_URL}/api/agents/thought-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userQuery, requestContext }),
    })
    
    if (!thoughtResponse.ok) {
      const error = await thoughtResponse.json()
      throw new Error(`Thought generation failed: ${error.error}`)
    }
    
    const thoughtData = await thoughtResponse.json()
    requestContext = thoughtData.requestContext
    console.log('✅ Thoughts generated')

    // Step 2: Generate plan
    console.log('\n📋 Generating plan...')
    const planResponse = await fetch(`${BASE_URL}/api/agents/planner-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        thoughts: thoughtData.thoughts,
        userQuery,
        requestContext,
      }),
    })
    
    if (!planResponse.ok) {
      const error = await planResponse.json()
      throw new Error(`Plan generation failed: ${error.error}`)
    }
    
    const planData = await planResponse.json()
    requestContext = planData.requestContext
    
    console.log('✅ Plan generated')
    console.log(`   Goal: ${planData.plan.goal}`)
    console.log(`   Steps: ${planData.plan.steps.length}`)
    planData.plan.steps.forEach((step, idx) => {
      console.log(`   Step ${step.order}: ${step.description} (${step.action})`)
      if (step.parameters) {
        console.log(`      Parameters: ${JSON.stringify(step.parameters)}`)
      }
    })

    // === PHASE 2: Critique plan ===
    console.log('\n\n🛡️  PHASE 2: Critiquing plan...')
    const critiqueResponse = await fetch(`${BASE_URL}/api/agents/critic-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: planData.plan,
        userQuery,
        requestContext,
      }),
    })
    
    if (!critiqueResponse.ok) {
      const error = await critiqueResponse.json()
      throw new Error(`Critique generation failed: ${error.error}`)
    }
    
    const critique = await critiqueResponse.json()
    console.log('✅ Critique generated')
    console.log(`   Recommendation: ${critique.critique.recommendation}`)
    console.log(`   Overall Score: ${(critique.critique.overallScore * 100).toFixed(1)}%`)
    console.log(`   Rationale: ${critique.critique.rationale}`)
    
    if (critique.critique.issues.length > 0) {
      console.log(`   Issues: ${critique.critique.issues.length}`)
      critique.critique.issues.slice(0, 3).forEach((issue, idx) => {
        console.log(`      ${idx + 1}. [${issue.severity}] ${issue.description}`)
      })
    }

    // === PHASE 3: Execute plan ===
    console.log('\n\n🚀 PHASE 3: Executing plan...')
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
    console.log('✅ Execution completed')
    console.log(`   Overall Success: ${execution.executionResult.overallSuccess}`)
    console.log(`   Steps Executed: ${execution.executionResult.steps.length}`)
    console.log(`   Duration: ${execution.executionResult.totalDuration}ms`)

    // === PHASE 4: Verify results ===
    console.log('\n\n✅ PHASE 4: Verifying results...')
    
    // Check critique recommendation
    console.log('\n1. Checking Critic Recommendation...')
    if (execution.critiqueRecommendation === 'approve-with-dynamic-fix') {
      console.log('   ✅ Critic correctly recommended "approve-with-dynamic-fix"')
    } else {
      console.log(`   ⚠️  Critic recommendation: ${execution.critiqueRecommendation}`)
      console.log(`      Expected: approve-with-dynamic-fix`)
      if (execution.critiqueRecommendation === 'reject') {
        console.log('      ⚠️  Plan was rejected - dynamic fix detection may not be working')
      }
    }

    // Check plan updates
    console.log('\n2. Checking Plan Updates...')
    if (execution.executionResult.planUpdates && execution.executionResult.planUpdates.length > 0) {
      console.log(`   ✅ Found ${execution.executionResult.planUpdates.length} plan update(s)`)
      execution.executionResult.planUpdates.forEach((update, idx) => {
        console.log(`\n   Update ${idx + 1}:`)
        console.log(`      Step: ${update.stepOrder}`)
        console.log(`      Reason: ${update.reason}`)
        console.log(`      Original Parameters:`)
        console.log(`        ${JSON.stringify(update.originalParameters, null, 2).split('\n').join('\n        ')}`)
        console.log(`      Updated Parameters:`)
        console.log(`        ${JSON.stringify(update.updatedParameters, null, 2).split('\n').join('\n        ')}`)
        
        // Check if facilityId was extracted
        if (update.updatedParameters.facilityId && !update.originalParameters.facilityId) {
          console.log(`      ✅ facilityId was successfully extracted: ${update.updatedParameters.facilityId}`)
        }
      })
    } else {
      console.log('   ⚠️  No plan updates found')
      console.log('      Expected: planUpdates array with parameter extraction')
    }

    // Check step execution
    console.log('\n3. Checking Step Execution...')
    const stepResults = execution.executionResult.steps
    console.log(`   Total steps: ${stepResults.length}`)
    
    stepResults.forEach((step, idx) => {
      console.log(`\n   Step ${step.stepOrder}:`)
      console.log(`      Action: ${step.toolCalled || 'N/A'}`)
      console.log(`      Success: ${step.success}`)
      if (step.success && step.result) {
        const resultStr = typeof step.result === 'string' 
          ? step.result.substring(0, 100) 
          : JSON.stringify(step.result).substring(0, 100)
        console.log(`      Result: ${resultStr}...`)
      }
      if (step.error) {
        console.log(`      Error: ${step.error}`)
      }
      if (step.parametersUsed) {
        console.log(`      Parameters Used:`)
        console.log(`        ${JSON.stringify(step.parametersUsed, null, 2).split('\n').join('\n        ')}`)
        
        // Check if step 2 used extracted facilityId
        if (step.stepOrder === 2 && step.parametersUsed.facilityId) {
          console.log(`      ✅ Step 2 used extracted facilityId: ${step.parametersUsed.facilityId}`)
        }
      }
    })

    // Check execution flow (no restart)
    console.log('\n4. Checking Execution Flow...')
    const stepOrder = stepResults.map(s => s.stepOrder)
    const isSequential = stepOrder.every((order, idx) => idx === 0 || order === stepOrder[idx - 1] + 1)
    
    if (isSequential && stepResults.length === planData.plan.steps.length) {
      console.log('   ✅ Steps executed sequentially without restart')
    } else {
      console.log('   ⚠️  Step execution pattern:', stepOrder.join(', '))
    }

    // Check overall success
    console.log('\n5. Overall Execution Status...')
    if (execution.executionResult.overallSuccess) {
      console.log('   ✅ Execution completed successfully')
    } else {
      console.log('   ⚠️  Execution had errors:')
      execution.executionResult.errors.forEach(err => {
        console.log(`      - ${err}`)
      })
    }

    // === SUMMARY ===
    console.log('\n' + '='.repeat(80))
    console.log('📊 TEST SUMMARY')
    console.log('='.repeat(80))
    
    const checks = {
      'Critic recommends approve-with-dynamic-fix': execution.critiqueRecommendation === 'approve-with-dynamic-fix',
      'Plan updates tracked': execution.executionResult.planUpdates && execution.executionResult.planUpdates.length > 0,
      'Parameters extracted': execution.executionResult.planUpdates?.some(u => 
        u.updatedParameters.facilityId && !u.originalParameters.facilityId
      ),
      'Execution completed': execution.executionResult.overallSuccess,
      'No restart': isSequential,
    }
    
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${check}`)
    })
    
    const allPassed = Object.values(checks).every(c => c === true)
    
    if (allPassed) {
      console.log('\n✅ All checks passed! Dynamic plan update flow is working correctly.')
    } else {
      console.log('\n⚠️  Some checks failed. Review the output above for details.')
    }

    return allPassed

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message)
    console.error(error.stack)
    return false
  }
}

// Run the test
if (require.main === module) {
  testDynamicPlanUpdateFlow()
    .then(passed => {
      process.exit(passed ? 0 : 1)
    })
    .catch(error => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

module.exports = { testDynamicPlanUpdateFlow }


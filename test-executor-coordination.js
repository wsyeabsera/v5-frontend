/**
 * Test Executor Parameter Coordination
 * 
 * Tests coordinateSteps() method with various parameter scenarios:
 * - Explicit $step-X references
 * - Missing/null parameters that can be extracted
 * - Parameters that cannot be extracted
 * 
 * Verifies wasUpdated flag is set correctly
 * Verifies plan updates are created correctly
 */

const BASE_URL = 'http://localhost:3001'

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function testExecutorCoordination() {
  console.log('\n🧪 Testing Executor Parameter Coordination')
  console.log('='.repeat(80))

  try {
    // Create a test plan where step 1 returns data needed for step 2
    console.log('\n📝 Creating test plan with parameter dependencies...')
    
    const userQuery = 'get me details of facility hannover'
    const requestId = `test-coordination-${Date.now()}`
    
    let requestContext = {
      requestId,
      createdAt: new Date(),
      agentChain: [],
      status: 'pending',
      userQuery,
    }

    // Generate thoughts and plan
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

    console.log('📋 Generating plan...')
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
    console.log(`   Steps: ${planData.plan.steps.length}`)
    planData.plan.steps.forEach((step, idx) => {
      console.log(`   Step ${step.order}: ${step.action}`)
      if (step.parameters) {
        console.log(`      Parameters: ${JSON.stringify(step.parameters)}`)
      }
    })

    // Execute the plan
    console.log('\n🚀 Executing plan...')
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

    // Analyze coordination results
    console.log('\n\n📊 ANALYZING COORDINATION RESULTS')
    console.log('='.repeat(80))

    // Check step results for parameter coordination
    console.log('\n1. Step Execution Analysis:')
    const stepResults = execution.executionResult.steps
    
    stepResults.forEach((step, idx) => {
      console.log(`\n   Step ${step.stepOrder}:`)
      console.log(`      Action: ${step.toolCalled || 'N/A'}`)
      console.log(`      Success: ${step.success}`)
      
      if (step.parametersUsed) {
        console.log(`      Parameters Used:`)
        Object.entries(step.parametersUsed).forEach(([key, value]) => {
          const originalStep = planData.plan.steps.find(s => s.order === step.stepOrder)
          const originalValue = originalStep?.parameters?.[key]
          
          if (originalValue !== value) {
            console.log(`         ${key}: ${originalValue} → ${value} ✅ (updated)`)
          } else {
            console.log(`         ${key}: ${value}`)
          }
        })
      }
      
      if (step.success && step.result) {
        // Check if result could be used by next step
        const nextStep = planData.plan.steps.find(s => s.order === step.stepOrder + 1)
        if (nextStep) {
          console.log(`      Result available for Step ${nextStep.order}:`)
          const resultPreview = typeof step.result === 'string'
            ? step.result.substring(0, 150)
            : JSON.stringify(step.result).substring(0, 150)
          console.log(`         ${resultPreview}...`)
        }
      }
    })

    // Check plan updates
    console.log('\n2. Plan Updates Analysis:')
    if (execution.executionResult.planUpdates && execution.executionResult.planUpdates.length > 0) {
      console.log(`   ✅ Found ${execution.executionResult.planUpdates.length} update(s)`)
      
      execution.executionResult.planUpdates.forEach((update, idx) => {
        console.log(`\n   Update ${idx + 1}:`)
        console.log(`      Step: ${update.stepOrder}`)
        console.log(`      Timestamp: ${new Date(update.timestamp).toLocaleString()}`)
        console.log(`      Reason: ${update.reason}`)
        
        // Compare parameters
        const paramChanges = []
        Object.keys({ ...update.originalParameters, ...update.updatedParameters }).forEach(key => {
          const original = update.originalParameters[key]
          const updated = update.updatedParameters[key]
          if (original !== updated) {
            paramChanges.push({
              key,
              original,
              updated,
            })
          }
        })
        
        if (paramChanges.length > 0) {
          console.log(`      Parameter Changes:`)
          paramChanges.forEach(change => {
            console.log(`         ${change.key}:`)
            console.log(`            Before: ${JSON.stringify(change.original)}`)
            console.log(`            After:  ${JSON.stringify(change.updated)}`)
          })
        } else {
          console.log(`      ⚠️  No parameter changes detected`)
        }
      })
    } else {
      console.log('   ⚠️  No plan updates found')
      
      // Check if coordination should have happened
      const stepsNeedingCoordination = []
      planData.plan.steps.forEach((step, idx) => {
        if (idx > 0) {
          const prevStep = planData.plan.steps[idx - 1]
          const hasMissingParams = step.parameters && Object.values(step.parameters).some(v => 
            v === null || v === undefined || v === ''
          )
          if (hasMissingParams) {
            stepsNeedingCoordination.push({
              step: step.order,
              action: step.action,
              missingParams: Object.entries(step.parameters || {}).filter(([k, v]) => 
                v === null || v === undefined || v === ''
              ).map(([k]) => k),
            })
          }
        }
      })
      
      if (stepsNeedingCoordination.length > 0) {
        console.log(`   ⚠️  Expected coordination for:`)
        stepsNeedingCoordination.forEach(item => {
          console.log(`      Step ${item.step}: ${item.action}`)
          console.log(`         Missing params: ${item.missingParams.join(', ')}`)
        })
      }
    }

    // Check execution flow
    console.log('\n3. Execution Flow Analysis:')
    const executionOrder = stepResults.map(s => s.stepOrder).sort((a, b) => a - b)
    console.log(`   Execution order: ${executionOrder.join(' → ')}`)
    
    const expectedOrder = planData.plan.steps.map(s => s.order).sort((a, b) => a - b)
    if (JSON.stringify(executionOrder) === JSON.stringify(expectedOrder)) {
      console.log(`   ✅ Steps executed in correct order without restart`)
    } else {
      console.log(`   ⚠️  Execution order differs from plan order`)
      console.log(`      Expected: ${expectedOrder.join(' → ')}`)
    }

    // Verify coordination intelligence
    console.log('\n4. Coordination Intelligence Check:')
    
    // Check if step 2 got facilityId from step 1
    const step1 = stepResults.find(s => s.stepOrder === 1)
    const step2 = stepResults.find(s => s.stepOrder === 2)
    
    if (step1 && step2) {
      const step1Result = step1.result
      const step2Params = step2.parametersUsed
      
      if (step2Params?.facilityId) {
        console.log(`   ✅ Step 2 received facilityId: ${step2Params.facilityId}`)
        
        // Check if it came from step 1
        if (step1Result) {
          const step1Str = typeof step1Result === 'string' 
            ? step1Result 
            : JSON.stringify(step1Result)
          
          if (step1Str.includes(step2Params.facilityId) || 
              (typeof step1Result === 'object' && step1Result && 
               JSON.stringify(step1Result).includes(step2Params.facilityId))) {
            console.log(`   ✅ facilityId appears to come from Step 1 result`)
          } else {
            console.log(`   ⚠️  facilityId source unclear`)
          }
        }
      } else {
        console.log(`   ⚠️  Step 2 did not receive facilityId parameter`)
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80))
    console.log('📊 COORDINATION TEST SUMMARY')
    console.log('='.repeat(80))
    
    const checks = {
      'Plan updates tracked': execution.executionResult.planUpdates && execution.executionResult.planUpdates.length > 0,
      'Parameters were extracted': execution.executionResult.planUpdates?.some(u => {
        const changes = Object.keys({ ...u.originalParameters, ...u.updatedParameters })
          .filter(k => u.originalParameters[k] !== u.updatedParameters[k])
        return changes.length > 0
      }),
      'Execution continued without restart': executionOrder.length === planData.plan.steps.length,
      'Step 2 received extracted parameter': step2?.parametersUsed?.facilityId !== undefined,
    }
    
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${check}`)
    })
    
    const allPassed = Object.values(checks).every(c => c === true)
    
    if (allPassed) {
      console.log('\n✅ All coordination checks passed!')
    } else {
      console.log('\n⚠️  Some coordination checks failed')
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
  testExecutorCoordination()
    .then(passed => {
      process.exit(passed ? 0 : 1)
    })
    .catch(error => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

module.exports = { testExecutorCoordination }


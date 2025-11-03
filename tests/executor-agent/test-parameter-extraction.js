/**
 * Test Parameter Extraction Fix
 * 
 * Specifically tests that:
 * 1. ID is properly extracted from array results (not just adding facilityName)
 * 2. Only schema-valid parameters are added
 * 3. Plan updates show correct extraction
 */

const BASE_URL = 'http://localhost:3001'

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function testParameterExtraction() {
  console.log('\n🧪 Test: Parameter Extraction from Array Results')
  console.log('='.repeat(80))
  console.log('Testing that ID is extracted correctly, not arbitrary fields\n')

  try {
    const requestId = `test-param-extraction-${Date.now()}`

    // Step 1: Generate thoughts
    console.log('  Step 1: Generating thoughts...')
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
    console.log('  ✅ Thoughts generated')

    // Step 2: Generate plan
    console.log('  Step 2: Generating plan...')
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
    console.log(`  ✅ Plan generated (${planData.plan.steps.length} steps)`)

    // Step 3: Execute plan
    console.log('  Step 3: Executing plan...')
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
    console.log('  ✅ Execution completed')

    // Analyze plan updates
    const planUpdates = execData.executionResult.planUpdates || []
    
    if (planUpdates.length === 0) {
      console.log('  ⚠️  No plan updates found')
      // Check if execution succeeded anyway
      if (execData.executionResult.overallSuccess) {
        console.log('  ✅ Execution succeeded (may have been correct from start)')
        return true
      }
      return false
    }

    console.log(`\n  📊 Found ${planUpdates.length} plan update(s):`)
    
    let hasValidExtraction = false
    let hasInvalidField = false

    for (const update of planUpdates) {
      console.log(`\n    Update for Step ${update.stepOrder}:`)
      console.log(`      Original: ${JSON.stringify(update.originalParameters)}`)
      console.log(`      Updated:  ${JSON.stringify(update.updatedParameters)}`)
      console.log(`      Reason:   ${update.reason}`)

      // Check if 'id' parameter was extracted (good)
      if (update.updatedParameters.id && 
          update.updatedParameters.id !== update.originalParameters.id) {
        console.log(`      ✅ ID parameter extracted correctly`)
        hasValidExtraction = true
      }

      // Check for invalid fields (bad)
      const invalidFields = ['facilityName', 'name', 'facilityName'].filter(
        field => update.updatedParameters[field] && !update.originalParameters[field]
      )
      
      if (invalidFields.length > 0) {
        console.log(`      ❌ Invalid fields added: ${invalidFields.join(', ')}`)
        hasInvalidField = true
      } else {
        console.log(`      ✅ No invalid fields added`)
      }

      // Verify that if 'id' was added, it's a valid MongoDB ID format (24 hex chars)
      if (update.updatedParameters.id) {
        const idValue = update.updatedParameters.id
        const isValidId = typeof idValue === 'string' && idValue.length === 24 && /^[0-9a-fA-F]+$/.test(idValue)
        if (isValidId) {
          console.log(`      ✅ ID format is valid MongoDB ObjectId`)
        } else {
          console.log(`      ⚠️  ID format may be invalid: ${idValue}`)
        }
      }
    }

    // Final verdict
    console.log('\n  📈 Extraction Analysis:')
    if (hasValidExtraction && !hasInvalidField) {
      console.log('  ✅ PASSED: ID extracted correctly, no invalid fields')
      return true
    } else if (hasValidExtraction && hasInvalidField) {
      console.log('  ⚠️  PARTIAL: ID extracted but invalid fields also added')
      return false
    } else if (!hasValidExtraction) {
      console.log('  ❌ FAILED: No valid ID extraction found')
      return false
    }

    return execData.executionResult.overallSuccess
  } catch (error) {
    console.error('  ❌ Test failed:', error.message)
    return false
  }
}

// Run test
if (require.main === module) {
  testParameterExtraction()
    .then(passed => {
      console.log(`\n${passed ? '✅' : '❌'} Parameter Extraction Test ${passed ? 'PASSED' : 'FAILED'}`)
      process.exit(passed ? 0 : 1)
    })
    .catch(error => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

module.exports = { testParameterExtraction }


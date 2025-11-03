/**
 * Complete End-to-End Test of Executor Agent
 * 
 * Tests the full execution pipeline:
 * 1. Generate thoughts
 * 2. Generate plan
 * 3. Critique plan (optional)
 * 4. Execute plan
 * 5. Handle user feedback if needed
 */

const BASE_URL = 'http://localhost:3001'

async function testExecutorEndToEnd() {
  console.log('🧪 Testing Executor Agent End-to-End\n')
  console.log('='.repeat(80))
  
  try {
    // === PHASE 1: Create plan from scratch ===
    console.log('\n📝 PHASE 1: Creating plan from user query...')
    console.log('='.repeat(80))
    
    const userQuery = 'List all facilities'
    console.log(`User Query: "${userQuery}"\n`)
    
    // Create request context
    const requestId = `test-executor-${Date.now()}`
    let requestContext = {
      requestId,
      createdAt: new Date(),
      agentChain: [],
      status: 'pending',
      userQuery,
    }
    
    // Step 1: Generate thoughts
    console.log('💭 Step 1.1: Generating thoughts...')
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
    console.log(`   Primary approach: ${thoughtData.primaryApproach}`)
    
    // Step 2: Generate plan
    console.log('\n📋 Step 1.2: Generating plan...')
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
    planData.plan.steps.forEach(step => {
      console.log(`      ${step.order}. ${step.description} (${step.action})`)
    })
    
    // Step 3: Generate critique (optional but recommended)
    console.log('\n🔍 Step 1.3: Generating critique...')
    let critique = null
    try {
      const critiqueResponse = await fetch(`${BASE_URL}/api/agents/critic-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planData.plan,
          userQuery,
          requestContext,
        }),
      })
      
      if (critiqueResponse.ok) {
        critique = await critiqueResponse.json()
        console.log('✅ Critique generated')
        console.log(`   Recommendation: ${critique.critique.recommendation}`)
        console.log(`   Score: ${critique.critique.overallScore.toFixed(2)}`)
        console.log(`   Issues: ${critique.critique.issues.length}`)
      } else {
        const error = await critiqueResponse.json()
        console.log(`⚠️  Critique failed: ${error.error} (continuing without critique)`)
      }
    } catch (error) {
      console.log(`⚠️  Critique error: ${error.message} (continuing without critique)`)
    }
    
    // === PHASE 2: Execute plan ===
    console.log('\n\n⚙️  PHASE 2: Executing plan...')
    console.log('='.repeat(80))
    
    console.log('🚀 Step 2.1: Calling executor agent...')
    const executionResponse = await fetch(`${BASE_URL}/api/agents/executor-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: planData.plan,
        userQuery,
        requestContext,
      }),
    })
    
    if (!executionResponse.ok) {
      const error = await executionResponse.json()
      throw new Error(`Execution failed: ${error.error}`)
    }
    
    const executionResult = await executionResponse.json()
    console.log('✅ Execution completed')
    console.log(`   Overall success: ${executionResult.executionResult.overallSuccess}`)
    console.log(`   Steps executed: ${executionResult.executionResult.steps.length}`)
    console.log(`   Steps succeeded: ${executionResult.executionResult.steps.filter(s => s.success).length}`)
    console.log(`   Total duration: ${executionResult.executionResult.totalDuration}ms`)
    console.log(`   Requires feedback: ${executionResult.requiresUserFeedback}`)
    
    // Display step results
    console.log('\n📊 Step Results:')
    executionResult.executionResult.steps.forEach(step => {
      const status = step.success ? '✅' : '❌'
      console.log(`   ${status} Step ${step.stepOrder}: ${step.toolCalled || 'N/A'}`)
      if (step.error) {
        console.log(`      Error: ${step.error}`)
      }
      if (step.result) {
        const resultStr = JSON.stringify(step.result).substring(0, 100)
        console.log(`      Result: ${resultStr}${resultStr.length >= 100 ? '...' : ''}`)
      }
    })
    
    // Display questions if any
    if (executionResult.executionResult.questionsAsked.length > 0) {
      console.log('\n❓ Questions Asked:')
      executionResult.executionResult.questionsAsked.forEach(q => {
        console.log(`   [${q.priority.toUpperCase()}] ${q.category}`)
        console.log(`   ${q.question}`)
        console.log(`   Context: ${q.context.whatFailed}`)
      })
    }
    
    // Display adaptations if any
    if (executionResult.executionResult.adaptations.length > 0) {
      console.log('\n🔄 Adaptations Made:')
      executionResult.executionResult.adaptations.forEach(a => {
        console.log(`   Step ${a.stepId}: ${a.originalAction} → ${a.adaptedAction}`)
        console.log(`   Reason: ${a.reason}`)
      })
    }
    
    // === PHASE 3: Test user feedback (if questions were asked) ===
    if (executionResult.requiresUserFeedback && executionResult.executionResult.questionsAsked.length > 0) {
      console.log('\n\n💬 PHASE 3: Testing user feedback...')
      console.log('='.repeat(80))
      
      // Provide answers to questions
      const userFeedback = executionResult.executionResult.questionsAsked.map(q => ({
        questionId: q.id,
        answer: `Test answer for ${q.category} question`,
      }))
      
      console.log(`📝 Providing feedback for ${userFeedback.length} question(s)...`)
      
      const resumeResponse = await fetch(`${BASE_URL}/api/agents/executor-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestContext: executionResult.requestContext,
          userQuery,
          userFeedback,
        }),
      })
      
      if (resumeResponse.ok) {
        const resumedExecution = await resumeResponse.json()
        console.log('✅ Execution resumed')
        console.log(`   Overall success: ${resumedExecution.executionResult.overallSuccess}`)
        console.log(`   Version: ${resumedExecution.executionVersion}`)
      } else {
        const error = await resumeResponse.json()
        console.log(`⚠️  Resume failed: ${error.error}`)
      }
    }
    
    // === PHASE 4: Test version retrieval ===
    console.log('\n\n📚 PHASE 4: Testing version retrieval...')
    console.log('='.repeat(80))
    
    const versionsResponse = await fetch(
      `${BASE_URL}/api/agents/executor-agent/versions/${requestId}`
    )
    
    if (versionsResponse.ok) {
      const versions = await versionsResponse.json()
      console.log(`✅ Retrieved ${versions.length} execution version(s)`)
      versions.forEach((v, idx) => {
        console.log(`   Version ${v.executionVersion || idx + 1}: ${v.executionResult.overallSuccess ? 'Success' : 'Partial/Failed'}`)
      })
    } else {
      const error = await versionsResponse.json()
      console.log(`⚠️  Version retrieval failed: ${error.error}`)
    }
    
    console.log('\n' + '='.repeat(80))
    console.log('✅ End-to-End Test Completed Successfully!')
    console.log('='.repeat(80))
    
  } catch (error) {
    console.error('\n❌ Test Failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run the test
testExecutorEndToEnd().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})


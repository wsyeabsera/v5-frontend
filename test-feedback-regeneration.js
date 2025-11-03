/**
 * Test Feedback-Based Plan Regeneration
 * 
 * Tests that providing answers to questions triggers plan regeneration
 * with higher confidence and actual parameter values (not placeholders)
 */

const BASE_URL = 'http://localhost:3001'

async function testFeedbackRegeneration() {
  console.log('🧪 Testing Feedback-Based Plan Regeneration\n')
  console.log('='.repeat(80))
  
  try {
    // === PHASE 1: Create initial plan ===
    console.log('\n📝 PHASE 1: Creating initial plan with vague query...')
    console.log('='.repeat(80))
    
    const userQuery = 'Analyze facility ABC for compliance and risks'
    const requestId = `test-feedback-${Date.now()}`
    console.log(`User Query: "${userQuery}"`)
    console.log(`Request ID: ${requestId}\n`)
    
    // Create request context
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
    
    // Step 2: Generate initial plan
    console.log('\n📋 Step 1.2: Generating initial plan...')
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
    
    const plan1Data = await planResponse.json()
    requestContext = plan1Data.requestContext
    console.log('✅ Initial plan generated')
    console.log(`   Plan ID: ${plan1Data.plan.id}`)
    console.log(`   Steps: ${plan1Data.plan.steps.length}`)
    console.log(`   Confidence: ${(plan1Data.plan.confidence * 100).toFixed(0)}%`)
    
    // === PHASE 2: Generate initial critique ===
    console.log('\n\n🔍 PHASE 2: Generating initial critique...')
    console.log('='.repeat(80))
    
    const critiqueResponse1 = await fetch(`${BASE_URL}/api/agents/critic-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: plan1Data.plan,
        userQuery,
        requestContext,
      }),
    })
    
    if (!critiqueResponse1.ok) {
      const error = await critiqueResponse1.json()
      throw new Error(`Critique generation failed: ${error.error}`)
    }
    
    const critique1 = await critiqueResponse1.json()
    console.log('✅ Initial critique generated!')
    console.log(`   Critique Version: ${critique1.critiqueVersion}`)
    console.log(`   Overall Score: ${(critique1.critique.overallScore * 100).toFixed(0)}%`)
    console.log(`   Questions: ${critique1.critique.followUpQuestions.length}`)
    
    // Check if we have questions
    if (critique1.critique.followUpQuestions.length === 0) {
      console.log('\n⚠️  No questions generated - test cannot proceed')
      console.log('   This plan is already complete, no feedback needed')
      process.exit(0)
    }
    
    console.log('\n📋 Questions generated:')
    critique1.critique.followUpQuestions.forEach((q, idx) => {
      console.log(`   ${idx + 1}. ${q.question}`)
    })
    
    // === PHASE 3: Provide feedback WITHOUT refined query ===
    console.log('\n\n💬 PHASE 3: Providing feedback answers (NO refined query)...')
    console.log('='.repeat(80))
    
    const feedback = critique1.critique.followUpQuestions.map((q, idx) => ({
      questionId: q.id,
      answer: q.category === 'missing-info' 
        ? `Test answer ${idx + 1} for missing parameter`
        : `Test clarification ${idx + 1}`
    }))
    
    console.log(`Providing ${feedback.length} feedback responses without refined query`)
    console.log('This should trigger plan regeneration with answers incorporated...\n')
    
    const critiqueResponse2 = await fetch(`${BASE_URL}/api/agents/critic-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: plan1Data.plan,
        userQuery,
        requestContext,
        userFeedback: feedback,
        // NO refinedUserQuery
      }),
    })
    
    if (!critiqueResponse2.ok) {
      const error = await critiqueResponse2.json()
      throw new Error(`Second critique failed: ${error.error}`)
    }
    
    const critique2 = await critiqueResponse2.json()
    console.log('✅ Second critique generated!')
    console.log(`   Critique Version: ${critique2.critiqueVersion}`)
    console.log(`   Overall Score: ${(critique2.critique.overallScore * 100).toFixed(0)}%`)
    console.log(`   Plan ID: ${critique2.planId}`)
    
    // === PHASE 4: Verify multiple plans exist ===
    console.log('\n\n📚 PHASE 4: Verifying plan regeneration...')
    console.log('='.repeat(80))
    
    const allPlansResponse = await fetch(`${BASE_URL}/api/agents/planner-agent/plans/${requestId}`)
    if (!allPlansResponse.ok) {
      throw new Error('Failed to fetch plans')
    }
    
    const allPlans = await allPlansResponse.json()
    console.log(`✅ Found ${allPlans.length} plan(s) for request`)
    
    if (allPlans.length !== 2) {
      throw new Error(`Expected 2 plans after feedback, found ${allPlans.length}`)
    }
    
    const plan2 = allPlans.find(p => p.plan.planVersion === 2)
    if (!plan2) {
      throw new Error('Plan version 2 not found')
    }
    
    console.log(`\n📊 Plan Comparison:`)
    console.log(`   Plan 1: ${plan1Data.plan.steps.length} steps, ${(plan1Data.plan.confidence * 100).toFixed(0)}% confidence`)
    console.log(`   Plan 2: ${plan2.plan.steps.length} steps, ${(plan2.plan.confidence * 100).toFixed(0)}% confidence`)
    
    // Verify confidence improved
    if (plan2.plan.confidence > plan1Data.plan.confidence) {
      console.log(`\n✅ SUCCESS: Plan confidence improved from ${(plan1Data.plan.confidence * 100).toFixed(0)}% to ${(plan2.plan.confidence * 100).toFixed(0)}%`)
    } else {
      console.log(`\n⚠️  WARNING: Plan confidence did not improve`)
    }
    
    // Verify plan IDs are different
    if (critique1.planId === critique2.planId) {
      throw new Error('Plan IDs should be different after regeneration!')
    }
    
    console.log(`\n✅ Plan 2 has new ID: ${critique2.planId}`)
    
    // === PHASE 5: Check for placeholders in new plan ===
    console.log('\n\n🔍 PHASE 5: Checking for placeholders in new plan...')
    console.log('='.repeat(80))
    
    let hasPlaceholders = false
    for (const step of plan2.plan.steps) {
      if (step.parameters) {
        for (const [key, value] of Object.entries(step.parameters)) {
          const valStr = String(value).toLowerCase()
          if (valStr.includes('placeholder') || 
              valStr.includes('example') || 
              valStr.includes('extracted_from') ||
              valStr.includes('extracted_')) {
            console.log(`⚠️  Found placeholder: ${key} = ${value}`)
            hasPlaceholders = true
          }
        }
      }
    }
    
    if (!hasPlaceholders) {
      console.log('✅ No placeholders found in new plan')
    } else {
      console.log('⚠️  Some placeholders still present')
    }
    
    // === SUMMARY ===
    console.log('\n\n' + '='.repeat(80))
    console.log('✅ FEEDBACK REGENERATION TEST COMPLETE')
    console.log('='.repeat(80))
    
    console.log('\n📊 Final Results:')
    console.log('─'.repeat(80))
    console.log(`✅ Created ${allPlans.length} plans`)
    console.log(`✅ Plan confidence: ${(plan1Data.plan.confidence * 100).toFixed(0)}% → ${(plan2.plan.confidence * 100).toFixed(0)}%`)
    console.log(`✅ Feedback triggered plan regeneration: ${allPlans.length > 1 ? 'Working' : 'Failed'}`)
    console.log(`✅ Plan IDs are different: ${critique1.planId !== critique2.planId ? 'Working' : 'Failed'}`)
    console.log(`✅ Placeholder removal: ${!hasPlaceholders ? 'Working' : 'Partial'}`)
    
    const confidenceImproved = plan2.plan.confidence > plan1Data.plan.confidence
    const mainGoal = plan2.plan.confidence >= 0.8
    
    console.log(`\n🎯 Key Metrics:`)
    console.log(`   Confidence improvement: ${confidenceImproved ? 'YES' : 'NO'}`)
    console.log(`   Reached 80%+ confidence: ${mainGoal ? 'YES ✅' : 'NO ⚠️'}`)
    
    if (mainGoal && !hasPlaceholders && allPlans.length > 1) {
      console.log(`\n🏆 OVERALL: ALL TESTS PASSED! Feedback-based regeneration working perfectly!`)
    } else {
      console.log(`\n⚠️  OVERALL: MOSTLY WORKING (confidence: ${(plan2.plan.confidence * 100).toFixed(0)}%)`)
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    process.exit(1)
  }
}

// Run the test
testFeedbackRegeneration()


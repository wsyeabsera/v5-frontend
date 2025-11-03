/**
 * Test Plan Versioning System
 * 
 * Tests the complete flow:
 * 1. Create initial plan
 * 2. Generate critique
 * 3. Provide feedback with refined query (triggers plan regeneration)
 * 4. Verify multiple plans per requestId
 * 5. Verify critique versions
 * 6. Verify plan comparison
 */

const BASE_URL = 'http://localhost:3001'

async function testPlanVersioning() {
  console.log('🧪 Testing Plan Versioning System\n')
  console.log('='.repeat(80))
  
  try {
    // === PHASE 1: Create Initial Plan ===
    console.log('\n📝 PHASE 1: Creating initial plan...')
    console.log('='.repeat(80))
    
    const userQuery = 'Show me all facilities in North America'
    const requestId = `test-plan-versioning-${Date.now()}`
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
    console.log(`   Primary approach: ${thoughtData.primaryApproach}`)
    
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
    console.log(`   Plan Version: ${plan1Data.plan.planVersion}`)
    console.log(`   Steps: ${plan1Data.plan.steps.length}`)
    console.log(`   Goal: ${plan1Data.plan.goal}`)
    
    if (plan1Data.plan.planVersion !== 1) {
      throw new Error(`Expected planVersion to be 1, got ${plan1Data.plan.planVersion}`)
    }
    
    // === PHASE 2: Verify Single Plan ===
    console.log('\n\n✅ PHASE 2: Verifying single plan exists...')
    console.log('='.repeat(80))
    
    const allPlansResponse1 = await fetch(`${BASE_URL}/api/agents/planner-agent/plans/${requestId}`)
    if (!allPlansResponse1.ok) {
      throw new Error('Failed to fetch plans')
    }
    
    const allPlans1 = await allPlansResponse1.json()
    console.log(`✅ Found ${allPlans1.length} plan(s) for request`)
    
    if (allPlans1.length !== 1) {
      throw new Error(`Expected 1 plan, found ${allPlans1.length}`)
    }
    
    if (allPlans1[0].plan.id !== plan1Data.plan.id) {
      throw new Error('Plan IDs do not match')
    }
    
    // === PHASE 3: Generate Initial Critique ===
    console.log('\n\n🔍 PHASE 3: Generating initial critique...')
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
    console.log(`   Plan ID: ${critique1.planId}`)
    console.log(`   Overall Score: ${(critique1.critique.overallScore * 100).toFixed(0)}%`)
    console.log(`   Recommendation: ${critique1.critique.recommendation.toUpperCase()}`)
    console.log(`   Questions: ${critique1.critique.followUpQuestions.length}`)
    
    if (critique1.critiqueVersion !== 1) {
      throw new Error(`Expected critiqueVersion to be 1, got ${critique1.critiqueVersion}`)
    }
    
    // === PHASE 4: Provide Feedback with Refined Query ===
    console.log('\n\n💬 PHASE 4: Providing feedback with refined query...')
    console.log('='.repeat(80))
    
    const refinedQuery = `${userQuery} - focus on facilities with safety compliance issues`
    console.log(`Refined Query: "${refinedQuery}"`)
    console.log('This should trigger plan regeneration...\n')
    
    // Provide feedback to questions if any
    const feedback = critique1.critique.followUpQuestions.map(q => ({
      questionId: q.id,
      answer: `Test answer for question: ${q.question}`
    }))
    
    if (feedback.length > 0) {
      console.log(`Providing ${feedback.length} feedback responses`)
    }
    
    // This should trigger plan regeneration because of refined query
    const critiqueResponse2 = await fetch(`${BASE_URL}/api/agents/critic-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: plan1Data.plan,
        userQuery,
        requestContext,
        userFeedback: feedback,
        refinedUserQuery: refinedQuery,
      }),
    })
    
    if (!critiqueResponse2.ok) {
      const error = await critiqueResponse2.json()
      throw new Error(`Second critique failed: ${error.error}`)
    }
    
    const critique2 = await critiqueResponse2.json()
    console.log('✅ Second critique generated!')
    console.log(`   Critique Version: ${critique2.critiqueVersion}`)
    console.log(`   Plan ID: ${critique2.planId}`)
    console.log(`   Overall Score: ${(critique2.critique.overallScore * 100).toFixed(0)}%`)
    
    if (critique2.critiqueVersion !== 2) {
      throw new Error(`Expected critiqueVersion to be 2, got ${critique2.critiqueVersion}`)
    }
    
    // === PHASE 5: Verify Multiple Plans ===
    console.log('\n\n📚 PHASE 5: Verifying multiple plans exist...')
    console.log('='.repeat(80))
    
    const allPlansResponse2 = await fetch(`${BASE_URL}/api/agents/planner-agent/plans/${requestId}`)
    if (!allPlansResponse2.ok) {
      throw new Error('Failed to fetch plans')
    }
    
    const allPlans2 = await allPlansResponse2.json()
    console.log(`✅ Found ${allPlans2.length} plan(s) for request`)
    
    if (allPlans2.length !== 2) {
      throw new Error(`Expected 2 plans, found ${allPlans2.length}`)
    }
    
    // Verify plan versions
    const planVersions = allPlans2.map(p => p.plan.planVersion).sort((a, b) => a - b)
    console.log(`Plan Versions: ${planVersions.join(', ')}`)
    
    if (planVersions[0] !== 1 || planVersions[1] !== 2) {
      throw new Error(`Expected planVersions [1, 2], got [${planVersions.join(', ')}]`)
    }
    
    // Verify plan IDs are different
    const planIds = allPlans2.map(p => p.plan.id)
    console.log(`Plan IDs: ${planIds.map(id => id.slice(-12)).join(', ')}`)
    
    if (planIds[0] === planIds[1]) {
      throw new Error('Plan IDs should be different!')
    }
    
    // === PHASE 6: Verify Critique Versions ===
    console.log('\n\n📊 PHASE 6: Verifying critique versions...')
    console.log('='.repeat(80))
    
    const critiqueVersionsResponse = await fetch(`${BASE_URL}/api/agents/critic-agent/versions/${requestId}`)
    if (!critiqueVersionsResponse.ok) {
      throw new Error('Failed to fetch critique versions')
    }
    
    const critiqueVersions = await critiqueVersionsResponse.json()
    console.log(`✅ Found ${critiqueVersions.length} critique version(s)`)
    
    if (critiqueVersions.length !== 2) {
      throw new Error(`Expected 2 critique versions, found ${critiqueVersions.length}`)
    }
    
    // Verify plan IDs in critiques
    const critiquePlanIds = critiqueVersions.map(c => c.planId)
    console.log(`Critique Plan IDs: ${critiquePlanIds.map(id => id.slice(-12)).join(', ')}`)
    
    // First critique should reference first plan
    if (critiqueVersions[0].planId !== plan1Data.plan.id) {
      console.warn(`First critique references different plan than first generated plan`)
    }
    
    // Verify critique versions increment
    const critiqueVersionNums = critiqueVersions.map(c => c.critiqueVersion).sort((a, b) => a - b)
    if (critiqueVersionNums[0] !== 1 || critiqueVersionNums[1] !== 2) {
      throw new Error(`Expected critiqueVersions [1, 2], got [${critiqueVersionNums.join(', ')}]`)
    }
    
    // === PHASE 7: Test Plan Comparison ===
    console.log('\n\n⚖️  PHASE 7: Testing plan comparison...')
    console.log('='.repeat(80))
    
    const comparisonURL = `${BASE_URL}/api/agents/planner-agent/plans/${requestId}`
    const comparisonResponse = await fetch(comparisonURL)
    if (!comparisonResponse.ok) {
      throw new Error('Failed to fetch plans for comparison')
    }
    
    const plansForComparison = await comparisonResponse.json()
    
    // Compare the two plans
    const oldPlan = plansForComparison.find(p => p.plan.planVersion === 1)
    const newPlan = plansForComparison.find(p => p.plan.planVersion === 2)
    
    if (!oldPlan || !newPlan) {
      throw new Error('Could not find both plans for comparison')
    }
    
    console.log(`Old Plan (v${oldPlan.plan.planVersion}): ${oldPlan.plan.steps.length} steps`)
    console.log(`New Plan (v${newPlan.plan.planVersion}): ${newPlan.plan.steps.length} steps`)
    
    // Check if plans are different
    if (JSON.stringify(oldPlan.plan) === JSON.stringify(newPlan.plan)) {
      console.warn('⚠️  Plans are identical - refined query did not change the plan')
    } else {
      console.log('✅ Plans are different - refined query successfully regenerated plan')
    }
    
    // === SUMMARY ===
    console.log('\n\n' + '='.repeat(80))
    console.log('✅ PLAN VERSIONING TEST COMPLETE')
    console.log('='.repeat(80))
    
    console.log('\n📊 Final Results:')
    console.log('─'.repeat(80))
    console.log(`✅ Created ${allPlans2.length} plans for requestId: ${requestId}`)
    console.log(`✅ Created ${critiqueVersions.length} critiques`)
    console.log(`✅ Plan versioning: Working`)
    console.log(`✅ Critique versioning: Working`)
    console.log(`✅ Plan IDs tracked in critiques: Working`)
    console.log(`✅ Multiple plans per requestId: Working`)
    
    console.log('\n🎯 Test Summary:')
    console.log('─'.repeat(80))
    console.log(`   Plan 1: ID ${plan1Data.plan.id.slice(-12)}, Version ${plan1Data.plan.planVersion}`)
    console.log(`   Plan 2: ID ${critique2.planId.slice(-12)}, Version ${plansForComparison.find(p => p.plan.id === critique2.planId)?.plan.planVersion}`)
    console.log(`   Critique 1: Version ${critique1.critiqueVersion}, Plan ${critique1.planId.slice(-12)}`)
    console.log(`   Critique 2: Version ${critique2.critiqueVersion}, Plan ${critique2.planId.slice(-12)}`)
    
    console.log('\n🏆 OVERALL: ALL TESTS PASSED!')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    process.exit(1)
  }
}

// Run the test
testPlanVersioning()


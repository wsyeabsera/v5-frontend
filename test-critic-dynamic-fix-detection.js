/**
 * Test Critic Dynamic Fix Detection
 * 
 * Tests canBeFixedDynamically() logic with various plan patterns:
 * - list → get (should detect)
 * - search → get (should detect)
 * - create → update (should not detect - different pattern)
 * 
 * Verifies recommendation changes correctly
 */

const BASE_URL = 'http://localhost:3001'

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function testCriticDynamicFixDetection() {
  console.log('\n🧪 Testing Critic Dynamic Fix Detection')
  console.log('='.repeat(80))

  const testCases = [
    {
      name: 'List → Get Pattern (Should Detect)',
      userQuery: 'get me details of facility hannover',
      expectedRecommendation: 'approve-with-dynamic-fix',
      description: 'Step 1 lists facilities, Step 2 gets details - should detect dynamic fix',
    },
    {
      name: 'Search → Get Pattern (Should Detect)',
      userQuery: 'find facility in berlin and get its details',
      expectedRecommendation: 'approve-with-dynamic-fix',
      description: 'Step 1 searches, Step 2 gets - should detect dynamic fix',
    },
    {
      name: 'Simple List (No Dynamic Fix Needed)',
      userQuery: 'list all facilities',
      expectedRecommendation: 'approve',
      description: 'Single step - no dynamic fix needed',
    },
  ]

  const results = []

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`📋 TEST CASE: ${testCase.name}`)
    console.log(`   Query: "${testCase.userQuery}"`)
    console.log(`   Expected: ${testCase.expectedRecommendation}`)
    console.log('='.repeat(80))

    try {
      // Create request
      const requestId = `test-critic-dynamic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      let requestContext = {
        requestId,
        createdAt: new Date(),
        agentChain: [],
        status: 'pending',
        userQuery: testCase.userQuery,
      }

      // Generate thoughts
      console.log('\n💭 Generating thoughts...')
      const thoughtResponse = await fetch(`${BASE_URL}/api/agents/thought-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userQuery: testCase.userQuery, 
          requestContext 
        }),
      })
      
      if (!thoughtResponse.ok) {
        const error = await thoughtResponse.json()
        throw new Error(`Thought generation failed: ${error.error}`)
      }
      
      const thoughtData = await thoughtResponse.json()
      requestContext = thoughtData.requestContext
      console.log('✅ Thoughts generated')

      // Generate plan
      console.log('\n📋 Generating plan...')
      const planResponse = await fetch(`${BASE_URL}/api/agents/planner-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thoughts: thoughtData.thoughts,
          userQuery: testCase.userQuery,
          requestContext,
        }),
      })
      
      if (!planResponse.ok) {
        const error = await planResponse.json()
        throw new Error(`Plan generation failed: ${error.error}`)
      }
      
      const planData = await planResponse.json()
      requestContext = planData.requestContext
      
      console.log(`✅ Plan generated (${planData.plan.steps.length} steps)`)
      planData.plan.steps.forEach((step, idx) => {
        console.log(`   Step ${step.order}: ${step.action}`)
      })

      // Generate critique
      console.log('\n🛡️  Generating critique...')
      const critiqueResponse = await fetch(`${BASE_URL}/api/agents/critic-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planData.plan,
          userQuery: testCase.userQuery,
          requestContext,
        }),
      })
      
      if (!critiqueResponse.ok) {
        const error = await critiqueResponse.json()
        throw new Error(`Critique generation failed: ${error.error}`)
      }
      
      const critique = await critiqueResponse.json()
      
      console.log(`✅ Critique generated`)
      console.log(`   Recommendation: ${critique.critique.recommendation}`)
      console.log(`   Score: ${(critique.critique.overallScore * 100).toFixed(1)}%`)
      console.log(`   Rationale: ${critique.critique.rationale}`)
      
      if (critique.critique.issues.length > 0) {
        console.log(`   Issues: ${critique.critique.issues.length}`)
        critique.critique.issues.forEach((issue, idx) => {
          console.log(`      ${idx + 1}. [${issue.severity}] ${issue.description}`)
        })
      }

      // Verify recommendation
      const actualRecommendation = critique.critique.recommendation
      const passed = actualRecommendation === testCase.expectedRecommendation
      
      console.log(`\n${passed ? '✅' : '❌'} Recommendation Check:`)
      console.log(`   Expected: ${testCase.expectedRecommendation}`)
      console.log(`   Actual: ${actualRecommendation}`)
      
      if (!passed) {
        console.log(`   ⚠️  Recommendation mismatch!`)
        if (testCase.expectedRecommendation === 'approve-with-dynamic-fix' && 
            actualRecommendation === 'reject') {
          console.log(`   ⚠️  Critic rejected plan instead of detecting dynamic fix`)
        }
      }

      results.push({
        name: testCase.name,
        passed,
        expected: testCase.expectedRecommendation,
        actual: actualRecommendation,
        rationale: critique.critique.rationale,
      })

      // Small delay between tests
      await sleep(1000)

    } catch (error) {
      console.error(`\n❌ Test case failed: ${error.message}`)
      console.error(error.stack)
      results.push({
        name: testCase.name,
        passed: false,
        error: error.message,
      })
    }
  }

  // Summary
  console.log(`\n${'='.repeat(80)}`)
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(80))
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌'
    console.log(`${icon} ${result.name}`)
    if (!result.passed && result.actual) {
      console.log(`      Expected: ${result.expected}, Got: ${result.actual}`)
    }
    if (result.rationale) {
      console.log(`      Rationale: ${result.rationale.substring(0, 100)}...`)
    }
  })
  
  const passed = results.filter(r => r.passed).length
  const total = results.length
  
  console.log(`\nTotal: ${total} test cases`)
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${total - passed}`)
  
  return passed === total
}

// Run the test
if (require.main === module) {
  testCriticDynamicFixDetection()
    .then(passed => {
      process.exit(passed ? 0 : 1)
    })
    .catch(error => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

module.exports = { testCriticDynamicFixDetection }


/**
 * Test Critic Agent API
 */

const BASE_URL = 'http://localhost:3001'

async function testCriticAgent() {
  console.log('🧪 Testing Critic Agent API\n')
  console.log('='.repeat(70))
  
  try {
    // First, get planner history to find a plan
    console.log('\n📋 Fetching Planner Agent History...')
    const plannerHistoryResponse = await fetch(`${BASE_URL}/api/agents/planner-agent/history`)
    
    if (!plannerHistoryResponse.ok) {
      const error = await plannerHistoryResponse.json()
      console.log('❌ Failed to fetch planner history:', error.error)
      return
    }
    
    const plans = await plannerHistoryResponse.json()
    console.log(`✅ Found ${plans.length} plan(s) in history\n`)
    
    if (plans.length === 0) {
      console.log('⚠️  No plans found. Please generate a plan first.')
      console.log('    Run: node test-planner.js')
      return
    }
    
    // Use the most recent plan
    const plan = plans[0]
    console.log('='.repeat(70))
    console.log('📊 Testing Critic Agent on Plan:', plan.requestId)
    console.log('='.repeat(70))
    
    console.log(`\n🎯 Plan Goal: ${plan.plan.goal}`)
    console.log(`📝 Steps: ${plan.plan.steps.length}`)
    
    // Test critique generation
    console.log('\n\n🧪 Testing Critique Generation...')
    const critiqueResponse = await fetch(`${BASE_URL}/api/agents/critic-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan: plan.plan,
        userQuery: plan.requestContext?.userQuery || plan.plan.goal,
        requestContext: plan.requestContext,
      }),
    })
    
    if (!critiqueResponse.ok) {
      const error = await critiqueResponse.json()
      console.log('❌ Failed to generate critique:', error.error)
      return
    }
    
    const critique = await critiqueResponse.json()
    console.log('✅ Critique generated successfully!')
    
    console.log('\n' + '='.repeat(70))
    console.log('📊 Critique Results')
    console.log('='.repeat(70))
    
    console.log(`\n🎯 Overall Score: ${(critique.critique.overallScore * 100).toFixed(0)}%`)
    console.log(`📊 Feasibility: ${(critique.critique.feasibilityScore * 100).toFixed(0)}%`)
    console.log(`✓ Correctness: ${(critique.critique.correctnessScore * 100).toFixed(0)}%`)
    console.log(`⚡ Efficiency: ${(critique.critique.efficiencyScore * 100).toFixed(0)}%`)
    console.log(`🛡️  Safety: ${(critique.critique.safetyScore * 100).toFixed(0)}%`)
    
    console.log(`\n💡 Recommendation: ${critique.critique.recommendation.toUpperCase()}`)
    
    if (critique.critique.issues && critique.critique.issues.length > 0) {
      console.log(`\n⚠️  Issues: ${critique.critique.issues.length}`)
      critique.critique.issues.forEach((issue, idx) => {
        console.log(`\n${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.category}`)
        console.log(`   ${issue.description}`)
        console.log(`   💡 ${issue.suggestion}`)
      })
    }
    
    if (critique.critique.followUpQuestions && critique.critique.followUpQuestions.length > 0) {
      console.log(`\n❓ Follow-Up Questions: ${critique.critique.followUpQuestions.length}`)
      critique.critique.followUpQuestions.forEach((q, idx) => {
        console.log(`\n${idx + 1}. [${q.priority.toUpperCase()}] ${q.question}`)
      })
    }
    
    if (critique.critique.strengths && critique.critique.strengths.length > 0) {
      console.log(`\n✅ Strengths:`)
      critique.critique.strengths.forEach((strength, idx) => {
        console.log(`   ${idx + 1}. ${strength}`)
      })
    }
    
    if (critique.critique.suggestions && critique.critique.suggestions.length > 0) {
      console.log(`\n💡 Suggestions:`)
      critique.critique.suggestions.forEach((suggestion, idx) => {
        console.log(`   ${idx + 1}. ${suggestion}`)
      })
    }
    
    console.log(`\n📝 Rationale:`)
    console.log(`   ${critique.critique.rationale}`)
    
    // Test history API
    console.log('\n\n🧪 Testing History API...')
    const historyResponse = await fetch(`${BASE_URL}/api/agents/critic-agent/history`)
    
    if (!historyResponse.ok) {
      const error = await historyResponse.json()
      console.log('❌ Failed to fetch history:', error.error)
      return
    }
    
    const history = await historyResponse.json()
    console.log(`✅ Found ${history.length} critique(s) in history`)
    
    // Test GET by requestId
    console.log('\n\n🧪 Testing GET by requestId...')
    const getResponse = await fetch(`${BASE_URL}/api/agents/critic-agent?requestId=${critique.requestId}`)
    
    if (!getResponse.ok) {
      const error = await getResponse.json()
      console.log('❌ Failed to fetch critique by requestId:', error.error)
      return
    }
    
    const getCritique = await getResponse.json()
    console.log('✅ Successfully fetched critique by requestId')
    console.log(`   Request ID: ${getCritique.requestId}`)
    console.log(`   Plan ID: ${getCritique.planId}`)
    
    console.log('\n' + '='.repeat(70))
    console.log('✅ All Critic Agent API tests passed!')
    console.log('='.repeat(70))
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
  }
}

// Run tests
testCriticAgent()


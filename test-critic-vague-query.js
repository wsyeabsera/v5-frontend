/**
 * Test Critic Agent with a deliberately vague query
 * 
 * Creates a plan from a vague query that should trigger intelligent questions
 */

const BASE_URL = 'http://localhost:3001'

async function testVagueQuery() {
  console.log('🧪 Testing Critic Agent with Vague Query\n')
  console.log('='.repeat(70))
  
  try {
    // Generate a plan from a vague query
    console.log('\n📝 Step 1: Creating plan from vague query...')
    
    // First, get complexity detector config
    const complexityResponse = await fetch(`${BASE_URL}/api/agents/complexity-detector`)
    const complexityConfig = await complexityResponse.json()
    
    if (!complexityConfig || !complexityConfig.config) {
      console.log('❌ No complexity detector config found')
      return
    }
    
    console.log('✅ Found complexity detector config')
    
    // Skip complexity and go straight to thought agent with a vague query
    console.log('\n💭 Step 2: Generating thoughts for vague query...')
    console.log('Query: "Analyze facility" (intentionally vague)')
    
    // Create a request context
    const requestId = `test-vague-${Date.now()}`
    const requestContext = {
      requestId,
      createdAt: new Date(),
      agentChain: ['complexity-detector'],
      status: 'pending',
      userQuery: 'Analyze facility'
    }
    
    // Generate thoughts
    const thoughtResponse = await fetch(`${BASE_URL}/api/agents/thought-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userQuery: 'Analyze facility',
        requestContext,
      }),
    })
    
    if (!thoughtResponse.ok) {
      const error = await thoughtResponse.json()
      console.log('❌ Failed to generate thoughts:', error.error)
      return
    }
    
    const thoughtData = await thoughtResponse.json()
    console.log('✅ Generated thoughts')
    console.log(`   Primary approach: ${thoughtData.primaryApproach}`)
    
    // Generate plan
    console.log('\n📋 Step 3: Generating plan...')
    
    const planResponse = await fetch(`${BASE_URL}/api/agents/planner-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        thoughts: thoughtData.thoughts,
        userQuery: 'Analyze facility',
        requestContext: thoughtData.requestContext,
      }),
    })
    
    if (!planResponse.ok) {
      const error = await planResponse.json()
      console.log('❌ Failed to generate plan:', error.error)
      return
    }
    
    const planData = await planResponse.json()
    console.log('✅ Generated plan')
    console.log(`   Goal: ${planData.plan.goal}`)
    console.log(`   Steps: ${planData.plan.steps.length}`)
    console.log(`\n   Plan steps:`)
    planData.plan.steps.forEach((step) => {
      console.log(`   ${step.order}. ${step.description}`)
      console.log(`      Action: ${step.action}`)
      if (step.parameters) {
        console.log(`      Parameters: ${JSON.stringify(step.parameters)}`)
      }
    })
    
    // Critique the plan
    console.log('\n🔍 Step 4: Critiquing plan...')
    
    const critiqueResponse = await fetch(`${BASE_URL}/api/agents/critic-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan: planData.plan,
        userQuery: 'Analyze facility',
        requestContext: planData.requestContext,
      }),
    })
    
    if (!critiqueResponse.ok) {
      const error = await critiqueResponse.json()
      console.log('❌ Failed to generate critique:', error.error)
      return
    }
    
    const critique = await critiqueResponse.json()
    console.log('✅ Critique generated!')
    
    console.log(`\n🎯 Overall Score: ${(critique.critique.overallScore * 100).toFixed(0)}%`)
    console.log(`💡 Recommendation: ${critique.critique.recommendation.toUpperCase()}`)
    console.log(`📝 Follow-Up Questions: ${critique.critique.followUpQuestions.length}`)
    
    if (critique.critique.followUpQuestions.length > 0) {
      console.log('\n' + '='.repeat(70))
      console.log('❓ INTELLIGENT QUESTIONS:')
      console.log('='.repeat(70))
      
      critique.critique.followUpQuestions.forEach((q, idx) => {
        console.log(`\n${idx + 1}. [${q.priority.toUpperCase()}] ${q.category}`)
        console.log(`   ${q.question}`)
        
        // Check if question is specific
        const isSpecific = /step \d+|parameter|param|id|value|facility/i.test(q.question)
        console.log(`   Quality: ${isSpecific ? '✅ Specific' : '⚠️  Generic'}`)
      })
      
      // Calculate quality metrics
      const specificQuestions = critique.critique.followUpQuestions.filter(q => {
        return /step \d+|parameter|param|id|value|facility/i.test(q.question)
      })
      
      const qualityScore = (specificQuestions.length / critique.critique.followUpQuestions.length) * 100
      
      console.log('\n' + '='.repeat(70))
      console.log('📊 QUESTION QUALITY ANALYSIS:')
      console.log('='.repeat(70))
      console.log(`Total questions: ${critique.critique.followUpQuestions.length}`)
      console.log(`Specific questions: ${specificQuestions.length}`)
      console.log(`Quality score: ${qualityScore.toFixed(0)}%`)
      
      if (qualityScore >= 70) {
        console.log('✅ EXCELLENT: Most questions are specific and actionable!')
      } else if (qualityScore >= 50) {
        console.log('⚠️  MODERATE: Some questions are too generic')
      } else {
        console.log('❌ POOR: Questions are too generic and vague')
      }
      
      // Test if missing required parameters triggered questions
      const hasParamReferences = critique.critique.followUpQuestions.some(q => 
        /requires|parameter|param/i.test(q.question)
      )
      
      console.log(`\n🔗 Parameter validation: ${hasParamReferences ? '✅ Active' : '⚠️  Not visible'}`)
      
    } else {
      console.log('\n✅ No questions needed - plan is complete!')
    }
    
    // Show issues
    if (critique.critique.issues.length > 0) {
      console.log('\n⚠️  ISSUES FOUND:')
      critique.critique.issues.forEach((issue, idx) => {
        console.log(`\n${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.category}`)
        console.log(`   ${issue.description}`)
        console.log(`   💡 ${issue.suggestion}`)
      })
    }
    
    console.log('\n' + '='.repeat(70))
    console.log('✅ Vague Query Test Complete!')
    console.log('='.repeat(70))
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
  }
}

// Run test
testVagueQuery()


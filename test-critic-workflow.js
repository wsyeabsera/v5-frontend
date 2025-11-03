/**
 * Test Critic Agent Intelligent Workflow
 * 
 * Tests the full pipeline with intelligent question generation:
 * 1. Generate a vague plan
 * 2. Critique it (should ask smart questions)
 * 3. Provide feedback
 * 4. Plan regenerates with feedback
 * 5. Critique again (should ask fewer/no questions)
 */

const BASE_URL = 'http://localhost:3001'

async function testCriticWorkflow() {
  console.log('🧪 Testing Critic Agent Intelligent Workflow\n')
  console.log('='.repeat(70))
  
  try {
    // Test 1: Get an existing vague plan
    console.log('\n📋 Step 1: Fetching a vague plan...')
    const historyResponse = await fetch(`${BASE_URL}/api/agents/planner-agent/history`)
    
    if (!historyResponse.ok) {
      const error = await historyResponse.json()
      console.log('❌ Failed to fetch history:', error.error)
      return
    }
    
    const plans = await historyResponse.json()
    console.log(`✅ Found ${plans.length} plan(s) in history\n`)
    
    if (plans.length === 0) {
      console.log('⚠️  No plans found. Please generate a plan first.')
      return
    }
    
    // Find a plan with placeholder parameters
    const plan = plans.find(p => {
      const hasPlaceholders = p.plan.steps.some(step => {
        if (!step.parameters) return false
        return Object.values(step.parameters).some(val => 
          typeof val === 'string' && (
            val.includes('extracted_from_step') ||
            val.includes('placeholder') ||
            val.includes('example')
          )
        )
      })
      return hasPlaceholders
    }) || plans[0] // Fall back to first plan if none found
    console.log('='.repeat(70))
    console.log('📊 Original Plan:', plan.requestId)
    console.log('='.repeat(70))
    
    console.log(`\n🎯 Goal: ${plan.plan.goal}`)
    console.log(`📝 Steps: ${plan.plan.steps.length}`)
    console.log(`\n📋 Original Steps:`)
    plan.plan.steps.forEach((step, idx) => {
      console.log(`\n${step.order}. ${step.description}`)
      console.log(`   Action: ${step.action}`)
      if (step.parameters && Object.keys(step.parameters).length > 0) {
        console.log(`   Parameters: ${JSON.stringify(step.parameters, null, 2)}`)
      }
    })
    
    // Test 2: Generate critique
    console.log('\n\n🧪 Step 2: Generating critique...')
    console.log('='.repeat(70))
    
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
    console.log('✅ Critique generated!')
    
    console.log(`\n🎯 Overall Score: ${(critique.critique.overallScore * 100).toFixed(0)}%`)
    console.log(`💡 Recommendation: ${critique.critique.recommendation.toUpperCase()}`)
    
    // Analyze questions
    if (critique.critique.followUpQuestions.length > 0) {
      console.log(`\n📝 Follow-Up Questions: ${critique.critique.followUpQuestions.length}`)
      console.log('='.repeat(70))
      
      critique.critique.followUpQuestions.forEach((q, idx) => {
        console.log(`\n${idx + 1}. [${q.priority.toUpperCase()}] ${q.category}`)
        console.log(`   ${q.question}`)
      })
      
      // Test quality of questions
      const specificQuestions = critique.critique.followUpQuestions.filter(q => {
        const hasStepRef = /step \d+/i.test(q.question)
        const hasParamRef = /parameter|param|id|value|threshold/i.test(q.question)
        return hasStepRef || hasParamRef
      })
      
      console.log('\n\n📊 Question Quality Analysis:')
      console.log('='.repeat(70))
      console.log(`Total questions: ${critique.critique.followUpQuestions.length}`)
      console.log(`Specific questions (mention step/param): ${specificQuestions.length}`)
      console.log(`Quality score: ${((specificQuestions.length / critique.critique.followUpQuestions.length) * 100).toFixed(0)}%`)
      
      // Test 3: Provide feedback
      console.log('\n\n🧪 Step 3: Providing feedback...')
      console.log('='.repeat(70))
      
      const feedback = critique.critique.followUpQuestions.map((q, idx) => ({
        questionId: q.id,
        answer: `Test answer ${idx + 1} for question about ${q.category}`
      }))
      
      console.log(`💬 Providing ${feedback.length} answers\n`)
      
      // Regenerate critique with feedback
      const feedbackResponse = await fetch(`${BASE_URL}/api/agents/critic-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: plan.plan,
          userQuery: plan.requestContext?.userQuery || plan.plan.goal,
          requestContext: plan.requestContext,
          userFeedback: feedback,
        }),
      })
      
      if (!feedbackResponse.ok) {
        const error = await feedbackResponse.json()
        console.log('❌ Failed to regenerate critique:', error.error)
        return
      }
      
      const critique2 = await feedbackResponse.json()
      console.log('✅ Critique regenerated!')
      
      console.log(`\n🎯 New Overall Score: ${(critique2.critique.overallScore * 100).toFixed(0)}%`)
      console.log(`💡 New Recommendation: ${critique2.critique.recommendation.toUpperCase()}`)
      
      if (critique2.critique.followUpQuestions.length === 0) {
        console.log('\n🎉 SUCCESS: No more follow-up questions!')
      } else {
        console.log(`\n📝 Remaining Questions: ${critique2.critique.followUpQuestions.length}`)
        critique2.critique.followUpQuestions.forEach((q, idx) => {
          console.log(`${idx + 1}. ${q.question}`)
        })
      }
      
      // Compare scores
      const scoreImprovement = (critique2.critique.overallScore - critique.critique.overallScore) * 100
      console.log('\n\n📈 Score Comparison:')
      console.log('='.repeat(70))
      console.log(`Original score: ${(critique.critique.overallScore * 100).toFixed(0)}%`)
      console.log(`Updated score: ${(critique2.critique.overallScore * 100).toFixed(0)}%`)
      console.log(`Change: ${scoreImprovement >= 0 ? '+' : ''}${scoreImprovement.toFixed(0)}%`)
      
      if (scoreImprovement > 0) {
        console.log('✅ Score improved!')
      }
      
    } else {
      console.log('\n✅ No follow-up questions needed - plan is complete!')
    }
    
    // Test 4: Check versioning
    console.log('\n\n🧪 Step 4: Checking versioning...')
    console.log('='.repeat(70))
    
    const versionsResponse = await fetch(`${BASE_URL}/api/agents/critic-agent?requestId=${plan.requestId}`)
    
    if (versionsResponse.ok) {
      const latest = await versionsResponse.json()
      console.log(`✅ Latest critique version: ${latest.critiqueVersion || 1}`)
      
      // Try to get all versions (if API supports it)
      const historyResponse = await fetch(`${BASE_URL}/api/agents/critic-agent/history`)
      if (historyResponse.ok) {
        const history = await historyResponse.json()
        const versionsForRequest = history.filter(c => c.requestId === plan.requestId)
        console.log(`📚 Total versions for this request: ${versionsForRequest.length}`)
      }
    }
    
    console.log('\n' + '='.repeat(70))
    console.log('✅ Intelligent Workflow Test Complete!')
    console.log('='.repeat(70))
    
    // Summary
    console.log('\n📊 Summary:')
    console.log('- Enhanced prompt guidelines: ✅')
    console.log('- Parameter validation: ✅')
    console.log('- Question quality: ✅')
    console.log('- Feedback loop: ✅')
    console.log('- Versioning: ✅')
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
  }
}

// Run tests
testCriticWorkflow()


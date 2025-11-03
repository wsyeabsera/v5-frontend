/**
 * Comprehensive Test: Multiple Scenarios
 * 
 * Tests various combinations of real tools, hallucinated tools, and edge cases
 */

const BASE_URL = 'http://localhost:3001'

async function testComprehensive() {
  console.log('🧪 Comprehensive Tool Validation Test\n')
  console.log('='.repeat(80))
  
  const scenarios = [
    {
      name: 'Only Real Tools',
      query: 'List all facilities and get details for ABC',
      shouldHaveFalsePositives: false,
    },
    {
      name: 'Real Tools + Hallucinated',
      query: 'Show facilities in North America and analyze risks in parallel',
      shouldHaveFalsePositives: false,
      shouldHaveHallucinated: true,
    }
  ]
  
  let totalTests = 0
  let passedTests = 0
  let failedTests = []
  
  for (const scenario of scenarios) {
    totalTests++
    console.log(`\n\n📋 SCENARIO ${totalTests}: ${scenario.name}`)
    console.log('='.repeat(80))
    console.log(`Query: "${scenario.query}"`)
    
    try {
      // Create request context
      let requestContext = {
        requestId: `test-comprehensive-${Date.now()}-${totalTests}`,
        createdAt: new Date(),
        agentChain: [],
        status: 'pending',
        userQuery: scenario.query,
      }
      
      // Generate thoughts
      console.log('\n💭 Generating thoughts...')
      const thoughtResponse = await fetch(`${BASE_URL}/api/agents/thought-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userQuery: scenario.query, requestContext }),
      })
      
      if (!thoughtResponse.ok) throw new Error('Thought generation failed')
      const thoughtData = await thoughtResponse.json()
      requestContext = thoughtData.requestContext
      
      // Generate plan
      console.log('📋 Generating plan...')
      const planResponse = await fetch(`${BASE_URL}/api/agents/planner-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thoughts: thoughtData.thoughts,
          userQuery: scenario.query,
          requestContext,
        }),
      })
      
      if (!planResponse.ok) throw new Error('Plan generation failed')
      const planData = await planResponse.json()
      requestContext = planData.requestContext
      
      console.log(`✅ Plan: ${planData.plan.steps.length} steps`)
      planData.plan.steps.forEach(s => console.log(`   ${s.order}. ${s.action}`))
      
      // Generate critique
      console.log('\n🔍 Generating critique...')
      const critiqueResponse = await fetch(`${BASE_URL}/api/agents/critic-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planData.plan,
          userQuery: scenario.query,
          requestContext,
        }),
      })
      
      if (!critiqueResponse.ok) throw new Error('Critique generation failed')
      const critique = await critiqueResponse.json()
      
      console.log(`✅ Critique: ${critique.critique.issues.length} issues`)
      
      // Analyze results
      const realTools = ['list_facilities', 'get_facility', 'list_inspections', 
                        'list_contaminants', 'list_shipments', 'list_contracts',
                        'generate_intelligent_facility_report', 'analyze_shipment_risk',
                        'suggest_inspection_questions', 'create_facility', 'update_facility',
                        'delete_facility', 'create_contaminant', 'get_contaminant',
                        'list_contaminants', 'update_contaminant', 'delete_contaminant',
                        'create_inspection', 'get_inspection', 'update_inspection',
                        'delete_inspection', 'create_shipment', 'get_shipment',
                        'update_shipment', 'delete_shipment', 'create_contract',
                        'get_contract', 'list_contracts', 'update_contract', 'delete_contract']
      
      const feasibilityIssues = critique.critique.issues.filter(i => i.category === 'feasibility')
      const toolIssues = feasibilityIssues.filter(i => i.description.includes('tool'))
      
      const falsePositives = toolIssues.filter(issue => {
        return realTools.some(tool => issue.description.includes(tool))
      })
      
      const hallucinatedIssues = toolIssues.filter(issue => {
        const hallucinated = ['multi_tool_use', 'parallel', 'batch', 'async']
        return hallucinated.some(tag => issue.description.toLowerCase().includes(tag))
      })
      
      console.log(`\n📊 Analysis:`)
      console.log(`   Tool issues: ${toolIssues.length}`)
      console.log(`   False positives: ${falsePositives.length}`)
      console.log(`   Hallucinated: ${hallucinatedIssues.length}`)
      
      // Evaluate test
      let passed = true
      if (scenario.shouldHaveFalsePositives === false && falsePositives.length > 0) {
        console.log(`   ❌ FAIL: Expected no false positives, found ${falsePositives.length}`)
        failedTests.push(`${scenario.name}: Found false positives`)
        passed = false
      }
      
      if (scenario.shouldHaveHallucinated && hallucinatedIssues.length === 0) {
        console.log(`   ⚠️  WARN: Expected hallucinated tools, found none`)
      }
      
      if (passed) {
        console.log(`   ✅ PASS`)
        passedTests++
      }
      
    } catch (error) {
      console.error(`   ❌ ERROR: ${error.message}`)
      failedTests.push(`${scenario.name}: ${error.message}`)
    }
  }
  
  // Final report
  console.log('\n\n' + '='.repeat(80))
  console.log('📊 COMPREHENSIVE TEST RESULTS')
  console.log('='.repeat(80))
  console.log(`\nTotal Tests: ${totalTests}`)
  console.log(`Passed: ${passedTests}`)
  console.log(`Failed: ${failedTests.length}`)
  
  if (failedTests.length > 0) {
    console.log('\n❌ Failed Tests:')
    failedTests.forEach(f => console.log(`   - ${f}`))
    process.exit(1)
  } else {
    console.log('\n🎉 ALL TESTS PASSED! Tool validation is working perfectly!')
    process.exit(0)
  }
}

testComprehensive()


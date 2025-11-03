/**
 * Test Critic Agent Tool Validation Fix
 * 
 * Tests that the Critic Agent correctly validates tool availability
 * and no longer falsely reports real MCP tools as missing.
 */

const BASE_URL = 'http://localhost:3001'

async function testToolValidation() {
  console.log('🧪 Testing Critic Agent Tool Validation Fix\n')
  console.log('='.repeat(80))
  
  try {
    // === PHASE 1: Create a plan with known tools ===
    console.log('\n📝 PHASE 1: Creating plan with real MCP tools...')
    console.log('='.repeat(80))
    
    const userQuery = 'Analyze facility ABC for compliance and risks'
    const requestId = `test-tool-validation-${Date.now()}`
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
    console.log('💭 Step 1: Generating thoughts...')
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
    
    // Step 2: Generate plan
    console.log('\n📋 Step 2: Generating plan...')
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
    console.log(`   Plan ID: ${planData.plan.id}`)
    console.log(`   Steps: ${planData.plan.steps.length}`)
    
    console.log('\n📋 Plan Steps:')
    planData.plan.steps.forEach(step => {
      console.log(`   ${step.order}. ${step.description}`)
      console.log(`      Tool: ${step.action}`)
    })
    
    // === PHASE 2: Generate critique ===
    console.log('\n\n🔍 PHASE 2: Generating critique...')
    console.log('='.repeat(80))
    
    const critiqueResponse = await fetch(`${BASE_URL}/api/agents/critic-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: planData.plan,
        userQuery,
        requestContext,
      }),
    })
    
    if (!critiqueResponse.ok) {
      const error = await critiqueResponse.json()
      throw new Error(`Critique generation failed: ${error.error}`)
    }
    
    const critique = await critiqueResponse.json()
    console.log('✅ Critique generated!')
    console.log(`   Critique Version: ${critique.critiqueVersion}`)
    console.log(`   Overall Score: ${(critique.critique.overallScore * 100).toFixed(0)}%`)
    console.log(`   Issues: ${critique.critique.issues.length}`)
    console.log(`   Questions: ${critique.critique.followUpQuestions.length}`)
    
    // === PHASE 3: Analyze issues ===
    console.log('\n\n📊 PHASE 3: Analyzing issues found...')
    console.log('='.repeat(80))
    
    if (critique.critique.issues.length === 0) {
      console.log('✅ No issues found - plan is perfect!')
    } else {
      console.log(`Found ${critique.critique.issues.length} issue(s):\n`)
      
      const feasibilityIssues = critique.critique.issues.filter(i => i.category === 'feasibility')
      const toolIssues = feasibilityIssues.filter(i => i.description.includes('tool'))
      
      console.log('Tool-related feasibility issues:')
      if (toolIssues.length === 0) {
        console.log('   ✅ NO FALSE POSITIVES! All tool issues are valid.')
      } else {
        console.log(`   ⚠️  Found ${toolIssues.length} tool-related issues:`)
        toolIssues.forEach((issue, idx) => {
          console.log(`   ${idx + 1}. [${issue.severity}] ${issue.description}`)
          console.log(`      Suggestion: ${issue.suggestion}`)
        })
      }
      
      // Check for known real tools being flagged as missing
      const realTools = ['list_facilities', 'analyze_shipment_risk', 'generate_intelligent_facility_report', 'get_facility', 'list_inspections', 'list_contaminants']
      const falsePositives = toolIssues.filter(issue => {
        return realTools.some(tool => issue.description.includes(tool))
      })
      
      console.log('\n🎯 False Positive Check:')
      if (falsePositives.length === 0) {
        console.log('   ✅ NO FALSE POSITIVES! Real tools are correctly validated.')
      } else {
        console.log(`   ❌ FOUND ${falsePositives.length} FALSE POSITIVES:`)
        falsePositives.forEach(fp => {
          console.log(`   - ${fp.description}`)
        })
      }
      
      // Check for hallucinated tools (like multi_tool_use.parallel)
      const hallucinatedTools = ['multi_tool_use', 'parallel_execution', 'batch_operation']
      const hallucinatedIssues = toolIssues.filter(issue => {
        return hallucinatedTools.some(tool => issue.description.includes(tool))
      })
      
      console.log('\n🤖 Hallucinated Tool Check:')
      if (hallucinatedIssues.length > 0) {
        console.log(`   ✅ CORRECTLY DETECTED ${hallucinatedIssues.length} hallucinated tool(s):`)
        hallucinatedIssues.forEach(hall => {
          console.log(`   - ${hall.description}`)
        })
      } else {
        console.log('   ℹ️  No hallucinated tools detected in this plan')
      }
    }
    
    // === PHASE 4: Check server logs ===
    console.log('\n\n📋 PHASE 4: Checking server logs for validation details...')
    console.log('='.repeat(80))
    
    const logs = await fetch(`http://localhost:3001/api/dev/logs?limit=50&filter=critic-agent`, {
      method: 'GET',
    }).catch(() => null)
    
    if (logs && logs.ok) {
      const logData = await logs.json()
      console.log('✅ Server logs retrieved')
      
      const validationLogs = logData.filter(log => 
        log.message?.includes('tool availability') || 
        log.message?.includes('unavailable tools')
      )
      
      if (validationLogs.length > 0) {
        console.log('\n🔍 Validation logs found:')
        validationLogs.forEach(log => {
          console.log(`   ${log.level}: ${log.message}`)
          if (log.unavailableTools) {
            console.log(`   Tools: ${JSON.stringify(log.unavailableTools, null, 2)}`)
          }
        })
      } else {
        console.log('ℹ️  No specific validation logs found (expected if all tools are valid)')
      }
    } else {
      console.log('⚠️  Could not fetch server logs')
    }
    
    // === SUMMARY ===
    console.log('\n\n' + '='.repeat(80))
    console.log('✅ TOOL VALIDATION TEST COMPLETE')
    console.log('='.repeat(80))
    
    console.log('\n📊 Test Results:')
    console.log('─'.repeat(80))
    console.log(`✅ Plan generated: ${planData.plan.steps.length} steps`)
    console.log(`✅ Critique generated: ${critique.critique.issues.length} issues, ${critique.critique.followUpQuestions.length} questions`)
    
    // Final verdict
    const feasibilityIssues = critique.critique.issues.filter(i => i.category === 'feasibility')
    const toolIssues = feasibilityIssues.filter(i => i.description.includes('tool'))
    const realTools = ['list_facilities', 'analyze_shipment_risk', 'generate_intelligent_facility_report', 'get_facility', 'list_inspections', 'list_contaminants']
    const falsePositives = toolIssues.filter(issue => {
      return realTools.some(tool => issue.description.includes(tool))
    })
    
    if (falsePositives.length === 0) {
      console.log(`\n🎉 SUCCESS: No false positives! Tool validation is working correctly!`)
      console.log(`   Real MCP tools are NOT being flagged as missing.`)
    } else {
      console.log(`\n❌ FAILURE: Found ${falsePositives.length} false positive(s)!`)
      console.log(`   Implementation needs adjustment.`)
      process.exit(1)
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run the test
testToolValidation()


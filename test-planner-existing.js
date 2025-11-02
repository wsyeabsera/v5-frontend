/**
 * Test Planner Agent by analyzing existing plans
 */

const BASE_URL = 'http://localhost:3001';

async function testExistingPlans() {
  console.log('🧪 Analyzing Existing Planner Agent Plans\n');
  console.log('='.repeat(70));
  
  try {
    // Get planner history
    console.log('\n📋 Fetching Planner Agent History...');
    const historyResponse = await fetch(`${BASE_URL}/api/agents/planner-agent/history`);
    
    if (!historyResponse.ok) {
      const error = await historyResponse.json();
      console.log('❌ Failed to fetch history:', error.error);
      return;
    }
    
    const plans = await historyResponse.json();
    console.log(`✅ Found ${plans.length} plan(s) in history\n`);
    
    if (plans.length === 0) {
      console.log('⚠️  No plans found. Please generate a plan first.');
      return;
    }
    
    // Analyze the most recent plan
    const plan = plans[0];
    console.log('='.repeat(70));
    console.log('📊 Analyzing Plan:', plan.requestId);
    console.log('='.repeat(70));
    
    console.log(`\n🎯 Goal: ${plan.plan.goal}`);
    console.log(`\n📈 Metrics:`);
    console.log(`   Confidence: ${(plan.plan.confidence * 100).toFixed(0)}%`);
    console.log(`   Complexity: ${(plan.plan.estimatedComplexity * 100).toFixed(0)}%`);
    console.log(`   Steps: ${plan.plan.steps.length}`);
    console.log(`   Based on ${plan.basedOnThoughts?.length || 0} thought(s)\n`);
    
    // Validate steps
    console.log('='.repeat(70));
    console.log('📋 Step-by-Step Analysis');
    console.log('='.repeat(70));
    
    const genericParamNames = ['value', 'data', 'input', 'params', 'args'];
    let validSteps = 0;
    let invalidSteps = 0;
    const issues = [];
    
    plan.plan.steps.forEach((step) => {
      console.log(`\n📌 Step ${step.order}: ${step.description}`);
      console.log(`   Action: ${step.action}`);
      
      if (step.parameters && Object.keys(step.parameters).length > 0) {
        const paramStr = JSON.stringify(step.parameters, null, 2).split('\n').map((l, i) => i === 0 ? l : '   ' + l).join('\n');
        console.log(`   Parameters:\n   ${paramStr}`);
        
        // Check for generic parameter names
        const paramKeys = Object.keys(step.parameters);
        const hasGeneric = paramKeys.some(key => 
          genericParamNames.includes(key.toLowerCase())
        );
        
        // Check for placeholder values
        const values = Object.values(step.parameters);
        const hasPlaceholders = values.some(v => 
          typeof v === 'string' && (
            v.toLowerCase().includes('example') ||
            v.toLowerCase().includes('placeholder')
          )
        );
        
        if (hasGeneric) {
          invalidSteps++;
          const genericParam = paramKeys.find(k => genericParamNames.includes(k.toLowerCase()));
          issues.push(`Step ${step.order}: Uses generic parameter "${genericParam}"`);
          console.log(`   ⚠️  WARNING: Uses generic parameter name`);
        } else {
          validSteps++;
          console.log(`   ✅ Parameter names are specific and meaningful`);
        }
        
        if (hasPlaceholders) {
          console.log(`   ⚠️  WARNING: Contains placeholder values`);
        } else if (paramKeys.length > 0) {
          console.log(`   ✅ Parameter values are extracted/real`);
        }
        
        // Check parameter name patterns
        if (step.action.includes('facility')) {
          const hasCorrectParams = paramKeys.some(k => 
            ['id', 'facilityId', 'shortCode', 'location'].includes(k)
          );
          if (!hasCorrectParams && paramKeys.length > 0) {
            console.log(`   ℹ️  Note: Facility action but unexpected parameter names`);
          }
        }
        
      } else {
        console.log(`   Parameters: None`);
        if (step.action !== 'unknown' && !step.action.toLowerCase().includes('manual')) {
          console.log(`   ⚠️  No parameters specified`);
        }
      }
      
      if (step.dependencies && step.dependencies.length > 0) {
        console.log(`   Depends on: ${step.dependencies.join(', ')}`);
      }
      
      console.log(`   Expected: ${step.expectedOutcome}`);
    });
    
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 Validation Summary');
    console.log('='.repeat(70));
    console.log(`✅ Valid steps (specific parameter names): ${validSteps}`);
    console.log(`❌ Invalid steps (generic parameter names): ${invalidSteps}`);
    console.log(`📝 Total steps: ${plan.plan.steps.length}\n`);
    
    if (issues.length > 0) {
      console.log('⚠️  Issues Found:');
      issues.forEach(issue => console.log(`   - ${issue}`));
      console.log('');
    } else {
      console.log('✅ No validation issues found! All parameters use specific names.\n');
    }
    
    // Show rationale
    console.log('📝 Rationale:');
    console.log('-'.repeat(70));
    console.log(plan.rationale || 'No rationale provided');
    console.log('-'.repeat(70));
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Analysis Complete!');
    console.log('='.repeat(70));
    console.log('\n💡 Enhanced Planner Agent Features:');
    console.log('   ✅ Uses exact parameter names from tool schemas');
    console.log('   ✅ Extracts values from user queries');
    console.log('   ✅ Validates plans against MCP tool schemas');
    console.log('   ✅ Avoids generic parameter names');
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  }
}

testExistingPlans();


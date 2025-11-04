/**
 * Critic Agent
 * 
 * Evaluates plans before execution to catch errors, identify risks, and suggest improvements.
 * Acts as a quality gatekeeper, ensuring plans are safe and sound before they're executed.
 * 
 * How it works:
 * 1. Receives plan from Planner Agent (with Request ID)
 * 2. Uses LLM to critically evaluate plan
 * 3. Identifies issues, scores plan across multiple dimensions
 * 4. Generates follow-up questions if plan is incomplete
 * 5. Returns critique with recommendation
 */

import { BaseAgent } from './base-agent'
import { Plan, Critique, CritiqueIssue, FollowUpQuestion, CriticAgentOutput, RequestContext, MCPContext, ToolMemoryOutput, ComplexityScore } from '@/types'
import { logger } from '@/utils/logger'
import { listMCPTools, listMCPPrompts } from '@/lib/mcp-prompts'
import { ToolMemoryAgent } from './tool-memory-agent'
import { validateToolParameters } from './executor-agent/adapters/mcp-tool-adapter'
import { callMCPTool } from './executor-agent/adapters/mcp-tool-adapter'

/**
 * Critic Agent Class
 * 
 * Extends BaseAgent to provide critique capabilities.
 */
export class CriticAgent extends BaseAgent {
  /**
   * Base system prompt that guides the Critic Agent's behavior
   * 
   * This is enhanced with dynamic context (MCP tools, etc.)
   */
  private readonly baseSystemPrompt = `You are a Critic Agent - a senior engineer reviewing plans before execution.

Your job is to evaluate action plans critically:
1. Check for logical errors or contradictions
2. Verify feasibility with available tools
3. Assess efficiency and completeness
4. Identify potential risks or safety issues
5. Suggest improvements when needed
6. Generate follow-up questions if the plan is missing critical information

IMPORTANT: This agent uses MCP server's comprehensive validation system that categorizes missing parameters as:
- **Resolvable**: Can be automatically resolved by calling MCP tools
- **CanInfer**: Can be inferred with intelligent default values
- **MustAskUser**: Requires user input

The validation system has already attempted to resolve and infer parameters automatically. Only parameters that truly require user input should generate follow-up questions.

Be thorough but fair. Your goal is preventing mistakes, not perfectionism.

CRITICAL EVALUATION CRITERIA:
- Feasibility: Can this plan actually be executed with the available tools?
- Correctness: Is the logic sound? Are there contradictions?
- Efficiency: Is this the best approach? Are there redundancies?
- Safety: Are there potential risks? Could this cause harm or damage?
- Completeness: Is all necessary information provided? What's missing?

FORMAT REQUIREMENTS:

You MUST respond with ONLY a valid JSON object in this exact format:

{
  "overallScore": 0.0-1.0,
  "feasibilityScore": 0.0-1.0,
  "correctnessScore": 0.0-1.0,
  "efficiencyScore": 0.0-1.0,
  "safetyScore": 0.0-1.0,
  "strengths": ["strength 1", "strength 2"],
  "issues": [
    {
      "severity": "low|medium|high|critical",
      "category": "logic|feasibility|efficiency|safety|completeness",
      "description": "Clear description of the issue",
      "suggestion": "How to fix it",
      "affectedSteps": ["step-1", "step-2"] or null
    }
  ],
  "followUpQuestions": [
    {
      "question": "Question to ask user",
      "category": "missing-info|ambiguous|assumption|constraint",
      "priority": "low|medium|high"
    }
  ],
  "suggestions": ["improvement 1", "improvement 2"],
  "recommendation": "approve|revise|reject|approve-with-dynamic-fix",
  "rationale": "Why this recommendation"
}

Example of CORRECT JSON response:
{
  "overallScore": 0.75,
  "feasibilityScore": 0.8,
  "correctnessScore": 0.7,
  "efficiencyScore": 0.6,
  "safetyScore": 0.9,
  "strengths": [
    "Clear goal statement",
    "Logical step sequence"
  ],
  "issues": [
    {
      "severity": "medium",
      "category": "feasibility",
      "description": "Tool 'xyz' is not available",
      "suggestion": "Use alternative tool 'abc' instead",
      "affectedSteps": ["step-2"]
    }
  ],
  "followUpQuestions": [
    {
      "question": "What time range should the analysis cover?",
      "category": "missing-info",
      "priority": "high"
    }
  ],
  "suggestions": [
    "Combine steps 3 and 4 for efficiency"
  ],
  "recommendation": "revise",
  "rationale": "Plan is mostly sound but needs clarification on time range before execution"
}

FOLLOW-UP QUESTION GUIDELINES:

ONLY generate questions when:
- A tool parameter is required but has no value or uses placeholder
- User intent is genuinely ambiguous (not just unspecified optional params)
- Missing information would cause execution failure
- A constraint or filter is critical for correctness

DO NOT ask questions for:
- Optional parameters with reasonable defaults
- Information that can be inferred from context
- Overly broad "nice to have" clarifications
- Generic questions that don't help execution

GOOD QUESTIONS (specific, actionable):
- "Which facility ID should be analyzed? (e.g., 'FAC-001')"
- "Should the analysis include historical data? If yes, from which date?"
- "What contamination threshold level triggers an alert?"

BAD QUESTIONS (generic, vague):
- "What specific metrics are required?" (too broad)
- "Do you want detailed analysis?" (unclear what "detailed" means)
- "Any additional preferences?" (fishing for information)

For each question:
1. State WHAT information is needed
2. Explain WHY it's needed (which step requires it)
3. Provide EXAMPLES of valid answers when possible

Remember: You are outputting JSON only, no text before or after the JSON object.`

  // Thresholds for recommendations
  private readonly APPROVAL_THRESHOLD = 0.8; // Score >= 0.8: approve
  private readonly REVISION_THRESHOLD = 0.6; // 0.6 <= score < 0.8: revise
  // Score < 0.6: reject

  constructor() {
    super('critic-agent')
  }

  /**
   * Fetch MCP context (tools and prompts)
   * 
   * @returns MCP context information
   */
  async fetchMCPContext(): Promise<MCPContext> {
    try {
      const [tools, prompts] = await Promise.all([
        listMCPTools().catch(() => []),
        listMCPPrompts().catch(() => []),
      ])

      logger.debug(`[CriticAgent] Fetched MCP context`, {
        toolsCount: tools.length,
        promptsCount: prompts.length,
      })

      return {
        tools,
        resources: [],
        prompts,
      }
    } catch (error: any) {
      logger.error(`[CriticAgent] Failed to fetch MCP context:`, error)
      return { tools: [], resources: [], prompts: [] }
    }
  }

  /**
   * Fetch tool recommendations from Tool Memory Agent
   * 
   * @param userQuery - Original user query
   * @param requestContext - Request context
   * @param complexityScore - Optional complexity score
   * @returns Tool recommendations or null if unavailable
   */
  private async fetchToolRecommendations(
    userQuery: string,
    requestContext: RequestContext,
    complexityScore?: ComplexityScore
  ): Promise<ToolMemoryOutput | null> {
    try {
      const toolMemoryAgent = new ToolMemoryAgent()
      
      // Try to initialize (may fail if not configured)
      try {
        await toolMemoryAgent.initialize()
      } catch (error: any) {
        logger.debug(`[CriticAgent] Tool Memory Agent not available:`, error.message)
        return null
      }

      const mcpContext = await this.fetchMCPContext()
      const recommendations = await toolMemoryAgent.recommendTools(
        userQuery,
        requestContext,
        complexityScore,
        mcpContext
      )

      logger.debug(`[CriticAgent] Fetched tool recommendations`, {
        toolsRecommended: recommendations.recommendedTools.length,
      })

      return recommendations
    } catch (error: any) {
      logger.warn(`[CriticAgent] Failed to fetch tool recommendations:`, error.message)
      return null
    }
  }

  /**
   * Build enhanced system prompt with context
   * 
   * Dynamically constructs system prompt with MCP tools context.
   * 
   * @param mcpContext - MCP tools and prompts context
   * @param toolRecommendations - Optional tool recommendations from Tool Memory Agent
   * @returns Enhanced system prompt
   */
  private buildEnhancedSystemPrompt(mcpContext: MCPContext, toolRecommendations?: ToolMemoryOutput): string {
    let prompt = this.baseSystemPrompt + '\n\n'

    // Add MCP tools context (critical for feasibility checks)
    if (mcpContext.tools.length > 0) {
      prompt += '## ⚠️ AVAILABLE MCP TOOLS (CRITICAL - VALIDATE AGAINST THIS LIST)\n\n'
      prompt += `There are EXACTLY ${mcpContext.tools.length} tools available. Any tool not in this list is INVALID.\n\n`
      
      prompt += '**Available Tool Names:**\n'
      prompt += mcpContext.tools.map(t => `- ${t.name}`).join('\n')
      prompt += '\n\n'
      
      // Then show detailed schemas
      prompt += '**Tool Details:**\n\n'
      
      for (const tool of mcpContext.tools) {
        prompt += `**${tool.name}**\n`
        prompt += `Description: ${tool.description}\n`
        
        // Add parameters if available
        if (tool.inputSchema?.properties) {
          const requiredParams: string[] = tool.inputSchema.required || []
          const allParams = Object.entries(tool.inputSchema.properties)
          
          if (allParams.length > 0) {
            prompt += `Parameters:\n`
            
            for (const [paramName, paramSchema] of allParams) {
              const schema = paramSchema as any
              const isRequired = requiredParams.includes(paramName)
              const requiredMark = isRequired ? ' ⚠️ REQUIRED' : ' (optional)'
              prompt += `  • ${paramName}${requiredMark}\n`
            }
          }
        }
        
        prompt += '\n'
      }
    }

    // Add MCP prompts context
    if (mcpContext.prompts.length > 0) {
      prompt += '## Available MCP Prompts (Workflow Templates)\n\n'
      prompt += `These are pre-built analysis workflows. Plans can reference prompts as valid actions:\n\n`
      
      for (const mcpPrompt of mcpContext.prompts) {
        prompt += `- **${mcpPrompt.name}**: ${mcpPrompt.description}\n`
      }

      prompt += '\n⚠️ IMPORTANT: Prompts are valid workflow templates, not tools. Plans can use prompts as actions.\n\n'
    }

    // Add tool memory recommendations if available
    if (toolRecommendations && toolRecommendations.recommendedTools.length > 0) {
      prompt += '## AI-Powered Tool Recommendations\n\n'
      prompt += '🚨 IMPORTANT: These tools/prompts have been intelligently recommended based on similar successful patterns.\n\n'
      prompt += 'Use these recommendations to validate plan feasibility:\n\n'
      
      // Sort by priority
      const sortedTools = [...toolRecommendations.recommendedTools].sort(
        (a, b) => b.priority - a.priority
      )
      
      for (const rec of sortedTools) {
        prompt += `- **${rec.toolName}** (Priority: ${(rec.priority * 100).toFixed(0)}%)\n`
        prompt += `  Rationale: ${rec.rationale}\n`
        if (rec.exampleUsage) {
          prompt += `  Example: "${rec.exampleUsage}"\n`
        }
        prompt += '\n'
      }

      prompt += '\n'
    }

    return prompt
  }

  /**
   * Critique a plan
   * 
   * Evaluates a plan for errors, risks, and completeness. Can regenerate with user feedback.
   * 
   * @param plan - Plan to critique
   * @param userQuery - Original user query
   * @param requestContext - Request ID context
   * @param userFeedback - Optional user responses to follow-up questions
   * @param toolRecommendations - Optional tool recommendations (will be fetched if not provided)
   * @param complexityScore - Optional complexity score for tool recommendations
   * @returns CriticAgentOutput with critique and recommendation
   */
  async critiquePlan(
    plan: Plan,
    userQuery: string,
    requestContext: RequestContext,
    userFeedback?: { questionId: string; answer: string }[],
    toolRecommendations?: ToolMemoryOutput,
    complexityScore?: ComplexityScore
  ): Promise<CriticAgentOutput> {
    // Step 1: Add this agent to the request chain
    const updatedContext = this.addToChain(requestContext)

    // Step 2: Fetch MCP context
    const mcpContext = await this.fetchMCPContext()

    // Step 2.5: Fetch tool recommendations if not provided
    let toolRecs = toolRecommendations
    if (!toolRecs) {
      // Extract complexity from request context if available
      const complexity = complexityScore || ((requestContext as any).metadata?.complexity as ComplexityScore | undefined)
      toolRecs = await this.fetchToolRecommendations(userQuery, updatedContext, complexity) || undefined
    }

    // Step 3: Iterative validation with parameter resolution
    let currentPlan = plan
    let validation: Awaited<ReturnType<typeof this.validatePlanParameters>>
    const MAX_ITERATIONS = 5
    let iterations = 0
    
    do {
      iterations++
      logger.debug(`[CriticAgent] Validation iteration ${iterations}/${MAX_ITERATIONS}`, {
        requestId: updatedContext.requestId,
      })
      
      // Validate current plan
      validation = await this.validatePlanParameters(currentPlan, mcpContext, userQuery)
      
      if (validation.missingParams.length === 0) {
        logger.info(`[CriticAgent] All parameters validated`, {
          requestId: updatedContext.requestId,
          iterations,
        })
        break
      }
      
      if (iterations >= MAX_ITERATIONS) {
        logger.warn(`[CriticAgent] Max iterations reached, stopping validation loop`, {
          requestId: updatedContext.requestId,
          remainingMissingParams: validation.missingParams.length,
        })
        break
      }
      
      // Extract context for resolution
      const context = this.extractContext(userQuery, currentPlan)
      
      // Resolve resolvable parameters
      const resolutions = await this.resolveParameters(
        validation.missingParams,
        context,
        mcpContext,
        validation.validationResults
      )
      
      // Infer inferrable parameters
      const inferences = await this.inferParameters(
        validation.missingParams,
        validation.validationResults,
        context
      )
      
      // Update plan with resolved and inferred parameters
      if (resolutions.size > 0 || inferences.size > 0) {
        currentPlan = this.updatePlanWithResolvedParameters(currentPlan, resolutions, inferences)
        logger.info(`[CriticAgent] Updated plan with ${resolutions.size} resolutions and ${inferences.size} inferences`, {
          requestId: updatedContext.requestId,
          iteration: iterations,
        })
      } else {
        // No more parameters can be resolved/inferred, break
        break
      }
    } while (validation.missingParams.length > 0)
    
    // Use the updated plan for the rest of the critique
    const finalPlan = currentPlan
    
    if (validation.missingParams.length > 0) {
      logger.info(`[CriticAgent] Found ${validation.missingParams.length} missing parameters after ${iterations} iterations`, {
        requestId: updatedContext.requestId,
        missingParams: validation.missingParams.map(m => ({
          step: m.stepOrder,
          tool: m.tool,
          param: m.missingParam,
          category: m.category,
        }))
      })
    }

    // Step 3.5: Validate tool availability (including prompts)
    const toolValidation = this.validateToolAvailability(finalPlan, mcpContext)
    
    const unavailableTools = toolValidation.filter(v => !v.available)
    if (unavailableTools.length > 0) {
      logger.info(`[CriticAgent] Found ${unavailableTools.length} unavailable tools`, {
        requestId: updatedContext.requestId,
        unavailableTools: unavailableTools.map(t => ({
          step: t.stepOrder,
          tool: t.tool
        }))
      })
    }

    // Step 4: Build enhanced system prompt
    const enhancedSystemPrompt = this.buildEnhancedSystemPrompt(mcpContext, toolRecs || undefined)

    // Step 5: Build the prompt for the LLM
    const prompt = this.buildCritiquePrompt(finalPlan, userQuery, mcpContext, userFeedback, validation, toolValidation)

    // Step 6: Call LLM
    const messages = [
      { role: 'system' as const, content: enhancedSystemPrompt },
      { role: 'user' as const, content: prompt },
    ]

    logger.debug(`[CriticAgent] Critiquing plan`, {
      requestId: updatedContext.requestId,
      planId: finalPlan.id,
      stepsCount: finalPlan.steps.length,
      hasUserFeedback: !!userFeedback,
      validationIterations: iterations,
    })

    const response = await this.callLLM(messages, {
      temperature: 0.3, // Critical analysis - be precise, less creative
      maxTokens: 2000,
      responseFormat: { type: 'json_object' } // Force JSON output
    })

    // Step 7: Parse the structured response
    const critique = this.parseCritiqueResponse(response, finalPlan.id, userFeedback)

    // Step 7.5: Update confidence based on validation results
    // Only accept confidence >= 95% when all params validated
    if (validation.missingParams.length > 0) {
      // If any params missing, confidence must be 0
      critique.overallScore = 0
      critique.feasibilityScore = Math.min(critique.feasibilityScore, 0.5)
      
      // Check if plan can be fixed dynamically and update recommendation if needed
      const canBeFixed = this.canBeFixedDynamically(finalPlan, validation.missingParams.map(m => ({
        stepId: m.stepId,
        stepOrder: m.stepOrder,
        tool: m.tool,
        missingParam: m.missingParam,
        isRequired: true,
      })), mcpContext)
      
      if (canBeFixed && (critique.recommendation === 'reject' || critique.recommendation === 'revise')) {
        // Update recommendation to approve-with-dynamic-fix
        critique.recommendation = 'approve-with-dynamic-fix'
        critique.rationale = `Plan can be dynamically fixed during execution. Missing parameters will be obtained from earlier step results: ${critique.rationale}`
        logger.info(`[CriticAgent] Plan can be fixed dynamically`, {
          requestId: updatedContext.requestId,
          missingParams: validation.missingParams.length
        })
      }
    } else {
      // All params validated - check if confidence is high enough
      const allValidationValid = validation.validationResults.every(v => 
        v.validation.validation.isValid && 
        v.validation.validation.invalidParams.length === 0
      )
      
      if (allValidationValid && critique.overallScore >= 0.95) {
        // All good - confidence can be high
        logger.info(`[CriticAgent] All parameters validated with high confidence`, {
          requestId: updatedContext.requestId,
          confidence: critique.overallScore,
        })
      } else if (allValidationValid) {
        // Valid but confidence not high enough - boost it
        critique.overallScore = Math.max(critique.overallScore, 0.95)
        logger.info(`[CriticAgent] All parameters validated, confidence boosted to 95%`, {
          requestId: updatedContext.requestId,
        })
      }
    }

    // Task 3.4: Sync validation warnings with follow-up questions
    // Ensure warnings align with questions - if a parameter is in warnings, it should have a question (or be dynamic-fixable)
    const syncedValidationWarnings = validation.missingParams.map(warning => {
      // Check if there's a corresponding question for this parameter
      const hasQuestion = critique.followUpQuestions.some(q => {
        // Question might reference the parameter name, step number, or tool
        const questionLower = q.question.toLowerCase()
        return questionLower.includes(warning.missingParam.toLowerCase()) ||
               questionLower.includes(`step ${warning.stepOrder}`) ||
               questionLower.includes(warning.tool.toLowerCase())
      })
      
      return {
        ...warning,
        hasCorrespondingQuestion: hasQuestion,
      }
    })
    
    // Log mismatches for debugging
    const warningsWithoutQuestions = syncedValidationWarnings.filter(w => !w.hasCorrespondingQuestion)
    if (warningsWithoutQuestions.length > 0 && critique.recommendation !== 'approve-with-dynamic-fix') {
      logger.warn(`[CriticAgent] Validation warnings without corresponding questions`, {
        requestId: updatedContext.requestId,
        warningsWithoutQuestions: warningsWithoutQuestions.map(w => ({
          step: w.stepOrder,
          tool: w.tool,
          param: w.missingParam,
        })),
        recommendation: critique.recommendation,
      })
    }

    // Step 8: Build output with Request ID
    const output: CriticAgentOutput = {
      // Agent output base
      requestId: updatedContext.requestId,
      agentName: 'critic-agent',
      timestamp: new Date(),
      requestContext: updatedContext,

      // Critic-specific output
      critique,
      planId: finalPlan.id,
      requiresUserFeedback: critique.followUpQuestions.some(q => !q.userAnswer),
      // Task 3.4: Use synced validation warnings (excluding dynamic-fixable ones that have questions)
      validationWarnings: syncedValidationWarnings.filter(w => {
        // Include warnings that either:
        // 1. Have corresponding questions, OR
        // 2. Don't have questions but aren't dynamic-fixable (true missing)
        // This ensures warnings align with questions
        return w.hasCorrespondingQuestion || (!w.hasCorrespondingQuestion && critique.recommendation !== 'approve-with-dynamic-fix')
      }).map(({ hasCorrespondingQuestion, ...rest }) => rest), // Remove helper field
    }

    logger.info(`[CriticAgent] Plan critiqued`, {
      requestId: output.requestId,
      planId: finalPlan.id,
      overallScore: critique.overallScore.toFixed(2),
      recommendation: critique.recommendation,
      issuesCount: critique.issues.length,
      questionsCount: critique.followUpQuestions.length,
      validationIterations: iterations,
      missingParamsAfterValidation: validation.missingParams.length,
    })

    return output
  }

  /**
   * Build the critique prompt sent to the LLM
   * 
   * @param plan - Plan to critique
   * @param userQuery - Original user query
   * @param mcpContext - MCP context for tool verification
   * @param userFeedback - Optional user responses to follow-up questions
   * @returns Formatted prompt string
   */
  private buildCritiquePrompt(
    plan: Plan,
    userQuery: string,
    mcpContext: MCPContext,
    userFeedback?: { questionId: string; answer: string }[],
    validation?: { missingParams: Array<{ stepId: string; stepOrder: number; tool: string; missingParam: string; category: 'resolvable' | 'mustAskUser' | 'canInfer'; isRequired: boolean }> },
    toolValidation?: Array<{ stepOrder: number; stepId: string; tool: string; available: boolean }>
  ): string {
    let prompt = `User Query: "${userQuery}"\n\n`

    // Add validation results if available
    if (validation && validation.missingParams.length > 0) {
      prompt += `⚠️ MISSING REQUIRED PARAMETERS (MCP Validation Results):\n\n`
      
      // Group by category
      const resolvable = validation.missingParams.filter(m => m.category === 'resolvable')
      const mustAskUser = validation.missingParams.filter(m => m.category === 'mustAskUser')
      const canInfer = validation.missingParams.filter(m => m.category === 'canInfer')
      
      if (resolvable.length > 0) {
        prompt += `📌 RESOLVABLE PARAMETERS (${resolvable.length}):\n`
        prompt += `These parameters can be resolved by calling MCP tools, but resolution failed or was incomplete:\n`
        for (const missing of resolvable) {
          prompt += `- Step ${missing.stepOrder}: Tool '${missing.tool}' parameter '${missing.missingParam}'\n`
        }
        prompt += `\n`
      }
      
      if (canInfer.length > 0) {
        prompt += `📌 INFERRABLE PARAMETERS (${canInfer.length}):\n`
        prompt += `These parameters can be inferred with default values, but inference was incomplete:\n`
        for (const missing of canInfer) {
          prompt += `- Step ${missing.stepOrder}: Tool '${missing.tool}' parameter '${missing.missingParam}'\n`
        }
        prompt += `\n`
      }
      
      if (mustAskUser.length > 0) {
        prompt += `📌 MUST ASK USER (${mustAskUser.length}):\n`
        prompt += `These parameters require user input:\n`
        for (const missing of mustAskUser) {
          prompt += `- Step ${missing.stepOrder}: Tool '${missing.tool}' parameter '${missing.missingParam}'\n`
        }
        prompt += `\n`
      }
      
      prompt += `\nTask: Generate follow-up questions to collect ALL missing parameter values that must be asked from user.\n`
      prompt += `- Focus on parameters with category 'mustAskUser'\n`
      prompt += `- Ask SPECIFIC questions referencing the step number and parameter name\n`
      prompt += `- Map parameter names to user-friendly descriptions (e.g., "wasteItemDetected" → "What waste item was detected?")\n`
      prompt += `- Ensure ALL ${mustAskUser.length} user-required parameters generate questions\n\n`
    }

    // Add tool availability validation results
    if (toolValidation && toolValidation.length > 0) {
      const unavailableTools = toolValidation.filter(v => !v.available)
      
      if (unavailableTools.length > 0) {
        prompt += `\n\n## ⚠️ CRITICAL TOOL VALIDATION ERRORS\n\n`
        prompt += `The following tools in the plan DO NOT EXIST in available MCP tools:\n\n`
        
        unavailableTools.forEach(v => {
          prompt += `- Step ${v.stepOrder}: Tool "${v.tool}" is NOT AVAILABLE\n`
        })
        
        prompt += `\nYou MUST flag these as CRITICAL feasibility issues.\n`
      } else {
        prompt += `\n\n✅ All tools in plan are available in MCP.\n`
      }
    }

    // Format plan for critique
    prompt += `Plan to Evaluate:\n`
    prompt += `GOAL: ${plan.goal}\n\n`
    prompt += `STEPS:\n`
    
    for (const step of plan.steps) {
      prompt += `${step.order}. ${step.description}\n`
      prompt += `   Action: ${step.action}\n`
      if (step.parameters && Object.keys(step.parameters).length > 0) {
        prompt += `   Parameters: ${JSON.stringify(step.parameters)}\n`
      }
      prompt += `   Expected: ${step.expectedOutcome}\n`
      if (step.dependencies && step.dependencies.length > 0) {
        prompt += `   Depends on: ${step.dependencies.join(', ')}\n`
      }
      prompt += `\n`
    }

    // Add user feedback if provided (for regeneration)
    if (userFeedback && userFeedback.length > 0) {
      prompt += `\nUser Feedback:\n`
      for (const feedback of userFeedback) {
        prompt += `Q: (${feedback.questionId})\n`
        prompt += `A: ${feedback.answer}\n\n`
      }
      prompt += `Based on the above feedback, please update your critique. Resolve the questions that have been answered.\n`
    }

    return prompt
  }

  /**
   * Task 3.1: Detect if a value is a generic placeholder
   * 
   * @param value - Value to check
   * @param paramName - Parameter name
   * @param toolName - Tool name for context
   * @returns true if value appears to be a generic placeholder
   */
  private isGenericPlaceholder(value: any, paramName: string, toolName: string): boolean {
    if (typeof value !== 'string') return false
    
    const valueLower = value.toLowerCase()
    
    // Detect generic text patterns
    const genericPatterns = [
      /detected\s+waste\s+item/i,
      /contaminant\s+material/i,
      /waste\s+item\s+detected/i,
      /material\s+type/i,
      /shipment\d+/i,
      /facility\d+/i,
      /contract\d+/i,
      /test\s+\w*/i,
      /example\s+\w*/i,
      /default\s+\w*/i,
      /sample\s+\w*/i,
      /placeholder\s+\w*/i,
      /^test\s*$/i,
      /^example\s*$/i,
      /^default\s*$/i,
    ]
    
    // Check generic patterns
    if (genericPatterns.some(pattern => pattern.test(value))) {
      return true
    }
    
    // Detect old dates (more than 1 year old) - likely placeholder
    if (this.isOldDate(value)) {
      return true
    }
    
    // Detect common placeholder numbers (default values like 0, 50, 100 when context suggests placeholder)
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      const numValue = parseInt(value, 10)
      // Common placeholder numbers
      if ([0, 1, 10, 50, 100, 123].includes(numValue)) {
        // Check if param name suggests this is likely a placeholder
        const placeholderNumberParams = ['estimated_size', 'heating_value', 'size', 'amount', 'quantity']
        if (placeholderNumberParams.some(p => paramName.toLowerCase().includes(p))) {
          return true
        }
      }
    }
    
    return false
  }

  /**
   * Check if a string is an old date (more than 1 year old)
   * 
   * @param value - String to check
   * @returns true if value is a date more than 1 year old
   */
  private isOldDate(value: string): boolean {
    try {
      const date = new Date(value)
      if (isNaN(date.getTime())) return false
      
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      
      return date < oneYearAgo
    } catch {
      return false
    }
  }

  /**
   * Extract context from user query and plan for MCP validation
   * 
   * @param userQuery - Original user query
   * @param plan - Plan to extract context from
   * @returns Context object with facilityCode, shortCode, etc.
   */
  private extractContext(userQuery: string, plan: Plan): Record<string, any> {
    const context: Record<string, any> = {}
    
    // Extract facility codes/short codes from query
    const shortCodeMatch = userQuery.match(/\b([A-Z]{2,4})\b/g)
    if (shortCodeMatch) {
      context.shortCode = shortCodeMatch[0]
      context.facilityCode = shortCodeMatch[0]
    }
    
    // Extract from plan step parameters
    for (const step of plan.steps) {
      if (step.parameters) {
        if (step.parameters.shortCode && !context.shortCode) {
          context.shortCode = step.parameters.shortCode
        }
        if (step.parameters.facilityCode && !context.facilityCode) {
          context.facilityCode = step.parameters.facilityCode
        }
        if (step.parameters.location && !context.location) {
          context.location = step.parameters.location
        }
      }
    }
    
    return context
  }

  /**
   * Validate plan parameters using MCP server's tools/validate endpoint
   * 
   * @param plan - Plan to validate
   * @param mcpContext - MCP context with tool schemas
   * @param userQuery - Original user query for context extraction
   * @returns Comprehensive validation result with categorization
   */
  private async validatePlanParameters(
    plan: Plan,
    mcpContext: MCPContext,
    userQuery: string
  ): Promise<{
    validationResults: Array<{
      stepId: string
      stepOrder: number
      tool: string
      validation: Awaited<ReturnType<typeof validateToolParameters>>
    }>
    missingParams: Array<{
      stepId: string
      stepOrder: number
      tool: string
      missingParam: string
      category: 'resolvable' | 'mustAskUser' | 'canInfer'
      isRequired: boolean
    }>
  }> {
    const validationResults: Array<{
      stepId: string
      stepOrder: number
      tool: string
      validation: Awaited<ReturnType<typeof validateToolParameters>>
    }> = []
    
    const missingParams: Array<{
      stepId: string
      stepOrder: number
      tool: string
      missingParam: string
      category: 'resolvable' | 'mustAskUser' | 'canInfer'
      isRequired: boolean
    }> = []
    
    // Extract context from user query and plan
    const context = this.extractContext(userQuery, plan)
    
    // Validate each step that uses a tool
    for (const step of plan.steps) {
      const tool = mcpContext.tools.find(t => t.name === step.action)
      if (!tool) continue // Skip if not a tool (e.g., prompts, manual actions)
      
      try {
        // Call MCP validation endpoint
        const validation = await validateToolParameters(
          step.action,
          step.parameters || {},
          context
        )
        
        validationResults.push({
          stepId: step.id,
          stepOrder: step.order,
          tool: step.action,
          validation,
        })
        
        // Process missing parameters with categorization
        for (const missingParam of validation.missingParams) {
          // Determine category
          let category: 'resolvable' | 'mustAskUser' | 'canInfer' = 'mustAskUser'
          if (validation.categorization.resolvable.includes(missingParam)) {
            category = 'resolvable'
          } else if (validation.categorization.canInfer.includes(missingParam)) {
            category = 'canInfer'
          } else if (validation.categorization.mustAskUser.includes(missingParam)) {
            category = 'mustAskUser'
          }
          
          missingParams.push({
            stepId: step.id,
            stepOrder: step.order,
            tool: step.action,
            missingParam,
            category,
            isRequired: true,
          })
        }
      } catch (error: any) {
        logger.warn(`[CriticAgent] Failed to validate parameters for step ${step.order}:`, error.message)
        // Continue with other steps
      }
    }
    
    return { validationResults, missingParams }
  }

  /**
   * Intelligently resolve resolvable parameters using LLM reasoning and MCP tools
   * 
   * Uses LLM to analyze context and determine which MCP tools to call and how to resolve each parameter.
   * No hardcoded parameter name checks - fully dynamic based on tool schema and context.
   * 
   * @param missingParams - List of missing parameters with category 'resolvable'
   * @param context - Context from user query and plan
   * @param mcpContext - MCP context with available tools
   * @param validationResults - Validation results with tool schemas
   * @returns Map of parameter resolutions (stepId -> paramName -> resolvedValue)
   */
  private async resolveParameters(
    missingParams: Array<{
      stepId: string
      stepOrder: number
      tool: string
      missingParam: string
      category: 'resolvable' | 'mustAskUser' | 'canInfer'
    }>,
    context: Record<string, any>,
    mcpContext: MCPContext,
    validationResults: Array<{
      stepId: string
      stepOrder: number
      tool: string
      validation: Awaited<ReturnType<typeof validateToolParameters>>
    }>
  ): Promise<Map<string, Map<string, any>>> {
    const resolutions = new Map<string, Map<string, any>>()
    
    const resolvableParams = missingParams.filter(m => m.category === 'resolvable')
    if (resolvableParams.length === 0) {
      return resolutions
    }
    
    // Group by step for batch processing
    const paramsByStep = new Map<string, typeof resolvableParams>()
    for (const param of resolvableParams) {
      if (!paramsByStep.has(param.stepId)) {
        paramsByStep.set(param.stepId, [])
      }
      paramsByStep.get(param.stepId)!.push(param)
    }
    
    // Resolve parameters for each step using LLM reasoning
    for (const [stepId, params] of Array.from(paramsByStep.entries())) {
      const stepValidation = validationResults.find(v => v.stepId === stepId)
      if (!stepValidation) continue
      
      const tool = mcpContext.tools.find(t => t.name === stepValidation.tool)
      if (!tool) continue
      
      // Build LLM prompt for parameter resolution
      const resolutionPrompt = this.buildParameterResolutionPrompt(
        params,
        context,
        tool,
        mcpContext
      )
      
      try {
        const messages = [
          {
            role: 'system' as const,
            content: `You are a parameter resolution assistant. Your job is to determine HOW to resolve missing parameters by calling appropriate MCP tools.

You will receive:
- Missing parameters that need to be resolved
- Current context (user query, plan parameters, etc.)
- Available MCP tools
- Tool schema for the target tool

You must output ONLY a JSON object with this exact format:
{
  "resolutions": [
    {
      "paramName": "facilityId",
      "resolutionStrategy": {
        "tool": "list_facilities",
        "arguments": { "shortCode": "HAN" },
        "extractionPath": "_id or id field from first result"
      }
    }
  ]
}

Guidelines:
- Use available MCP tools to resolve parameters
- Analyze the tool schema to understand what the parameter expects
- Use context (shortCode, facilityCode, etc.) to build appropriate tool calls
- Specify extractionPath to indicate how to extract the value from tool response
- Be intelligent - don't hardcode, reason about the best approach`,
          },
          {
            role: 'user' as const,
            content: resolutionPrompt,
          },
        ]
        
        const response = await this.callLLM(messages, {
          temperature: 0.3,
          maxTokens: 1000,
          responseFormat: { type: 'json_object' },
        })
        
        // Extract JSON from response (similar to parseCritiqueResponse)
        const cleanResponse = response.trim()
        let jsonStart = cleanResponse.indexOf('{')
        if (jsonStart === -1) {
          throw new Error('No JSON object found in response')
        }
        
        // Find the matching closing brace
        let braceCount = 0
        let jsonEnd = -1
        for (let i = jsonStart; i < cleanResponse.length; i++) {
          if (cleanResponse[i] === '{') braceCount++
          if (cleanResponse[i] === '}') {
            braceCount--
            if (braceCount === 0) {
              jsonEnd = i + 1
              break
            }
          }
        }
        
        if (jsonEnd === -1) {
          throw new Error('Incomplete JSON object in response')
        }
        
        const jsonStr = cleanResponse.substring(jsonStart, jsonEnd)
        const parsed = JSON.parse(jsonStr)
        const resolutionStrategies = parsed.resolutions || []
        
        // Execute resolution strategies
        for (const strategy of resolutionStrategies) {
          try {
            const toolResult = await callMCPTool(strategy.resolutionStrategy.tool, strategy.resolutionStrategy.arguments)
            const result = toolResult.result
            
            // Extract value based on extractionPath
            let resolvedValue: any = null
            if (strategy.resolutionStrategy.extractionPath) {
              // Handle extraction path (e.g., "_id or id field from first result")
              if (Array.isArray(result) && result.length > 0) {
                const firstItem = result[0]
                if (firstItem._id) {
                  resolvedValue = firstItem._id
                } else if (firstItem.id) {
                  resolvedValue = firstItem.id
                } else {
                  // Try to extract using the path
                  const pathParts = strategy.resolutionStrategy.extractionPath.split('.')
                  let current: any = firstItem
                  for (const part of pathParts) {
                    if (current && typeof current === 'object') {
                      current = current[part]
                    } else {
                      current = null
                      break
                    }
                  }
                  resolvedValue = current
                }
              } else if (result && typeof result === 'object') {
                resolvedValue = result._id || result.id || result[strategy.resolutionStrategy.extractionPath]
              }
            } else {
              // Default: use _id or id from first result if array, or direct result
              if (Array.isArray(result) && result.length > 0) {
                resolvedValue = result[0]._id || result[0].id || result[0]
              } else {
                resolvedValue = result
              }
            }
            
            if (resolvedValue) {
              if (!resolutions.has(stepId)) {
                resolutions.set(stepId, new Map())
              }
              resolutions.get(stepId)!.set(strategy.paramName, resolvedValue)
              
              logger.info(`[CriticAgent] Resolved parameter ${strategy.paramName} using ${strategy.resolutionStrategy.tool}: ${resolvedValue}`)
            }
          } catch (error: any) {
            logger.warn(`[CriticAgent] Failed to resolve parameter ${strategy.paramName}:`, error.message)
          }
        }
      } catch (error: any) {
        logger.warn(`[CriticAgent] Failed to generate resolution strategy for step ${stepId}:`, error.message)
      }
    }
    
    return resolutions
  }

  /**
   * Build prompt for LLM to determine parameter resolution strategy
   */
  private buildParameterResolutionPrompt(
    params: Array<{
      stepId: string
      stepOrder: number
      tool: string
      missingParam: string
      category: 'resolvable' | 'mustAskUser' | 'canInfer'
    }>,
    context: Record<string, any>,
    tool: any,
    mcpContext: MCPContext
  ): string {
    let prompt = `Resolve the following missing parameters for tool "${tool.name}":\n\n`
    
    prompt += `Missing Parameters:\n`
    for (const param of params) {
      prompt += `- ${param.missingParam} (required by tool "${param.tool}")\n`
    }
    
    prompt += `\nTool Schema:\n${JSON.stringify(tool.inputSchema, null, 2)}\n`
    
    prompt += `\nAvailable Context:\n${JSON.stringify(context, null, 2)}\n`
    
    prompt += `\nAvailable MCP Tools:\n`
    for (const availableTool of mcpContext.tools.slice(0, 20)) { // Limit to first 20 for brevity
      prompt += `- ${availableTool.name}: ${availableTool.description}\n`
    }
    
    prompt += `\nDetermine which MCP tools to call and how to extract values to resolve these parameters.`
    
    return prompt
  }

  /**
   * Intelligently infer inferrable parameters using LLM reasoning
   * 
   * Uses LLM to analyze parameter type and context to determine appropriate default values.
   * 
   * @param missingParams - List of missing parameters with category 'canInfer'
   * @param validationResults - Validation results with tool schemas
   * @param context - Context from user query and plan
   * @returns Map of parameter inferences (stepId -> paramName -> inferredValue)
   */
  private async inferParameters(
    missingParams: Array<{
      stepId: string
      stepOrder: number
      tool: string
      missingParam: string
      category: 'resolvable' | 'mustAskUser' | 'canInfer'
    }>,
    validationResults: Array<{
      stepId: string
      stepOrder: number
      tool: string
      validation: Awaited<ReturnType<typeof validateToolParameters>>
    }>,
    context: Record<string, any>
  ): Promise<Map<string, Map<string, any>>> {
    const inferences = new Map<string, Map<string, any>>()
    
    const inferrableParams = missingParams.filter(m => m.category === 'canInfer')
    if (inferrableParams.length === 0) {
      return inferences
    }
    
    // Group by step for batch processing
    const paramsByStep = new Map<string, typeof inferrableParams>()
    for (const param of inferrableParams) {
      if (!paramsByStep.has(param.stepId)) {
        paramsByStep.set(param.stepId, [])
      }
      paramsByStep.get(param.stepId)!.push(param)
    }
    
    // Infer parameters for each step using LLM reasoning
    for (const [stepId, params] of Array.from(paramsByStep.entries())) {
      const stepValidation = validationResults.find(v => v.stepId === stepId)
      if (!stepValidation) continue
      
      // Build LLM prompt for parameter inference
      const inferencePrompt = this.buildParameterInferencePrompt(params, stepValidation, context)
      
      try {
        const messages = [
          {
            role: 'system' as const,
            content: `You are a parameter inference assistant. Your job is to determine appropriate default values for missing parameters based on their type, constraints, and context.

You will receive:
- Missing parameters that can be inferred
- Tool schema showing parameter types and constraints
- Current context

You must output ONLY a JSON object with this exact format:
{
  "inferences": [
    {
      "paramName": "detection_time",
      "inferredValue": "2024-01-15T10:30:00Z",
      "reasoning": "Current timestamp for detection time"
    }
  ]
}

Guidelines:
- For timestamps/dates: use current timestamp in ISO 8601 format
- For IDs: don't infer - these should be resolved, not inferred
- For enums: use a reasonable default from the enum values
- For numbers: use 0 or a reasonable default based on context
- For strings: use empty string or a reasonable default based on parameter name
- Always provide reasoning for your inference`,
          },
          {
            role: 'user' as const,
            content: inferencePrompt,
          },
        ]
        
        const response = await this.callLLM(messages, {
          temperature: 0.2,
          maxTokens: 500,
          responseFormat: { type: 'json_object' },
        })
        
        // Extract JSON from response (similar to parseCritiqueResponse)
        const cleanResponse = response.trim()
        let jsonStart = cleanResponse.indexOf('{')
        if (jsonStart === -1) {
          throw new Error('No JSON object found in response')
        }
        
        // Find the matching closing brace
        let braceCount = 0
        let jsonEnd = -1
        for (let i = jsonStart; i < cleanResponse.length; i++) {
          if (cleanResponse[i] === '{') braceCount++
          if (cleanResponse[i] === '}') {
            braceCount--
            if (braceCount === 0) {
              jsonEnd = i + 1
              break
            }
          }
        }
        
        if (jsonEnd === -1) {
          throw new Error('Incomplete JSON object in response')
        }
        
        const jsonStr = cleanResponse.substring(jsonStart, jsonEnd)
        const parsed = JSON.parse(jsonStr)
        const inferenceResults = parsed.inferences || []
        
        if (!inferences.has(stepId)) {
          inferences.set(stepId, new Map())
        }
        
        for (const inference of inferenceResults) {
          if (inference.inferredValue !== undefined && inference.inferredValue !== null) {
            inferences.get(stepId)!.set(inference.paramName, inference.inferredValue)
            logger.debug(`[CriticAgent] Inferred parameter ${inference.paramName} for step ${stepId}: ${inference.inferredValue} (${inference.reasoning})`)
          }
        }
      } catch (error: any) {
        logger.warn(`[CriticAgent] Failed to infer parameters for step ${stepId}:`, error.message)
      }
    }
    
    return inferences
  }
  
  /**
   * Build prompt for LLM to determine parameter inference
   */
  private buildParameterInferencePrompt(
    params: Array<{
      stepId: string
      stepOrder: number
      tool: string
      missingParam: string
      category: 'resolvable' | 'mustAskUser' | 'canInfer'
    }>,
    stepValidation: {
      stepId: string
      stepOrder: number
      tool: string
      validation: Awaited<ReturnType<typeof validateToolParameters>>
    },
    context: Record<string, any>
  ): string {
    let prompt = `Infer appropriate values for the following parameters:\n\n`
    
    prompt += `Parameters to Infer:\n`
    for (const param of params) {
      prompt += `- ${param.missingParam}\n`
    }
    
    prompt += `\nRequired Parameters Schema:\n`
    prompt += JSON.stringify(stepValidation.validation.requiredParams, null, 2)
    
    prompt += `\nContext:\n${JSON.stringify(context, null, 2)}\n`
    
    prompt += `\nDetermine appropriate default values based on parameter names, types, and context.`
    
    return prompt
  }

  /**
   * Update plan with resolved and inferred parameters
   * 
   * @param plan - Plan to update
   * @param resolutions - Resolved parameter values
   * @param inferences - Inferred parameter values
   * @returns Updated plan
   */
  private updatePlanWithResolvedParameters(
    plan: Plan,
    resolutions: Map<string, Map<string, any>>,
    inferences: Map<string, Map<string, any>>
  ): Plan {
    const updatedPlan = {
      ...plan,
      steps: plan.steps.map(step => {
        const stepResolutions = resolutions.get(step.id)
        const stepInferences = inferences.get(step.id)
        
        if (!stepResolutions && !stepInferences) {
          return step
        }
        
        const updatedParams = { ...step.parameters }
        
        // Apply resolutions
        if (stepResolutions) {
          for (const [paramName, value] of Array.from(stepResolutions.entries())) {
            updatedParams[paramName] = value
          }
        }
        
        // Apply inferences
        if (stepInferences) {
          for (const [paramName, value] of Array.from(stepInferences.entries())) {
            updatedParams[paramName] = value
          }
        }
        
        return {
          ...step,
          parameters: updatedParams,
        }
      }),
    }
    
    return updatedPlan
  }

  /**
   * Validate that tools in plan exist in MCP (both tools and prompts)
   */
  private validateToolAvailability(
    plan: Plan,
    mcpContext: MCPContext
  ): Array<{ stepOrder: number; stepId: string; tool: string; available: boolean }> {
    const toolMap = new Map(mcpContext.tools.map(t => [t.name, t]))
    const promptMap = new Map(mcpContext.prompts.map(p => [p.name, p]))
    const validation: Array<{ stepOrder: number; stepId: string; tool: string; available: boolean }> = []
    
    for (const step of plan.steps) {
      // Skip validation for manual/review actions
      if (step.action.toLowerCase().includes('manual') || 
          step.action === 'unknown') {
        continue
      }
      
      // Check both tools and prompts
      const toolExists = toolMap.has(step.action)
      const promptExists = promptMap.has(step.action)
      const available = toolExists || promptExists
      
      validation.push({
        stepOrder: step.order,
        stepId: step.id,
        tool: step.action,
        available,
      })
    }
    
    return validation
  }

  /**
   * Parse LLM response into Critique object
   * 
   * The LLM is instructed to format its response as JSON.
   * This method extracts the critique data and builds a Critique object.
   * 
   * @param response - Raw LLM response
   * @param planId - ID of the plan being critiqued
   * @param userFeedback - Optional user responses to follow-up questions
   * @returns Structured Critique object
   */
  private parseCritiqueResponse(
    response: string,
    planId: string,
    userFeedback?: { questionId: string; answer: string }[]
  ): Critique {
    try {
      const cleanResponse = response.trim()
      logger.info(`[CriticAgent] Attempting to parse JSON response`, {
        responseLength: cleanResponse.length,
        responsePreview: cleanResponse.substring(0, 500)
      })
      
      // Try to find the first complete JSON object
      let jsonStart = cleanResponse.indexOf('{')
      if (jsonStart === -1) {
        throw new Error('No JSON object found in response')
      }
      
      // Find the matching closing brace
      let braceCount = 0
      let jsonEnd = -1
      for (let i = jsonStart; i < cleanResponse.length; i++) {
        if (cleanResponse[i] === '{') braceCount++
        if (cleanResponse[i] === '}') {
          braceCount--
          if (braceCount === 0) {
            jsonEnd = i + 1
            break
          }
        }
      }
      
      if (jsonEnd === -1) {
        throw new Error('Incomplete JSON object in response')
      }
      
      const jsonStr = cleanResponse.substring(jsonStart, jsonEnd)
      logger.debug(`[CriticAgent] Extracted JSON string`, {
        jsonLength: jsonStr.length,
        jsonPreview: jsonStr.substring(0, 200)
      })
      
      const parsed = JSON.parse(jsonStr)
      
      // Build Critique object from parsed JSON
      const followUpQuestions: FollowUpQuestion[] = (parsed.followUpQuestions || []).map((q: any, idx: number) => ({
        id: q.id || `question-${idx + 1}`,
        question: q.question || '',
        category: (q.category || 'missing-info') as FollowUpQuestion['category'],
        priority: (q.priority || 'medium') as FollowUpQuestion['priority'],
        userAnswer: userFeedback?.find(f => f.questionId === (q.id || `question-${idx + 1}`))?.answer,
      }))

      const issues: CritiqueIssue[] = (parsed.issues || []).map((issue: any) => ({
        severity: (issue.severity || 'medium') as CritiqueIssue['severity'],
        category: (issue.category || 'logic') as CritiqueIssue['category'],
        description: issue.description || '',
        suggestion: issue.suggestion || 'Review and fix',
        affectedSteps: issue.affectedSteps || undefined,
      }))

      // Task 3.3: Fix score calculation - handle 0 values properly
      const overallScoreRaw = parsed.overallScore
      const clampedOverallScore = this.clampScore(overallScoreRaw)
      
      // Log score parsing for debugging
      logger.debug(`[CriticAgent] Score parsing`, {
        rawOverallScore: overallScoreRaw,
        clampedOverallScore,
        rawFeasibility: parsed.feasibilityScore,
        rawCorrectness: parsed.correctnessScore,
        rawEfficiency: parsed.efficiencyScore,
        rawSafety: parsed.safetyScore,
      })
      
      // If overall score is 0 or missing, check if other scores provide guidance
      // This handles cases where LLM might return 0 for dynamic-fix scenarios
      const finalOverallScore = (overallScoreRaw === 0 || overallScoreRaw === null || overallScoreRaw === undefined)
        ? Math.max(
            this.clampScore(parsed.feasibilityScore || 0),
            this.clampScore(parsed.correctnessScore || 0),
            this.clampScore(parsed.efficiencyScore || 0),
            this.clampScore(parsed.safetyScore || 0),
            0.3 // Minimum score to avoid 0
          )
        : clampedOverallScore

      const critique: Critique = {
        id: `critique-${Date.now()}`,
        planId,
        overallScore: finalOverallScore,
        feasibilityScore: this.clampScore(parsed.feasibilityScore),
        correctnessScore: this.clampScore(parsed.correctnessScore),
        efficiencyScore: this.clampScore(parsed.efficiencyScore),
        safetyScore: this.clampScore(parsed.safetyScore),
        issues,
        followUpQuestions,
        strengths: parsed.strengths || [],
        suggestions: parsed.suggestions || [],
        recommendation: this.determineRecommendation(finalOverallScore),
        rationale: parsed.rationale || 'No rationale provided',
      }

      logger.debug(`[CriticAgent] Successfully parsed JSON critique`, {
        recommendation: critique.recommendation,
        issuesCount: critique.issues.length
      })
      
      return critique
    } catch (parseError: any) {
      // JSON parsing failed, create fallback critique
      logger.warn(`[CriticAgent] JSON parse failed: ${parseError?.message}`)
      
      return {
        id: `critique-${Date.now()}`,
        planId,
        overallScore: 0.5,
        feasibilityScore: 0.5,
        correctnessScore: 0.5,
        efficiencyScore: 0.5,
        safetyScore: 0.5,
        issues: [{
          severity: 'high',
          category: 'logic',
          description: 'Failed to parse critique response from LLM',
          suggestion: 'Please review the plan manually',
        }],
        followUpQuestions: [],
        strengths: [],
        suggestions: [],
        recommendation: 'revise',
        rationale: 'Failed to generate proper critique. Manual review recommended.',
      }
    }
  }

  /**
   * Clamp score to valid range (0-1)
   */
  private clampScore(score: any): number {
    if (typeof score !== 'number' || isNaN(score)) {
      return 0.5
    }
    return Math.max(0, Math.min(1, score))
  }

  /**
   * Determine recommendation based on overall score
   */
  private determineRecommendation(overallScore: number): 'approve' | 'revise' | 'reject' {
    if (overallScore >= this.APPROVAL_THRESHOLD) {
      return 'approve'
    } else if (overallScore >= this.REVISION_THRESHOLD) {
      return 'revise'
    } else {
      return 'reject'
    }
  }

  /**
   * Check if a plan can be fixed dynamically during execution
   * 
   * A plan can be fixed dynamically if:
   * - A step has missing required parameters
   * - BUT an earlier step can provide those parameters (via list/search operations)
   * 
   * @param plan - Plan to check
   * @param missingParams - List of missing parameters
   * @param mcpContext - MCP context for tool information
   * @returns true if plan can be fixed dynamically
   */
  private canBeFixedDynamically(
    plan: Plan,
    missingParams: Array<{ stepId: string; stepOrder: number; tool: string; missingParam: string; isRequired: boolean }>,
    mcpContext: MCPContext
  ): boolean {
    // Group missing params by step
    const missingByStep = new Map<number, Array<{ stepId: string; tool: string; missingParam: string }>>()
    
    for (const missing of missingParams) {
      if (!missing.isRequired) continue // Only consider required params
      
      if (!missingByStep.has(missing.stepOrder)) {
        missingByStep.set(missing.stepOrder, [])
      }
      missingByStep.get(missing.stepOrder)!.push({
        stepId: missing.stepId,
        tool: missing.tool,
        missingParam: missing.missingParam
      })
    }

    // For each step with missing params, check if earlier steps can provide them
    for (const [stepOrder, missing] of Array.from(missingByStep.entries())) {
      const currentStep = plan.steps.find(s => s.order === stepOrder)
      if (!currentStep) continue

      // Check earlier steps (steps with order < stepOrder)
      const earlierSteps = plan.steps.filter(s => s.order < stepOrder)
      
      for (const missingParam of missing) {
        // Check if any earlier step uses a tool that can provide this parameter
        // Common patterns:
        // - list_* tools that return arrays with IDs
        // - search_* tools that return objects with IDs
        // - get_* tools that return single objects
        let canProvide = false
        
        for (const earlierStep of earlierSteps) {
          const earlierAction = earlierStep.action.toLowerCase()
          
          // Check if earlier step action suggests it can provide IDs/data
          if (
            earlierAction.includes('list') ||
            earlierAction.includes('search') ||
            earlierAction.includes('get') ||
            earlierAction.includes('find')
          ) {
            // Check if the missing param name suggests it's an ID that can be extracted
            const paramLower = missingParam.missingParam.toLowerCase()
            if (
              paramLower.includes('id') ||
              paramLower.includes('identifier') ||
              paramLower.includes('key')
            ) {
              canProvide = true
              break
            }
          }
        }

        if (!canProvide) {
          // At least one required param cannot be provided by earlier steps
          return false
        }
      }
    }

    // All missing required params can be provided by earlier steps
    return missingByStep.size > 0
  }
}

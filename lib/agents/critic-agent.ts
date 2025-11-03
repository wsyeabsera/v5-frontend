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
import { Plan, Critique, CritiqueIssue, FollowUpQuestion, CriticAgentOutput, RequestContext, MCPContext } from '@/types'
import { logger } from '@/utils/logger'
import { listMCPTools } from '@/lib/mcp-prompts'

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
  "recommendation": "approve|revise|reject",
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

Remember: You are outputting JSON only, no text before or after the JSON object.`

  // Thresholds for recommendations
  private readonly APPROVAL_THRESHOLD = 0.8; // Score >= 0.8: approve
  private readonly REVISION_THRESHOLD = 0.6; // 0.6 <= score < 0.8: revise
  // Score < 0.6: reject

  constructor() {
    super('critic-agent')
  }

  /**
   * Fetch MCP context (tools)
   * 
   * @returns MCP context information
   */
  async fetchMCPContext(): Promise<MCPContext> {
    try {
      const tools = await listMCPTools().catch(() => [])

      logger.debug(`[CriticAgent] Fetched MCP context`, {
        toolsCount: tools.length,
      })

      return {
        tools,
        resources: [],
        prompts: [],
      }
    } catch (error: any) {
      logger.error(`[CriticAgent] Failed to fetch MCP context:`, error)
      return { tools: [], resources: [], prompts: [] }
    }
  }

  /**
   * Build enhanced system prompt with context
   * 
   * Dynamically constructs system prompt with MCP tools context.
   * 
   * @param mcpContext - MCP tools context
   * @returns Enhanced system prompt
   */
  private buildEnhancedSystemPrompt(mcpContext: MCPContext): string {
    let prompt = this.baseSystemPrompt + '\n\n'

    // Add MCP tools context (critical for feasibility checks)
    if (mcpContext.tools.length > 0) {
      prompt += '## Available MCP Tools\n\n'
      prompt += '⚠️ CRITICAL: Verify that all tools referenced in the plan actually exist below.\n\n'
      
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
   * @returns CriticAgentOutput with critique and recommendation
   */
  async critiquePlan(
    plan: Plan,
    userQuery: string,
    requestContext: RequestContext,
    userFeedback?: { questionId: string; answer: string }[]
  ): Promise<CriticAgentOutput> {
    // Step 1: Add this agent to the request chain
    const updatedContext = this.addToChain(requestContext)

    // Step 2: Fetch MCP context
    const mcpContext = await this.fetchMCPContext()

    // Step 3: Build enhanced system prompt
    const enhancedSystemPrompt = this.buildEnhancedSystemPrompt(mcpContext)

    // Step 4: Build the prompt for the LLM
    const prompt = this.buildCritiquePrompt(plan, userQuery, mcpContext, userFeedback)

    // Step 5: Call LLM
    const messages = [
      { role: 'system' as const, content: enhancedSystemPrompt },
      { role: 'user' as const, content: prompt },
    ]

    logger.debug(`[CriticAgent] Critiquing plan`, {
      requestId: updatedContext.requestId,
      planId: plan.id,
      stepsCount: plan.steps.length,
      hasUserFeedback: !!userFeedback,
    })

    const response = await this.callLLM(messages, {
      temperature: 0.3, // Critical analysis - be precise, less creative
      maxTokens: 2000,
      responseFormat: { type: 'json_object' } // Force JSON output
    })

    // Step 6: Parse the structured response
    const critique = this.parseCritiqueResponse(response, plan.id, userFeedback)

    // Step 7: Build output with Request ID
    const output: CriticAgentOutput = {
      // Agent output base
      requestId: updatedContext.requestId,
      agentName: 'critic-agent',
      timestamp: new Date(),
      requestContext: updatedContext,

      // Critic-specific output
      critique,
      planId: plan.id,
      requiresUserFeedback: critique.followUpQuestions.some(q => !q.userAnswer),
    }

    logger.info(`[CriticAgent] Plan critiqued`, {
      requestId: output.requestId,
      planId: plan.id,
      overallScore: critique.overallScore.toFixed(2),
      recommendation: critique.recommendation,
      issuesCount: critique.issues.length,
      questionsCount: critique.followUpQuestions.length,
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
    userFeedback?: { questionId: string; answer: string }[]
  ): string {
    let prompt = `User Query: "${userQuery}"\n\n`

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

      const critique: Critique = {
        id: `critique-${Date.now()}`,
        planId,
        overallScore: this.clampScore(parsed.overallScore),
        feasibilityScore: this.clampScore(parsed.feasibilityScore),
        correctnessScore: this.clampScore(parsed.correctnessScore),
        efficiencyScore: this.clampScore(parsed.efficiencyScore),
        safetyScore: this.clampScore(parsed.safetyScore),
        issues,
        followUpQuestions,
        strengths: parsed.strengths || [],
        suggestions: parsed.suggestions || [],
        recommendation: this.determineRecommendation(parsed.overallScore || 0.5),
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
}

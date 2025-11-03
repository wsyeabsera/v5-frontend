/**
 * Error Handler - LLM-Driven Error Recovery
 * 
 * Analyzes errors in full context and makes intelligent recovery decisions
 */

import { ExecutionState, ErrorDecision } from '../types'
import { ExecutionResult } from '@/types'
import { logger } from '@/utils/logger'
import { formatMCPToolsForPrompt, findToolByName, getToolParameters } from '../utils/tool-schema-formatter'
import { createInternalAgent, InternalLLMAgent } from '../utils/internal-llm-agent'

export class ErrorHandler {
  private agent: InternalLLMAgent
  
  /**
   * Build dynamic system prompt with MCP context
   */
  private buildSystemPrompt(mcpContext?: any): string {
    const basePrompt = `You are an Error Recovery Agent. Your job is to analyze execution errors and decide how to recover intelligently.

When an error occurs, you consider:
1. The full execution context (what worked, what failed)
2. The user's goal and intent
3. Available MCP tools (from schemas below) for alternative approaches
4. Whether retrying would help
5. If adaptation is needed (try different tool, different parameters)
6. When to ask the user for help

You make intelligent decisions - no fixed retry counts, no static rules.
Analyze the context and decide what's best.
If a tool call fails, consider:
- Was parameter format wrong? (check tool schema)
- Is there an alternative tool that could work?
- Do we need to lookup an ID first using a list/search tool?
- Should we retry with corrected parameters?

Respond with JSON only:
{
  "decision": "retry|ask-user|adapt|skip",
  "reason": "Why this decision",
  "adaptation"?: {
    "stepId": "step-id",
    "originalAction": "original tool",
    "adaptedAction": "new tool from available MCP tools",
    "reason": "Why adaptation needed"
  },
  "retryCount"?: number,
  "maxRetries"?: number
}`

    // Add MCP tool schemas dynamically
    const mcpToolsSection = formatMCPToolsForPrompt(mcpContext)
    
    return basePrompt + mcpToolsSection
  }

  constructor() {
    // Use executor-agent config (same as main executor)
    this.agent = createInternalAgent('executor-agent')
  }

  /**
   * Handle error with LLM-driven decision and MCP context
   */
  async handleError(
    error: string,
    errorType: string,
    step: any,
    state: ExecutionState,
    stepResult: ExecutionResult
  ): Promise<ErrorDecision> {
    // Check tool schema to understand what went wrong
    const tool = findToolByName(state.mcpContext, step.action)
    const toolParams = tool ? getToolParameters(tool) : null
    
    let toolInfo = ''
    if (tool) {
      toolInfo = `\nTOOL SCHEMA:
- Tool: ${tool.name}
- Required parameters: ${toolParams?.required.join(', ') || 'none'}
- Parameters used: ${JSON.stringify(step.parameters || {})}
- Missing required params: ${toolParams?.required.filter(p => !step.parameters || !step.parameters[p]).join(', ') || 'none'}`
    }

    const prompt = `ERROR ANALYSIS

USER'S GOAL: ${state.plan.goal}

ERROR CONTEXT:
- Step: ${step.order}. ${step.description}
- Action: ${step.action}
- Parameters: ${JSON.stringify(step.parameters || {})}
- Error: ${error}
- Error Type: ${errorType}
${toolInfo}

EXECUTION HISTORY:
- Steps completed: ${state.executionResults.length}/${state.plan.steps.length}
- Previous errors: ${state.errors.length}
- Successful steps: ${state.executionResults.filter(r => r.success).length}
- Retry attempts: ${stepResult.retries}

PREVIOUS STEP RESULTS:
${Object.keys(state.partialResults).length > 0
  ? Object.entries(state.partialResults)
      .map(([stepId, result]) => {
        const stepInfo = state.plan.steps.find(s => s.id === stepId)
        const resultPreview = typeof result === 'string'
          ? result.substring(0, 150)
          : JSON.stringify(result).substring(0, 150)
        return `Step ${stepInfo?.order || stepId}: ${resultPreview}...`
      })
      .join('\n')
  : 'No previous results'}

ERROR ANALYSIS QUESTIONS:
1. What caused this error? Check if required parameters were missing or incorrect format
2. Would retrying help? (Is it transient or systematic?)
3. Can we adapt the approach? 
   - Is there an alternative tool in available MCP tools?
   - Do we need to use a lookup tool first (e.g., if error says "not found", maybe we need list/search first)?
   - Should we correct parameter names/values based on tool schema?
4. Do we need user input? (Missing information that can't be inferred?)
5. Should we skip and continue? (Is this step critical?)

Make an intelligent decision based on the full context and available MCP tools.`

    try {
      await this.agent.initialize()
      
      // Build system prompt with dynamic MCP context
      const systemPrompt = this.buildSystemPrompt(state.mcpContext)
      
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: prompt },
      ]

      const response = await this.agent.callLLMPublic(messages, {
        temperature: 0.3,
        maxTokens: 1500,
        responseFormat: { type: 'json_object' },
      })

      // Parse JSON response
      const cleanResponse = response.trim()
      let jsonStart = cleanResponse.indexOf('{')
      if (jsonStart === -1) {
        throw new Error('No JSON object found in error decision response')
      }

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
        throw new Error('Incomplete JSON object in error decision response')
      }

      const jsonStr = cleanResponse.substring(jsonStart, jsonEnd)
      const decision = JSON.parse(jsonStr)

      logger.info(`[ErrorHandler] Error decision`, {
        stepId: step.id,
        decision: decision.decision,
        reason: decision.reason,
      })

      return {
        decision: decision.decision || 'ask-user',
        reason: decision.reason || 'Error occurred, defaulting to ask user',
        adaptation: decision.adaptation,
        retryCount: decision.retryCount,
        maxRetries: decision.maxRetries || 3,
      }
    } catch (error: any) {
      logger.error(`[ErrorHandler] Failed to get error decision`, {
        error: error.message,
      })

      // Default to asking user for high-priority errors
      return {
        decision: 'ask-user',
        reason: 'Failed to analyze error automatically',
      }
    }
  }
}


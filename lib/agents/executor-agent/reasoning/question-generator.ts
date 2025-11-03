/**
 * Question Generator - Context-Rich Question Generation
 * 
 * Generates intelligent questions based on execution context, not static rules
 */

import { ExecutionState, StepExecutionContext } from '../types'
import { ExecutionFollowUpQuestion } from '@/types'
import { logger } from '@/utils/logger'
import { formatMCPToolsForPrompt, findToolByName, getToolParameters } from '../utils/tool-schema-formatter'
import { createInternalAgent, InternalLLMAgent } from '../utils/internal-llm-agent'

export class QuestionGenerator {
  private agent: InternalLLMAgent
  
  /**
   * Build dynamic system prompt with MCP context
   */
  private buildSystemPrompt(mcpContext?: any): string {
    const basePrompt = `You are a Question Generation Agent. Your job is to generate context-rich, helpful questions when the executor needs user input.

You understand:
- The user's goal and intent
- What's been tried so far
- What information is needed based on tool schemas (below)
- Why it's needed (context)
- Available MCP tools that might help retrieve missing data

Your questions are:
- Specific and actionable
- Context-rich (explain what failed, what was tried, current state)
- Helpful (provide suggestions, reference available tools if relevant)
- Appropriately prioritized based on impact

When asking for missing data:
- Reference the exact parameter name from tool schema
- Explain why it's needed (what tool/step requires it)
- Suggest what format/value would work (based on tool schema type)

Respond with JSON only:
{
  "question": "Clear, specific question",
  "category": "missing-data|error-recovery|coordination|ambiguity|user-choice",
  "priority": "low|medium|high",
  "context": {
    "stepId": "step-id",
    "stepOrder": number,
    "whatFailed": "What went wrong",
    "whatWasTried": "What was attempted",
    "currentState": "Current execution state",
    "suggestion": "What the user should provide"
  }
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
   * Generate question based on error
   */
  async generateErrorQuestion(
    error: string,
    errorType: string,
    step: any,
    state: ExecutionState
  ): Promise<ExecutionFollowUpQuestion | null> {
    // Check tool schema to understand what might be missing
    const tool = findToolByName(state.mcpContext, step.action)
    const toolParams = tool ? getToolParameters(tool) : null
    
    let toolInfo = ''
    if (tool) {
      toolInfo = `\nTOOL INFORMATION:
- Tool: ${tool.name}
- Required parameters: ${toolParams?.required.join(', ') || 'none'}
- Parameters used: ${JSON.stringify(step.parameters || {})}
- Missing required: ${toolParams?.required.filter(p => !step.parameters || !step.parameters[p]).join(', ') || 'none'}`
    }

    const prompt = `GENERATE QUESTION FOR ERROR

USER'S GOAL: ${state.plan.goal}

ERROR CONTEXT:
- Step: ${step.order}. ${step.description}
- Action: ${step.action}
- Error: ${error}
- Error Type: ${errorType}
${toolInfo}

EXECUTION STATUS:
- Steps completed: ${state.executionResults.length}/${state.plan.steps.length}
- Previous attempts: What has been tried
- Current state: What we know so far

What information do we need from the user to recover?
Check tool schema to understand what parameters are required.
Generate a helpful, context-rich question that references exact parameter names from tool schema if relevant.`

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
        maxTokens: 1000,
        responseFormat: { type: 'json_object' },
      })

      // Parse JSON response
      const cleanResponse = response.trim()
      let jsonStart = cleanResponse.indexOf('{')
      if (jsonStart === -1) {
        return null
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
        return null
      }

      const jsonStr = cleanResponse.substring(jsonStart, jsonEnd)
      const questionData = JSON.parse(jsonStr)

      const question: ExecutionFollowUpQuestion = {
        id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        question: questionData.question,
        category: questionData.category || 'error-recovery',
        priority: questionData.priority || 'medium',
        context: {
          stepId: step.id,
          stepOrder: step.order,
          whatFailed: questionData.context?.whatFailed || error,
          whatWasTried: questionData.context?.whatWasTried || 'Attempted to execute step',
          currentState: questionData.context?.currentState || `Step ${step.order} failed`,
          suggestion: questionData.context?.suggestion || 'Please provide the required information',
        },
      }

      logger.info(`[QuestionGenerator] Generated question`, {
        questionId: question.id,
        category: question.category,
        priority: question.priority,
      })

      return question
    } catch (error: any) {
      logger.error(`[QuestionGenerator] Failed to generate question`, {
        error: error.message,
      })
      return null
    }
  }

  /**
   * Generate question for missing data
   */
  async generateMissingDataQuestion(
    context: StepExecutionContext,
    missingParams: string[]
  ): Promise<ExecutionFollowUpQuestion | null> {
    const { step, state } = context

    // Check tool schema to understand what's needed
    const tool = findToolByName(state.mcpContext, step.action)
    const toolParams = tool ? getToolParameters(tool) : null
    
    let toolInfo = ''
    if (tool) {
      const missingParamDetails = missingParams.map(param => {
        const paramDetail = toolParams?.all.find(p => p.name === param)
        return paramDetail 
          ? `${param} (${paramDetail.schema.type || 'unknown type'}${paramDetail.required ? ', REQUIRED' : ''})`
          : param
      }).join(', ')
      
      toolInfo = `\nTOOL INFORMATION:
- Tool: ${tool.name}
- Missing required parameters: ${missingParamDetails}`
    }

    const prompt = `GENERATE QUESTION FOR MISSING DATA

USER'S GOAL: ${state.plan.goal}

STEP CONTEXT:
- Step: ${step.order}. ${step.description}
- Action: ${step.action}
- Missing Parameters: ${missingParams.join(', ')}
${toolInfo}

EXECUTION STATUS:
- Steps completed: ${state.executionResults.length}/${state.plan.steps.length}
- Previous results: What we know from previous steps

What information do we need from the user to proceed?
Check tool schema to understand parameter types and requirements.
Generate a helpful question with context about why it's needed. Reference exact parameter names from tool schema.`

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
        maxTokens: 1000,
        responseFormat: { type: 'json_object' },
      })

      // Parse JSON response
      const cleanResponse = response.trim()
      let jsonStart = cleanResponse.indexOf('{')
      if (jsonStart === -1) {
        return null
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
        return null
      }

      const jsonStr = cleanResponse.substring(jsonStart, jsonEnd)
      const questionData = JSON.parse(jsonStr)

      const question: ExecutionFollowUpQuestion = {
        id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        question: questionData.question,
        category: 'missing-data',
        priority: questionData.priority || 'medium',
        context: {
          stepId: step.id,
          stepOrder: step.order,
          whatFailed: `Missing required parameters: ${missingParams.join(', ')}`,
          whatWasTried: 'Attempted to extract from previous steps',
          currentState: `Step ${step.order} requires additional information`,
          suggestion: questionData.context?.suggestion || 'Please provide the missing parameters',
        },
      }

      return question
    } catch (error: any) {
      logger.error(`[QuestionGenerator] Failed to generate missing data question`, {
        error: error.message,
      })
      return null
    }
  }
}


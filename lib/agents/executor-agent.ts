/**
 * Executor Agent
 * 
 * Executes plans step-by-step with LLM-powered decision-making for error handling,
 * tool coordination, and adaptive execution. Similar to Cursor's execution model.
 * 
 * How it works:
 * 1. Receives plan from Planner Agent (with Request ID)
 * 2. Optionally receives critique from Critic Agent
 * 3. Executes steps in dependency order
 * 4. Uses LLM to handle errors, coordinate tools, and generate questions
 * 5. Asks context-rich follow-up questions when needed
 * 6. Stores execution versions in MongoDB
 */

import { BaseAgent } from './base-agent'
import { Plan, PlanStep, ExecutorAgentOutput, ExecutionResult, ExecutionFollowUpQuestion, PlanExecutionResult, RequestContext, CriticAgentOutput, MCPContext } from '@/types'
import { logger } from '@/utils/logger'
import { listMCPTools } from '@/lib/mcp-prompts'

/**
 * Server-side MCP tool caller
 * (Cannot use client-side mcpClient in server-side code)
 */
const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'http://localhost:3000/sse'

let requestId = 0

async function serverMCPRequest(method: string, params: any = {}): Promise<any> {
  requestId++
  
  const response = await fetch(MCP_SERVER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: requestId,
      method,
      params,
    }),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(data.error.message || 'MCP request failed')
  }

  return data.result
}

async function callMCPToolServer(name: string, args: any): Promise<any> {
  const result = await serverMCPRequest('tools/call', { name, arguments: args })
  return {
    message: 'Success',
    tools: [name],
    result: result.content || result,
  }
}

/**
 * Executor Agent Class
 * 
 * Extends BaseAgent to provide execution capabilities.
 */
export class ExecutorAgent extends BaseAgent {
  /**
   * Base system prompt that guides the Executor Agent's behavior
   */
  private readonly baseSystemPrompt = `You are an Execution Agent - you execute action plans step-by-step with intelligence and adaptability.

Your job is to:
1. Execute plan steps in the correct order (respecting dependencies)
2. Coordinate between steps (extract data from previous results)
3. Handle errors gracefully (decide: retry, ask user, adapt, or skip)
4. Generate context-rich questions when information is missing
5. Validate tool outputs before proceeding to next step
6. Adapt plans when unexpected situations occur

CRITICAL EXECUTION PRINCIPLES:
- Always respect step dependencies - never execute a step until its dependencies complete
- Extract values from previous step results intelligently (e.g., if step 1 returns array, extract the right element)
- When errors occur, provide context: what failed, what was tried, current state
- Ask questions only when genuinely needed - avoid unnecessary pauses
- Auto-execute low-risk steps, pause for high-risk operations
- When one tool output doesn't match expected format, adapt the next step

FORMAT REQUIREMENTS:

When generating questions, respond with ONLY a valid JSON object:
{
  "question": "Clear, specific question",
  "category": "missing-data|error-recovery|coordination|ambiguity|user-choice",
  "priority": "low|medium|high",
  "suggestion": "What the user should provide"
}

When deciding error handling, respond with ONLY a valid JSON object:
{
  "decision": "retry|ask-user|adapt|skip",
  "reason": "Why this decision",
  "adaptation"?: {
    "stepId": "step-id",
    "originalAction": "original tool",
    "adaptedAction": "new tool or approach",
    "reason": "Why adaptation needed"
  },
  "retryCount"?: number,
  "maxRetries": 3
}

When coordinating steps, respond with ONLY a valid JSON object:
{
  "extractedValues": {
    "parameterName": "extracted value"
  },
  "validation": {
    "isValid": true|false,
    "issues": ["issue 1", "issue 2"]
  }
}

Remember: You are outputting JSON only, no text before or after the JSON object.`

  // Configuration constants
  private readonly MAX_RETRIES = 3
  private readonly RETRY_DELAY = 1000
  private readonly LOW_RISK_THRESHOLD = 0.3
  private readonly HIGH_RISK_THRESHOLD = 0.7

  constructor() {
    super('executor-agent')
  }

  /**
   * Fetch MCP context (tools)
   */
  async fetchMCPContext(): Promise<MCPContext> {
    try {
      const tools = await listMCPTools().catch(() => [])

      logger.debug(`[ExecutorAgent] Fetched MCP context`, {
        toolsCount: tools.length,
      })

      return {
        tools,
        resources: [],
        prompts: [],
      }
    } catch (error: any) {
      logger.error(`[ExecutorAgent] Failed to fetch MCP context:`, error)
      return { tools: [], resources: [], prompts: [] }
    }
  }

  /**
   * Execute a complete plan
   * 
   * Main entry point for plan execution. Handles dependency resolution,
   * step execution loop, error handling, and state management.
   */
  async executePlan(
    plan: Plan,
    requestContext: RequestContext,
    critique?: CriticAgentOutput,
    userFeedback?: { questionId: string; answer: string }[]
  ): Promise<ExecutorAgentOutput> {
    // Step 1: Add this agent to the request chain
    const updatedContext = this.addToChain(requestContext)

    // Step 2: Check critique recommendation
    if (critique) {
      // Only reject if recommendation is 'reject' (not 'approve-with-dynamic-fix')
      if (critique.critique.recommendation === 'reject') {
        throw new Error(`Plan rejected by critic: ${critique.critique.rationale}`)
      }
      // approve, revise, and approve-with-dynamic-fix all allow execution to proceed
    }

    // Step 3: Initialize execution state
    const startTime = Date.now()
    const executionResults: ExecutionResult[] = []
    const partialResults: Record<string, any> = {}
    const errors: string[] = []
    const questionsAsked: ExecutionFollowUpQuestion[] = []
    const adaptations: PlanExecutionResult['adaptations'] = []
    const planUpdates: PlanExecutionResult['planUpdates'] = []
    const executedSteps = new Set<string>()

    // Step 4: Get ready steps (no dependencies or all dependencies satisfied)
    let readySteps = this.getReadySteps(plan.steps, executedSteps)

    // Step 5: Execute steps in loop
    while (readySteps.length > 0) {
      for (const step of readySteps) {
        try {
          // Check if we should ask questions upfront (critical missing info)
          if (this.shouldAskQuestionUpfront(step, critique)) {
            const question = await this.generateUpfrontQuestion(step, plan, critique)
            if (question) {
              questionsAsked.push(question)
              // If critical question, pause execution
              if (question.priority === 'high') {
                logger.info(`[ExecutorAgent] Pausing execution for critical question`, {
                  requestId: updatedContext.requestId,
                  stepId: step.id,
                  questionId: question.id,
                })
                
                return this.createPartialOutput(
                  plan,
                  updatedContext,
                  executionResults,
                  partialResults,
                  errors,
                  questionsAsked,
                  adaptations,
                  planUpdates,
                  startTime,
                  critique
                )
              }
            }
          }

          // Execute the step
          const stepExecution = await this.executeStep(
            step,
            plan,
            partialResults,
            critique,
            adaptations
          )

          executionResults.push(stepExecution.result)
          
          // Track plan update if parameters were updated
          if (stepExecution.planUpdate) {
            planUpdates.push(stepExecution.planUpdate)
          }

          if (stepExecution.result.success && stepExecution.result.result) {
            partialResults[step.id] = stepExecution.result.result
          } else if (stepExecution.result.error) {
            errors.push(`Step ${step.order}: ${stepExecution.result.error}`)
            
            // Handle error with LLM decision
            const errorDecision = await this.handleError(
              stepExecution.result.error,
              stepExecution.result.errorType || 'tool-error',
              step,
              plan,
              partialResults,
              executionResults.length
            )

            if (errorDecision.decision === 'ask-user') {
              const question = await this.generateQuestion(
                stepExecution.result.error,
                stepExecution.result.errorType || 'tool-error',
                step,
                partialResults,
                executionResults
              )
              if (question) {
                questionsAsked.push(question)
                // Pause execution for user input
                return this.createPartialOutput(
                  plan,
                  updatedContext,
                  executionResults,
                  partialResults,
                  errors,
                  questionsAsked,
                  adaptations,
                  planUpdates,
                  startTime,
                  critique
                )
              }
            } else if (errorDecision.decision === 'adapt' && errorDecision.adaptation) {
              adaptations.push(errorDecision.adaptation)
              // Continue with adapted plan
            } else if (errorDecision.decision === 'skip') {
              logger.warn(`[ExecutorAgent] Skipping step due to error`, {
                stepId: step.id,
                error: stepExecution.result.error,
              })
              // Mark as executed to avoid infinite loops
              executedSteps.add(step.id)
              continue
            }
          }

          executedSteps.add(step.id)
        } catch (error: any) {
          logger.error(`[ExecutorAgent] Unexpected error executing step`, {
            stepId: step.id,
            error: error.message,
          })

          const errorResult: ExecutionResult = {
            stepId: step.id,
            stepOrder: step.order,
            success: false,
            error: error.message,
            errorType: 'tool-error',
            duration: 0,
            retries: 0,
            timestamp: new Date(),
            toolCalled: step.action,
            parametersUsed: step.parameters,
          }

          executionResults.push(errorResult)
          errors.push(`Step ${step.order}: ${error.message}`)
          executedSteps.add(step.id)
        }
      }

      // Get next ready steps
      readySteps = this.getReadySteps(plan.steps, executedSteps)
      
      // Check for deadlock
      if (readySteps.length === 0 && executedSteps.size < plan.steps.length) {
        const remainingSteps = plan.steps.filter(s => !executedSteps.has(s.id))
        errors.push(`Execution deadlock: Steps ${remainingSteps.map(s => s.order).join(', ')} cannot execute`)
        break
      }
    }

    // Step 6: Create final execution result
    const totalDuration = Date.now() - startTime
    const overallSuccess = errors.length === 0 && executedSteps.size === plan.steps.length

    const executionResult: PlanExecutionResult = {
      planId: plan.id,
      overallSuccess,
      steps: executionResults,
      partialResults,
      errors,
      totalDuration,
      questionsAsked,
      adaptations,
      planUpdates: planUpdates.length > 0 ? planUpdates : undefined,
    }

    return {
      requestId: updatedContext.requestId,
      agentName: 'executor-agent',
      timestamp: new Date(),
      requestContext: updatedContext,
      executionResult,
      planId: plan.id,
      requiresUserFeedback: questionsAsked.length > 0,
      critiqueAvailable: !!critique,
      critiqueRecommendation: critique?.critique.recommendation,
    }
  }

  /**
   * Execute a single plan step
   */
  private async executeStep(
    step: PlanStep,
    plan: Plan,
    partialResults: Record<string, any>,
    critique?: CriticAgentOutput,
    adaptations: PlanExecutionResult['adaptations'] = []
  ): Promise<{ result: ExecutionResult; planUpdate?: NonNullable<PlanExecutionResult['planUpdates']>[number] }> {
    const startTime = Date.now()
    let lastError: Error | null = null
    let retries = 0

    // Check if step was adapted
    const adaptation = adaptations.find(a => a.stepId === step.id)
    const actionToUse = adaptation?.adaptedAction || step.action

    // Coordinate parameters (extract from previous steps)
    const coordination = await this.coordinateSteps(
      step,
      partialResults,
      actionToUse
    )
    
    const coordinatedParams = coordination.parameters
    let planUpdate: NonNullable<PlanExecutionResult['planUpdates']>[number] | undefined = undefined
    
    // If parameters were updated, record the plan update
    if (coordination.wasUpdated) {
      // Determine reason based on what changed
      const changedParams = Object.keys(coordination.originalParameters).filter(k => 
        coordination.originalParameters[k] !== coordinatedParams[k]
      )
      
      const extractedParams = changedParams.filter(k => {
        const newVal = coordinatedParams[k]
        return newVal !== null && 
               newVal !== undefined &&
               (typeof newVal !== 'string' || !String(newVal).toLowerCase().includes('extracted'))
      })
      
      const failedExtractions = changedParams.filter(k => {
        const newVal = coordinatedParams[k]
        return (typeof newVal === 'string' && String(newVal).toLowerCase().includes('extracted')) ||
               newVal === null ||
               newVal === undefined
      })
      
      let reason = `Parameters extracted from previous step results during execution`
      if (failedExtractions.length > 0) {
        reason = `Attempted to extract parameters from previous step results. ${extractedParams.length > 0 ? 'Some values extracted successfully.' : 'Could not extract values - previous step returned empty or no matching data.'}`
      }
      
      planUpdate = {
        stepId: step.id,
        stepOrder: step.order,
        timestamp: new Date(),
        originalParameters: { ...coordination.originalParameters },
        updatedParameters: { ...coordinatedParams },
        reason
      }
      
      // Update the step's parameters in the plan (for reference, execution continues with coordinated params)
      step.parameters = coordinatedParams
      
      logger.info(`[ExecutorAgent] Plan updated during execution`, {
        stepId: step.id,
        stepOrder: step.order,
        updatedParams: changedParams,
        extractedSuccessfully: extractedParams,
        extractionFailed: failedExtractions,
      })
    }

    // Execute with retries
    while (retries < this.MAX_RETRIES) {
      try {
        // Call the tool (server-side)
        const result = await callMCPToolServer(actionToUse, coordinatedParams)

        const duration = Date.now() - startTime

        return {
          result: {
            stepId: step.id,
            stepOrder: step.order,
            success: true,
            result: result.result || result,
            duration,
            retries,
            timestamp: new Date(),
            toolCalled: actionToUse,
            parametersUsed: coordinatedParams,
          },
          planUpdate
        }
      } catch (error: any) {
        lastError = error
        retries++

        if (retries < this.MAX_RETRIES) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY))
          logger.debug(`[ExecutorAgent] Retrying step`, {
            stepId: step.id,
            retry: retries,
          })
        }
      }
    }

    const duration = Date.now() - startTime

    return {
      result: {
        stepId: step.id,
        stepOrder: step.order,
        success: false,
        error: lastError?.message || 'Execution failed after retries',
        errorType: this.categorizeError(lastError),
        duration,
        retries,
        timestamp: new Date(),
        toolCalled: actionToUse,
        parametersUsed: coordinatedParams,
      },
      planUpdate
    }
  }

  /**
   * Handle error with LLM decision
   */
  private async handleError(
    error: string,
    errorType: ExecutionResult['errorType'],
    step: PlanStep,
    plan: Plan,
    partialResults: Record<string, any>,
    currentStepCount: number
  ): Promise<{
    decision: 'retry' | 'ask-user' | 'adapt' | 'skip'
    reason: string
    adaptation?: PlanExecutionResult['adaptations'][0]
    retryCount?: number
  }> {
    const prompt = `Execution Error Analysis

ERROR: ${error}
ERROR TYPE: ${errorType}
STEP: ${step.order}. ${step.description}
ACTION: ${step.action}
PARAMETERS: ${JSON.stringify(step.parameters || {})}

CURRENT STATE:
- Steps completed: ${currentStepCount}
- Partial results available: ${Object.keys(partialResults).length > 0 ? 'Yes' : 'No'}
- Plan goal: ${plan.goal}

Analyze this error and decide the best recovery strategy. Respond with JSON only.`

    const messages = [
      { role: 'system' as const, content: this.baseSystemPrompt },
      { role: 'user' as const, content: prompt },
    ]

    try {
      const response = await this.callLLM(messages, {
        temperature: 0.3,
        maxTokens: 500,
        responseFormat: { type: 'json_object' },
      })

      const decision = JSON.parse(response)
      return decision
    } catch (error: any) {
      logger.error(`[ExecutorAgent] Failed to get error decision from LLM`, {
        error: error.message,
      })
      
      // Default to asking user for high-priority errors
      return {
        decision: 'ask-user',
        reason: 'Failed to analyze error automatically',
      }
    }
  }

  /**
   * Coordinate steps - extract data from previous step results
   * 
   * @param step - Step to coordinate
   * @param partialResults - Results from previous steps
   * @param actionToUse - Action/tool to use
   * @returns Updated parameters and whether plan was updated
   */
  private async coordinateSteps(
    step: PlanStep,
    partialResults: Record<string, any>,
    actionToUse: string
  ): Promise<{ parameters: Record<string, any>; wasUpdated: boolean; originalParameters: Record<string, any> }> {
    const originalParameters = { ...(step.parameters || {}) }
    const parameters = { ...originalParameters }

    // Check if any parameters reference previous steps (e.g., "$step-1.result.id")
    // OR if parameters are missing but can be extracted from previous results
    // OR if parameters contain placeholder values (e.g., "extracted_from_step_1", "extracted_facilityId_from_step_1")
    let needsCoordination = false
    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value === 'string') {
        if (value.startsWith('$')) {
          needsCoordination = true
          break
        }
        // Check for placeholder patterns
        if (value.toLowerCase().includes('extracted') || 
            value.toLowerCase().includes('from_step') ||
            value.toLowerCase().includes('placeholder') ||
            value.match(/extracted.*step/i)) {
          needsCoordination = true
          break
        }
      }
    }

    // Also check if parameters are missing/null/undefined (might be filled from previous steps)
    if (!needsCoordination && Object.keys(partialResults).length > 0) {
      // Check if any parameters are missing but could be extracted
      for (const [key, value] of Object.entries(parameters)) {
        if (value === null || value === undefined || value === '') {
          needsCoordination = true
          break
        }
      }
    }

    if (!needsCoordination) {
      return { parameters, wasUpdated: false, originalParameters }
    }

    // Use LLM to extract and validate values
    const prompt = `Step Coordination

CURRENT STEP:
- Step ID: ${step.id}
- Order: ${step.order}
- Action: ${actionToUse}
- Parameters: ${JSON.stringify(parameters)}

PREVIOUS STEP RESULTS:
${Object.entries(partialResults)
  .map(([stepId, result]) => `- ${stepId}: ${JSON.stringify(result)}`)
  .join('\n')}

Extract values from previous step results and populate parameters.
- If a parameter references "$step-X.result.path", extract that value.
- If a parameter is null, undefined, or empty, intelligently extract a matching value from previous results (e.g., if action needs "facilityId" and step 1 returned facilities list, extract the matching ID).
- Match parameter names to result structure (e.g., "facilityId" parameter → extract "id" from facility object in previous results).

Respond with JSON only containing extractedValues and validation.`

    const messages = [
      { role: 'system' as const, content: this.baseSystemPrompt },
      { role: 'user' as const, content: prompt },
    ]

    try {
      logger.debug(`[ExecutorAgent] Coordinating step parameters`, {
        stepId: step.id,
        stepOrder: step.order,
        hasPartialResults: Object.keys(partialResults).length > 0,
        parameterKeys: Object.keys(parameters),
      })

      const response = await this.callLLM(messages, {
        temperature: 0.2,
        maxTokens: 1000,
        responseFormat: { type: 'json_object' },
      })

      // Parse JSON response - handle potential formatting issues
      // Use same approach as CriticAgent and PlannerAgent for robust parsing
      let coordination: any
      try {
        const cleanResponse = response.trim()
        
        // Try to find the first complete JSON object
        let jsonStart = cleanResponse.indexOf('{')
        if (jsonStart === -1) {
          throw new Error('No JSON object found in coordination response')
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
          throw new Error('Incomplete JSON object in coordination response')
        }
        
        const jsonStr = cleanResponse.substring(jsonStart, jsonEnd)
        coordination = JSON.parse(jsonStr)
        
        logger.debug(`[ExecutorAgent] Parsed coordination JSON`, {
          stepId: step.id,
          jsonLength: jsonStr.length,
        })
      } catch (parseError: any) {
        logger.error(`[ExecutorAgent] Failed to parse coordination response`, {
          stepId: step.id,
          error: parseError.message,
          responsePreview: response.substring(0, 200),
        })
        throw new Error(`Failed to parse coordination response: ${parseError.message}`)
      }
      
      logger.debug(`[ExecutorAgent] Coordination response`, {
        stepId: step.id,
        extractedKeys: coordination.extractedValues ? Object.keys(coordination.extractedValues) : [],
        validationValid: coordination.validation?.isValid,
        hasExtractedValues: !!coordination.extractedValues,
      })
      
      // Merge extracted values into parameters
      const coordinated: Record<string, any> = { ...parameters }
      let wasUpdated = false
      
      if (coordination.extractedValues) {
        logger.debug(`[ExecutorAgent] Processing extracted values`, {
          stepId: step.id,
          extractedKeys: Object.keys(coordination.extractedValues),
          extractedValues: coordination.extractedValues,
        })
        
        // Check if any values were actually updated
        for (const [key, newValue] of Object.entries(coordination.extractedValues)) {
          const oldValue = coordinated[key]
          // Consider it updated if:
          // 1. Value changed and new value is not null/undefined
          // 2. Old value was a placeholder and new value is different (even if null, we tried)
          const isPlaceholder = typeof oldValue === 'string' && (
            oldValue.toLowerCase().includes('extracted') ||
            oldValue.toLowerCase().includes('from_step') ||
            oldValue.toLowerCase().includes('placeholder')
          )
          
          logger.debug(`[ExecutorAgent] Checking parameter update`, {
            stepId: step.id,
            parameter: key,
            oldValue,
            newValue,
            isPlaceholder,
            valuesEqual: oldValue === newValue,
          })
          
          if (oldValue !== newValue) {
            if (newValue !== null && newValue !== undefined && newValue !== '') {
              wasUpdated = true
              coordinated[key] = newValue
              logger.info(`[ExecutorAgent] Extracted parameter value`, {
                stepId: step.id,
                parameter: key,
                oldValue,
                newValue,
              })
            } else if (isPlaceholder) {
              // Still mark as updated even if extraction failed (we tried to extract)
              wasUpdated = true
              logger.warn(`[ExecutorAgent] Could not extract value for placeholder parameter`, {
                stepId: step.id,
                parameter: key,
                oldValue,
                extractedValue: newValue,
                reason: 'No matching data found in previous step results',
              })
              // Update coordinated params even if null (to track the attempt)
              coordinated[key] = newValue
            }
          } else if (isPlaceholder && newValue !== null && newValue !== undefined && newValue !== '') {
            // Special case: if old value is a placeholder and new value is provided (even if they're equal as strings somehow)
            wasUpdated = true
            coordinated[key] = newValue
            logger.info(`[ExecutorAgent] Extracted parameter value (replaced placeholder)`, {
              stepId: step.id,
              parameter: key,
              oldValue,
              newValue,
            })
          }
        }
      } else {
        logger.debug(`[ExecutorAgent] No extracted values in coordination response`, {
          stepId: step.id,
        })
      }

      // Validate
      if (coordination.validation && !coordination.validation.isValid) {
        logger.warn(`[ExecutorAgent] Coordination validation failed`, {
          issues: coordination.validation.issues,
        })
      }

      logger.debug(`[ExecutorAgent] Coordination complete`, {
        stepId: step.id,
        wasUpdated,
        originalParams: originalParameters,
        coordinatedParams: coordinated,
      })

      return { 
        parameters: coordinated, 
        wasUpdated, 
        originalParameters 
      }
    } catch (error: any) {
      logger.error(`[ExecutorAgent] Failed to coordinate steps`, {
        error: error.message,
      })
      
      // Fallback: simple variable substitution
      logger.warn(`[ExecutorAgent] Using fallback variable substitution`, {
        stepId: step.id,
        error: error.message,
      })
      
      const substituted = this.substituteVariables(parameters, partialResults)
      const substitutionChanged = JSON.stringify(parameters) !== JSON.stringify(substituted)
      
      // If we have placeholders, mark as updated even if substitution didn't work
      // This ensures we track the attempt (we tried to coordinate)
      const hasPlaceholders = Object.values(parameters).some(v => 
        typeof v === 'string' && (
          v.toLowerCase().includes('extracted') ||
          v.toLowerCase().includes('from_step') ||
          v.toLowerCase().includes('placeholder')
        )
      )
      
      // Mark as updated if:
      // 1. Substitution actually changed something, OR
      // 2. We have placeholders and partial results (we attempted coordination)
      const finalWasUpdated = substitutionChanged || (hasPlaceholders && Object.keys(partialResults).length > 0)
      
      if (finalWasUpdated) {
        logger.info(`[ExecutorAgent] Fallback coordination applied`, {
          stepId: step.id,
          substitutionChanged,
          hasPlaceholders,
          hasPartialResults: Object.keys(partialResults).length > 0,
        })
      }
      
      return { 
        parameters: substituted, 
        wasUpdated: finalWasUpdated, 
        originalParameters 
      }
    }
  }

  /**
   * Generate context-rich follow-up question
   */
  private async generateQuestion(
    error: string,
    errorType: ExecutionResult['errorType'],
    step: PlanStep,
    partialResults: Record<string, any>,
    executionResults: ExecutionResult[]
  ): Promise<ExecutionFollowUpQuestion | null> {
    const prompt = `Generate Context-Rich Question

ERROR: ${error}
ERROR TYPE: ${errorType}
STEP: ${step.order}. ${step.description}
ACTION: ${step.action}
PARAMETERS: ${JSON.stringify(step.parameters || {})}

WHAT WAS TRIED:
- Called tool: ${step.action}
- Parameters used: ${JSON.stringify(step.parameters || {})}
- Previous steps completed: ${executionResults.filter(r => r.success).length}

CURRENT STATE:
- Partial results available: ${Object.keys(partialResults).length > 0}
- Execution progress: ${executionResults.length} steps attempted

Generate a specific, actionable question that will help resolve this error. Include context about what failed and what was tried. Respond with JSON only.`

    const messages = [
      { role: 'system' as const, content: this.baseSystemPrompt },
      { role: 'user' as const, content: prompt },
    ]

    try {
      const response = await this.callLLM(messages, {
        temperature: 0.5,
        maxTokens: 300,
        responseFormat: { type: 'json_object' },
      })

      const questionData = JSON.parse(response)

      return {
        id: `exec-q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        question: questionData.question,
        category: questionData.category || 'error-recovery',
        priority: questionData.priority || 'medium',
        context: {
          stepId: step.id,
          stepOrder: step.order,
          whatFailed: error,
          whatWasTried: `Attempted to call ${step.action} with parameters: ${JSON.stringify(step.parameters || {})}`,
          currentState: `Executed ${executionResults.length} steps, ${executionResults.filter(r => r.success).length} succeeded`,
          suggestion: questionData.suggestion || 'Please provide the missing information or clarify your intent',
        },
      }
    } catch (error: any) {
      logger.error(`[ExecutorAgent] Failed to generate question`, {
        error: error.message,
      })
      return null
    }
  }

  /**
   * Generate upfront question for critical missing info
   */
  private async generateUpfrontQuestion(
    step: PlanStep,
    plan: Plan,
    critique?: CriticAgentOutput
  ): Promise<ExecutionFollowUpQuestion | null> {
    // Check if critique already asked this
    if (critique && critique.critique.followUpQuestions.length > 0) {
      const relevantQuestion = critique.critique.followUpQuestions.find(
        q => q.category === 'missing-info' && q.priority === 'high'
      )
      if (relevantQuestion) {
        return {
          id: relevantQuestion.id,
          question: relevantQuestion.question,
          category: 'missing-data',
          priority: relevantQuestion.priority,
          context: {
            stepId: step.id,
            stepOrder: step.order,
            whatFailed: 'Missing required information before execution',
            whatWasTried: 'Pre-execution validation',
            currentState: 'Plan execution not started',
            suggestion: 'Please provide the missing information to proceed',
          },
        }
      }
    }

    return null
  }

  /**
   * Check if should ask question upfront
   */
  private shouldAskQuestionUpfront(
    step: PlanStep,
    critique?: CriticAgentOutput
  ): boolean {
    // If critique recommends "approve-with-dynamic-fix", don't ask questions upfront
    // Let the coordination logic extract parameters from previous steps
    if (critique && critique.critique.recommendation === 'approve-with-dynamic-fix') {
      return false
    }

    // If critique flagged this step as having issues
    if (critique) {
      const stepIssues = critique.critique.issues.filter(
        issue => issue.affectedSteps?.includes(step.id)
      )
      if (stepIssues.some(issue => issue.severity === 'critical' || issue.severity === 'high')) {
        return true
      }

      // Check if critique has high-priority questions
      if (critique.critique.followUpQuestions.some(q => q.priority === 'high')) {
        return true
      }
    }

    return false
  }

  /**
   * Get ready steps (all dependencies satisfied)
   */
  private getReadySteps(
    steps: PlanStep[],
    executedSteps: Set<string>
  ): PlanStep[] {
    return steps.filter(step => {
      // Skip if already executed
      if (executedSteps.has(step.id)) return false

      // Check dependencies
      if (!step.dependencies || step.dependencies.length === 0) {
        return true // No dependencies
      }

      return step.dependencies.every(depId => executedSteps.has(depId))
    })
  }

  /**
   * Substitute variables in parameters (simple fallback)
   */
  private substituteVariables(
    parameters: Record<string, any>,
    partialResults: Record<string, any>
  ): Record<string, any> {
    const substituted: Record<string, any> = { ...parameters }

    for (const [key, value] of Object.entries(substituted)) {
      if (typeof value === 'string' && value.startsWith('$')) {
        // Variable reference: $step-1.result.id
        const match = value.match(/\$step-(\d+)\.(.+)/)
        if (match) {
          const stepId = `step-${match[1]}`
          const path = match[2]

          if (partialResults[stepId]) {
            const result = partialResults[stepId]
            // Simple path access
            const pathParts = path.split('.')
            let extractedValue = result
            for (const part of pathParts) {
              extractedValue = extractedValue?.[part]
            }
            substituted[key] = extractedValue
          }
        }
      }
    }

    return substituted
  }

  /**
   * Categorize error type
   */
  private categorizeError(error: Error | null): ExecutionResult['errorType'] {
    if (!error) return 'tool-error'

    const message = error.message.toLowerCase()
    
    if (message.includes('not found') || message.includes('does not exist')) {
      return 'missing-data'
    }
    if (message.includes('invalid') || message.includes('validation')) {
      return 'validation-error'
    }
    if (message.includes('dependency') || message.includes('coordinate')) {
      return 'coordination-error'
    }

    return 'tool-error'
  }

  /**
   * Create partial output (when pausing for user feedback)
   */
  private createPartialOutput(
    plan: Plan,
    requestContext: RequestContext,
    executionResults: ExecutionResult[],
    partialResults: Record<string, any>,
    errors: string[],
    questionsAsked: ExecutionFollowUpQuestion[],
    adaptations: PlanExecutionResult['adaptations'],
    planUpdates: PlanExecutionResult['planUpdates'],
    startTime: number,
    critique?: CriticAgentOutput
  ): ExecutorAgentOutput {
    const totalDuration = Date.now() - startTime

    const executionResult: PlanExecutionResult = {
      planId: plan.id,
      overallSuccess: false, // Partial execution
      steps: executionResults,
      partialResults,
      errors,
      totalDuration,
      questionsAsked,
      adaptations,
    }

    return {
      requestId: requestContext.requestId,
      agentName: 'executor-agent',
      timestamp: new Date(),
      requestContext,
      executionResult,
      planId: plan.id,
      requiresUserFeedback: true,
      critiqueAvailable: !!critique,
      critiqueRecommendation: critique?.critique.recommendation,
    }
  }
}


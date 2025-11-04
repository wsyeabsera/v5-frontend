/**
 * Step Executor
 * 
 * Executes individual plan steps with coordination and error handling
 */

import { ExecutionResult, PlanExecutionResult, Plan, PlanStep } from '@/types'
import { ExecutionState, StepExecutionContext } from '../types'
import { Coordinator } from '../reasoning/coordinator'
import { ErrorHandler } from '../reasoning/error-handler'
import { callMCPTool, validateToolParameters } from '../adapters/mcp-tool-adapter'
import { getMCPPrompt } from '@/lib/mcp-prompts'
import { findToolByName } from '../utils/tool-schema-formatter'
import { logger } from '@/utils/logger'
import { createInternalAgent, InternalLLMAgent } from '../utils/internal-llm-agent'

export class StepExecutor {
  private coordinator: Coordinator
  private errorHandler: ErrorHandler
  private llmAgent: InternalLLMAgent

  constructor() {
    this.coordinator = new Coordinator()
    this.errorHandler = new ErrorHandler()
    this.llmAgent = createInternalAgent('executor-agent')
  }

  /**
   * Execute a single step
   */
  async executeStep(
    context: StepExecutionContext
  ): Promise<{
    result: ExecutionResult
    planUpdate?: NonNullable<PlanExecutionResult['planUpdates']>[number]
  }> {
    const { step, state } = context
    const startTime = Date.now()
    let lastError: Error | null = null
    let retries = 0

    // Step 1: Check if coordination is needed (LLM-driven)
    const coordinationResult = await this.coordinator.shouldCoordinateStep(context)

    // Step 2: Coordinate parameters if needed
    const coordinationOutput =
      await this.coordinator.coordinateParameters(context, coordinationResult)

    // Task 1.1: Handle extraction impossible (empty arrays, etc.)
    if (coordinationOutput.extractionImpossible) {
      logger.warn(`[StepExecutor] Parameter extraction impossible: ${coordinationOutput.reason}`, {
        stepId: step.id,
        stepOrder: step.order,
      })

      // Return error result indicating question needed - execution engine will handle via error handler
      const executionResult: ExecutionResult = {
        stepId: step.id,
        stepOrder: step.order,
        success: false,
        error: coordinationOutput.reason || 'Cannot extract required parameters from previous step results. Previous step returned empty array - no data available to extract.',
        errorType: 'coordination-error',
        duration: Date.now() - startTime,
        retries: 0,
        timestamp: new Date(),
        toolCalled: step.action,
        parametersUsed: coordinationOutput.parameters,
      }

      return { result: executionResult }
    }

    const { parameters, wasUpdated, originalParameters } = coordinationOutput
    let coordinatedParams = parameters
    let planUpdate: NonNullable<PlanExecutionResult['planUpdates']>[number] | undefined

    // Record plan update if parameters were updated
    if (wasUpdated) {
      planUpdate = {
        stepId: step.id,
        stepOrder: step.order,
        timestamp: new Date(),
        originalParameters: { ...originalParameters },
        updatedParameters: { ...coordinatedParams },
        reason: coordinationResult.reasoning || 'Parameters extracted from previous step results during execution',
      }

      // Update step parameters in plan for reference
      step.parameters = coordinatedParams

      logger.info(`[StepExecutor] Plan updated during execution`, {
        stepId: step.id,
        stepOrder: step.order,
      })
    }

    // Task 1.3: Validate parameters before execution - reject placeholder values that were not extracted
    const hasPlaceholderValues = (params: Record<string, any>): boolean => {
      for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'string') {
          // Detect placeholder patterns
          if (value.toLowerCase().includes('extracted') ||
              value.toLowerCase().includes('from_step') ||
              value.toLowerCase().includes('placeholder') ||
              value.match(/extracted.*step/i)) {
            return true
          }
        }
      }
      return false
    }

    // Check if coordination output indicates remaining placeholders
    if (coordinationOutput.remainingPlaceholders && coordinationOutput.remainingPlaceholders.length > 0) {
      logger.warn(`[StepExecutor] Placeholder values remain after coordination - cannot execute`, {
        stepId: step.id,
        stepOrder: step.order,
        remainingPlaceholders: coordinationOutput.remainingPlaceholders,
      })

      // Return error result - execution engine will generate question
      const executionResult: ExecutionResult = {
        stepId: step.id,
        stepOrder: step.order,
        success: false,
        error: `Cannot execute step: required parameters still contain placeholder values that could not be extracted: ${coordinationOutput.remainingPlaceholders.join(', ')}`,
        errorType: 'coordination-error',
        duration: Date.now() - startTime,
        retries: 0,
        timestamp: new Date(),
        toolCalled: step.action,
        parametersUsed: coordinatedParams,
      }

      return { result: executionResult }
    }

    // Additional validation check (safety net)
    if (hasPlaceholderValues(coordinatedParams)) {
      logger.warn(`[StepExecutor] Placeholder values detected in parameters before execution`, {
        stepId: step.id,
        stepOrder: step.order,
        parameters: coordinatedParams,
      })

      const executionResult: ExecutionResult = {
        stepId: step.id,
        stepOrder: step.order,
        success: false,
        error: `Cannot execute step: parameters contain placeholder values that were not extracted`,
        errorType: 'coordination-error',
        duration: Date.now() - startTime,
        retries: 0,
        timestamp: new Date(),
        toolCalled: step.action,
        parametersUsed: coordinatedParams,
      }

      return { result: executionResult }
    }

    // Step 3: Validate parameters using MCP validation and resolve/infer missing params
    const validatedParams = await this.validateAndResolveParameters(
      step,
      coordinatedParams,
      state,
      context
    )

    if (!validatedParams.success) {
      // Validation failed - return error result
      const executionResult: ExecutionResult = {
        stepId: step.id,
        stepOrder: step.order,
        success: false,
        error: validatedParams.error || 'Parameter validation failed',
        errorType: 'validation-error',
        duration: Date.now() - startTime,
        retries: 0,
        timestamp: new Date(),
        toolCalled: step.action,
        parametersUsed: coordinatedParams,
      }

      return { result: executionResult }
    }

    // Update plan if parameters were resolved/inferred
    if (validatedParams.wasUpdated && validatedParams.updatedParameters) {
      const validationUpdate: NonNullable<PlanExecutionResult['planUpdates']>[number] = {
        stepId: step.id,
        stepOrder: step.order,
        timestamp: new Date(),
        originalParameters: { ...coordinatedParams },
        updatedParameters: { ...validatedParams.updatedParameters },
        reason: 'Parameters validated and resolved using MCP validation',
      }

      if (!planUpdate) {
        planUpdate = validationUpdate
      } else {
        // Merge with existing plan update
        planUpdate.updatedParameters = { ...validatedParams.updatedParameters }
        planUpdate.reason = `${planUpdate.reason}; Parameters validated and resolved using MCP validation`
      }

      // Update step parameters
      step.parameters = validatedParams.updatedParameters
      coordinatedParams = validatedParams.updatedParameters
    }

    // Step 4: Execute with intelligent retries
    let currentParams = coordinatedParams
    let lastErrorDecision: any = null
    
    // Check if this is a prompt/workflow template or a tool
    const isPrompt = state.mcpContext?.prompts?.some(p => p.name === step.action) || false
    const isTool = findToolByName(state.mcpContext, step.action) !== null
    
    while (retries < 3) {
      try {
        // Call prompt or tool based on what the action is
        let result: any
        if (isPrompt) {
          // This is a prompt/workflow template - call getMCPPrompt
          logger.info(`[StepExecutor] Executing prompt: ${step.action}`, {
            stepId: step.id,
            stepOrder: step.order,
            parameters: currentParams,
          })
          
          const promptResult = await getMCPPrompt(step.action, currentParams)
          
          // Prompts may return tool calls or direct results
          // If it returns tool calls, we might need to chain them, but for now, treat as result
          result = {
            message: 'Prompt executed successfully',
            tools: [step.action],
            result: promptResult,
          }
        } else if (isTool) {
          // This is a tool - call callMCPTool
          result = await callMCPTool(step.action, currentParams)
        } else {
          throw new Error(`Action "${step.action}" is neither a tool nor a prompt. Available tools: ${state.mcpContext?.tools?.map(t => t.name).join(', ') || 'none'}, Available prompts: ${state.mcpContext?.prompts?.map(p => p.name).join(', ') || 'none'}`)
        }

        const duration = Date.now() - startTime

        const executionResult: ExecutionResult = {
          stepId: step.id,
          stepOrder: step.order,
          success: true,
          result: result.result,
          duration,
          retries,
          timestamp: new Date(),
          toolCalled: step.action,
          parametersUsed: currentParams,
        }

        logger.info(`[StepExecutor] Step executed successfully`, {
          stepId: step.id,
          stepOrder: step.order,
          duration,
          retries,
        })

        return { result: executionResult, planUpdate }
      } catch (error: any) {
        lastError = error
        retries++

        // Build temporary error result for error handler
        const tempErrorResult: ExecutionResult = {
          stepId: step.id,
          stepOrder: step.order,
          success: false,
          error: error.message,
          errorType: 'tool-error',
          duration: Date.now() - startTime,
          retries: retries - 1,
          timestamp: new Date(),
          toolCalled: step.action,
          parametersUsed: currentParams,
        }

        // Consult error handler for intelligent recovery decision
        try {
          const errorDecision = await this.errorHandler.handleError(
            error.message,
            'tool-error',
            step,
            context.state,
            tempErrorResult
          )

          lastErrorDecision = errorDecision

          logger.info(`[StepExecutor] Error handler decision`, {
            stepId: step.id,
            decision: errorDecision.decision,
            reason: errorDecision.reason,
          })

          // Apply error handler's decision
          if (errorDecision.decision === 'skip') {
            // Skip this step
            logger.warn(`[StepExecutor] Skipping step per error handler`, {
              stepId: step.id,
            })
            break
          } else if (errorDecision.decision === 'adapt' && errorDecision.adaptation) {
            // Adapt: update parameters or tool if suggested
            if (errorDecision.adaptation.adaptedAction && errorDecision.adaptation.adaptedAction !== step.action) {
              logger.info(`[StepExecutor] Adapting tool: ${step.action} → ${errorDecision.adaptation.adaptedAction}`)
              // Update step action for next retry
              step.action = errorDecision.adaptation.adaptedAction
            }
            // Note: Parameter adaptation would be handled by coordination in next iteration
            // For now, continue with retry
          } else if (errorDecision.decision === 'ask-user') {
            // Ask user - will be handled by execution engine after this returns
            logger.info(`[StepExecutor] Error handler recommends asking user`, {
              stepId: step.id,
            })
            break
          } else if (errorDecision.decision === 'retry') {
            // Intelligent retry - might have suggested parameter changes
            const maxRetriesFromDecision = errorDecision.maxRetries || 3
            if (retries >= maxRetriesFromDecision) {
              logger.warn(`[StepExecutor] Max retries reached per error handler`, {
                stepId: step.id,
                maxRetries: maxRetriesFromDecision,
              })
              break
            }
          }

          // If decision is retry or adapt, continue loop
          if (errorDecision.decision === 'retry' || errorDecision.decision === 'adapt') {
            // Wait before retry with exponential backoff
            await new Promise(resolve => setTimeout(resolve, 1000 * retries))
            continue
          } else {
            // ask-user or skip - exit retry loop
            break
          }
        } catch (handlerError: any) {
          logger.error(`[StepExecutor] Error handler failed`, {
            stepId: step.id,
            error: handlerError.message,
          })
          // Fallback: continue with standard retry logic
          if (retries < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retries))
            continue
          }
        }
      }
    }

    // All retries failed
    const duration = Date.now() - startTime

    const executionResult: ExecutionResult = {
      stepId: step.id,
      stepOrder: step.order,
      success: false,
      error: lastError?.message || 'Step execution failed',
      errorType: 'tool-error',
      duration,
      retries,
      timestamp: new Date(),
      toolCalled: step.action,
      parametersUsed: coordinatedParams,
    }

    logger.error(`[StepExecutor] Step execution failed after retries`, {
      stepId: step.id,
      stepOrder: step.order,
      error: lastError?.message,
    })

    return { result: executionResult, planUpdate }
  }

  /**
   * Validate and resolve parameters using MCP validation
   * 
   * Uses MCP server's tools/validate endpoint to validate parameters and
   * intelligently resolve/infer missing parameters before execution.
   * 
   * @param step - Step being executed
   * @param parameters - Current parameters after coordination
   * @param state - Execution state
   * @param context - Step execution context
   * @returns Validation result with updated parameters if resolved
   */
  private async validateAndResolveParameters(
    step: PlanStep,
    parameters: Record<string, any>,
    state: ExecutionState,
    context: StepExecutionContext
  ): Promise<{
    success: boolean
    error?: string
    wasUpdated?: boolean
    updatedParameters?: Record<string, any>
  }> {
    const { mcpContext } = state
    if (!mcpContext) {
      logger.warn(`[StepExecutor] No MCP context available for validation`)
      return { success: true } // Continue without validation
    }

    // Check if this is a tool or prompt
    const tool = mcpContext.tools.find(t => t.name === step.action)
    const prompt = mcpContext.prompts?.find(p => p.name === step.action)
    
    if (!tool && !prompt) {
      // Not a tool or prompt - skip validation (might be manual action)
      return { success: true }
    }
    
    // For prompts, validation is handled by the prompt itself
    // We can still validate required arguments if needed
    if (prompt && !tool) {
      // Validate prompt arguments
      const requiredArgs = prompt.arguments?.filter(a => a.required).map(a => a.name) || []
      const providedArgs = Object.keys(parameters)
      const missingArgs = requiredArgs.filter(arg => !providedArgs.includes(arg))
      
      if (missingArgs.length > 0) {
        logger.warn(`[StepExecutor] Missing required prompt arguments`, {
          stepId: step.id,
          prompt: step.action,
          missingArgs,
        })
        // Continue - prompts may handle missing args differently
      }
      
      return { success: true }
    }

    try {
      // Extract context from execution state
      const execContext = this.extractExecutionContext(state, context)

      // Validate parameters using MCP
      const validation = await validateToolParameters(
        step.action,
        parameters,
        execContext
      )

      // If all parameters are valid, return success
      if (validation.missingParams.length === 0 && validation.validation.isValid) {
        logger.debug(`[StepExecutor] All parameters validated for step ${step.order}`)
        return { success: true }
      }

      // Resolve resolvable parameters
      const resolutions = await this.resolveMissingParameters(
        validation.missingParams.filter(p => validation.categorization.resolvable.includes(p)),
        validation,
        execContext,
        mcpContext,
        step
      )

      // Infer inferrable parameters
      const inferences = await this.inferMissingParameters(
        validation.missingParams.filter(p => validation.categorization.canInfer.includes(p)),
        validation,
        execContext
      )

      // Build updated parameters
      const updatedParams = { ...parameters }
      let wasUpdated = false

      // Apply resolutions
      for (const [paramName, value] of Array.from(resolutions.entries())) {
        updatedParams[paramName] = value
        wasUpdated = true
        logger.info(`[StepExecutor] Resolved parameter ${paramName} for step ${step.order}: ${value}`)
      }

      // Apply inferences
      for (const [paramName, value] of Array.from(inferences.entries())) {
        updatedParams[paramName] = value
        wasUpdated = true
        logger.debug(`[StepExecutor] Inferred parameter ${paramName} for step ${step.order}: ${value}`)
      }

      // Check if mustAskUser parameters remain
      const mustAskParams = validation.missingParams.filter(p => 
        validation.categorization.mustAskUser.includes(p)
      )

      if (mustAskParams.length > 0) {
        // Cannot proceed - missing required user input
        logger.warn(`[StepExecutor] Missing required user input parameters`, {
          stepId: step.id,
          stepOrder: step.order,
          mustAskParams,
        })
        return {
          success: false,
          error: `Missing required parameters that need user input: ${mustAskParams.join(', ')}`,
        }
      }

      // Re-validate with updated parameters
      if (wasUpdated) {
        const reValidation = await validateToolParameters(
          step.action,
          updatedParams,
          execContext
        )

        if (reValidation.missingParams.length === 0 && reValidation.validation.isValid) {
          return {
            success: true,
            wasUpdated: true,
            updatedParameters: updatedParams,
          }
        } else {
          // Still missing some parameters after resolution
          logger.warn(`[StepExecutor] Still missing parameters after resolution`, {
            stepId: step.id,
            remainingMissing: reValidation.missingParams,
          })
          return {
            success: false,
            error: `Could not resolve all required parameters. Still missing: ${reValidation.missingParams.join(', ')}`,
          }
        }
      }

      return { success: true }
    } catch (error: any) {
      logger.warn(`[StepExecutor] Parameter validation failed:`, error.message)
      // Don't fail execution if validation fails - let the tool execution handle it
      return { success: true }
    }
  }

  /**
   * Extract execution context for MCP validation
   */
  private extractExecutionContext(
    state: ExecutionState,
    context: StepExecutionContext
  ): Record<string, any> {
    const execContext: Record<string, any> = {}

    // Extract from user query if available
    if (state.requestContext.userQuery) {
      const shortCodeMatch = state.requestContext.userQuery.match(/\b([A-Z]{2,4})\b/g)
      if (shortCodeMatch) {
        execContext.shortCode = shortCodeMatch[0]
        execContext.facilityCode = shortCodeMatch[0]
      }
    }

    // Extract from previous step results
    for (const [stepId, result] of Object.entries(context.previousResults)) {
      if (Array.isArray(result) && result.length > 0) {
        const firstItem = result[0]
        if (firstItem._id && !execContext.facilityId) {
          // Could be facilityId or shipment_id depending on context
          execContext.facilityId = firstItem._id
        }
      } else if (result && typeof result === 'object' && result._id) {
        if (!execContext.facilityId) {
          execContext.facilityId = result._id
        }
      }
    }

    // Extract from current step parameters
    if (context.step.parameters) {
      if (context.step.parameters.shortCode && !execContext.shortCode) {
        execContext.shortCode = context.step.parameters.shortCode
      }
      if (context.step.parameters.facilityId && !execContext.facilityId) {
        execContext.facilityId = context.step.parameters.facilityId
      }
    }

    return execContext
  }

  /**
   * Resolve resolvable parameters using LLM reasoning and MCP tools
   */
  private async resolveMissingParameters(
    missingParams: string[],
    validation: Awaited<ReturnType<typeof validateToolParameters>>,
    context: Record<string, any>,
    mcpContext: any,
    step: PlanStep
  ): Promise<Map<string, any>> {
    const resolutions = new Map<string, any>()

    if (missingParams.length === 0) {
      return resolutions
    }

    const tool = mcpContext.tools.find((t: any) => t.name === step.action)
    if (!tool) {
      return resolutions
    }

    // Build prompt for LLM to determine resolution strategy
    const prompt = this.buildResolutionPrompt(missingParams, context, tool, mcpContext)

    try {
      await this.llmAgent.initialize()

      const messages = [
        {
          role: 'system' as const,
          content: `You are a parameter resolution assistant. Determine how to resolve missing parameters by calling MCP tools.

Output ONLY JSON:
{
  "resolutions": [
    {
      "paramName": "facilityId",
      "resolutionStrategy": {
        "tool": "list_facilities",
        "arguments": {"shortCode": "HAN"},
        "extractionPath": "_id or id from first result"
      }
    }
  ]
}`,
        },
        {
          role: 'user' as const,
          content: prompt,
        },
      ]

      const response = await this.llmAgent.callLLMPublic(messages, {
        temperature: 0.3,
        maxTokens: 1000,
        responseFormat: { type: 'json_object' },
      })

      // Extract JSON from response
      const cleanResponse = response.trim()
      let jsonStart = cleanResponse.indexOf('{')
      if (jsonStart === -1) {
        return resolutions
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
        return resolutions
      }

      const jsonStr = cleanResponse.substring(jsonStart, jsonEnd)
      const parsed = JSON.parse(jsonStr)
      const strategies = parsed.resolutions || []

      // Execute resolution strategies
      for (const strategy of strategies) {
        try {
          const toolResult = await callMCPTool(
            strategy.resolutionStrategy.tool,
            strategy.resolutionStrategy.arguments
          )
          const result = toolResult.result

          // Extract value
          let resolvedValue: any = null
          if (Array.isArray(result) && result.length > 0) {
            resolvedValue = result[0]._id || result[0].id || result[0]
          } else if (result && typeof result === 'object') {
            resolvedValue = result._id || result.id || result
          }

          if (resolvedValue) {
            resolutions.set(strategy.paramName, resolvedValue)
          }
        } catch (error: any) {
          logger.warn(`[StepExecutor] Failed to resolve parameter ${strategy.paramName}:`, error.message)
        }
      }
    } catch (error: any) {
      logger.warn(`[StepExecutor] Failed to generate resolution strategy:`, error.message)
    }

    return resolutions
  }

  /**
   * Infer inferrable parameters using LLM reasoning
   */
  private async inferMissingParameters(
    missingParams: string[],
    validation: Awaited<ReturnType<typeof validateToolParameters>>,
    context: Record<string, any>
  ): Promise<Map<string, any>> {
    const inferences = new Map<string, any>()

    if (missingParams.length === 0) {
      return inferences
    }

    try {
      await this.llmAgent.initialize()

      const prompt = `Infer values for: ${missingParams.join(', ')}\n\nRequired params: ${validation.requiredParams.join(', ')}\n\nContext: ${JSON.stringify(context)}\n\nDetermine appropriate defaults based on parameter types.`

      const messages = [
        {
          role: 'system' as const,
          content: `You are a parameter inference assistant. Infer default values for missing parameters.

Output ONLY JSON:
{
  "inferences": [
    {
      "paramName": "detection_time",
      "inferredValue": "2024-11-03T20:00:00Z",
      "reasoning": "Current timestamp"
    }
  ]
}`,
        },
        {
          role: 'user' as const,
          content: prompt,
        },
      ]

      const response = await this.llmAgent.callLLMPublic(messages, {
        temperature: 0.2,
        maxTokens: 500,
        responseFormat: { type: 'json_object' },
      })

      // Extract JSON
      const cleanResponse = response.trim()
      let jsonStart = cleanResponse.indexOf('{')
      if (jsonStart === -1) {
        return inferences
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
        return inferences
      }

      const jsonStr = cleanResponse.substring(jsonStart, jsonEnd)
      const parsed = JSON.parse(jsonStr)
      const results = parsed.inferences || []

      for (const inference of results) {
        if (inference.inferredValue !== undefined && inference.inferredValue !== null) {
          inferences.set(inference.paramName, inference.inferredValue)
        }
      }
    } catch (error: any) {
      logger.warn(`[StepExecutor] Failed to infer parameters:`, error.message)
    }

    return inferences
  }

  /**
   * Build prompt for parameter resolution
   */
  private buildResolutionPrompt(
    missingParams: string[],
    context: Record<string, any>,
    tool: any,
    mcpContext: any
  ): string {
    let prompt = `Resolve missing parameters for tool "${tool.name}":\n\n`
    prompt += `Missing: ${missingParams.join(', ')}\n\n`
    prompt += `Tool Schema:\n${JSON.stringify(tool.inputSchema, null, 2)}\n\n`
    prompt += `Context:\n${JSON.stringify(context, null, 2)}\n\n`
    prompt += `Available Tools:\n`
    for (const availableTool of mcpContext.tools.slice(0, 20)) {
      prompt += `- ${availableTool.name}: ${availableTool.description}\n`
    }
    prompt += `\nDetermine which MCP tools to call to resolve these parameters.`
    return prompt
  }
}


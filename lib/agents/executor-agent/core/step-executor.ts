/**
 * Step Executor
 * 
 * Executes individual plan steps with coordination and error handling
 */

import { ExecutionResult, PlanExecutionResult } from '@/types'
import { ExecutionState, StepExecutionContext } from '../types'
import { Coordinator } from '../reasoning/coordinator'
import { ErrorHandler } from '../reasoning/error-handler'
import { callMCPTool } from '../adapters/mcp-tool-adapter'
import { logger } from '@/utils/logger'

export class StepExecutor {
  private coordinator: Coordinator
  private errorHandler: ErrorHandler

  constructor() {
    this.coordinator = new Coordinator()
    this.errorHandler = new ErrorHandler()
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
    const coordinatedParams = parameters
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

    // Step 3: Execute with intelligent retries
    let currentParams = coordinatedParams
    let lastErrorDecision: any = null
    
    while (retries < 3) {
      try {
        // Call the tool
        const result = await callMCPTool(step.action, currentParams)

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
}


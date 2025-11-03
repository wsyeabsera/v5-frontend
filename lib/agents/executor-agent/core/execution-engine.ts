/**
 * Execution Engine
 * 
 * Main adaptive execution loop with meta-reasoning checkpoints
 */

import { Plan, ExecutorAgentOutput, RequestContext, CriticAgentOutput } from '@/types'
import { ExecutionState, PlanValidationResult } from '../types'
import { StateManager } from './state-manager'
import { StepExecutor } from './step-executor'
import { PlanValidator } from '../reasoning/plan-validator'
import { ErrorHandler } from '../reasoning/error-handler'
import { QuestionGenerator } from '../reasoning/question-generator'
import { logger } from '@/utils/logger'

export class ExecutionEngine {
  private validator: PlanValidator
  private errorHandler: ErrorHandler
  private questionGenerator: QuestionGenerator
  private stepExecutor: StepExecutor

  constructor() {
    this.validator = new PlanValidator()
    this.errorHandler = new ErrorHandler()
    this.questionGenerator = new QuestionGenerator()
    this.stepExecutor = new StepExecutor()
  }

  /**
   * Execute plan with adaptive meta-reasoning
   */
  async executePlan(
    plan: Plan,
    requestContext: RequestContext,
    critique?: CriticAgentOutput,
    userFeedback?: { questionId: string; answer: string }[],
    mcpContext?: any
  ): Promise<ExecutorAgentOutput> {
    // Initialize state
    let state = StateManager.buildInitialState(plan, requestContext, critique, mcpContext)

    // Check critique recommendation
    if (critique && critique.critique.recommendation === 'reject') {
      throw new Error(`Plan rejected by critic: ${critique.critique.rationale}`)
    }

    // Main execution loop
    while (true) {
      // Get ready steps
      let readySteps = StateManager.getReadySteps(state.plan, state.executedSteps)

      // Check for completion or deadlock
      if (readySteps.length === 0) {
        if (state.executedSteps.size === state.plan.steps.length) {
          // All steps completed
          break
        } else {
          // Deadlock - some steps can't execute
          const remainingSteps = state.plan.steps.filter(s => !state.executedSteps.has(s.id))
          state.errors.push(`Execution deadlock: Steps ${remainingSteps.map(s => s.order).join(', ')} cannot execute`)
          break
        }
      }

      // Execute ready steps
      for (const step of readySteps) {
        try {
          // Build step context
          const stepContext = StateManager.buildStepContext(step, state)

          // Execute step
          const stepExecution = await this.stepExecutor.executeStep(stepContext)

          // Update state
          state = StateManager.updateStateAfterStep(
            state,
            stepExecution.result,
            stepExecution.planUpdate
          )

          // Meta-reasoning checkpoint: Validate progress after each step
          const validation = await this.validator.validateProgress(state)

          logger.debug(`[ExecutionEngine] Meta-reasoning checkpoint`, {
            stepId: step.id,
            isValid: validation.isValid,
            progress: validation.progress,
            shouldContinue: validation.shouldContinue,
            shouldAdapt: validation.shouldAdapt,
          })

          // Handle validation result
          if (!validation.shouldContinue) {
            if (validation.shouldAdapt || validation.shouldReplan) {
              logger.info(`[ExecutionEngine] Plan adaptation needed`, {
                reasoning: validation.reasoning,
              })
              // For now, continue but log adaptation needed
              // TODO: Implement adaptive replanning
            }
            // If should not continue and no adaptation, break
            if (!validation.shouldAdapt && !validation.shouldReplan) {
              break
            }
          }

          // Handle step errors - step executor already attempted retries with error handler
          // Now handle final decisions (ask-user, adapt, skip) if step still failed
          if (!stepExecution.result.success && stepExecution.result.error) {
            // Only consult error handler if we haven't exhausted retries already
            // (Step executor handles retries, so if we're here, retries are done or decision was ask-user/skip)
            const errorDecision = await this.errorHandler.handleError(
              stepExecution.result.error,
              stepExecution.result.errorType || 'tool-error',
              step,
              state,
              stepExecution.result
            )

            if (errorDecision.decision === 'ask-user') {
              const question = await this.questionGenerator.generateErrorQuestion(
                stepExecution.result.error,
                stepExecution.result.errorType || 'tool-error',
                step,
                state
              )

              if (question) {
                state.questionsAsked.push(question)
                // Pause execution for user input
                return this.createPartialOutput(state, true)
              }
            } else if (errorDecision.decision === 'adapt' && errorDecision.adaptation) {
              // Store adaptation for tracking
              state.adaptations.push(errorDecision.adaptation)
              logger.info(`[ExecutionEngine] Adaptation suggested`, {
                adaptation: errorDecision.adaptation,
              })
              // Note: Actual adaptation would require replanning, which is not yet implemented
              // For now, continue execution
            } else if (errorDecision.decision === 'skip') {
              logger.warn(`[ExecutionEngine] Skipping step per error handler`, {
                stepId: step.id,
              })
              continue
            }
            // If retry decision here, it means we should have already retried in step executor
            // So this is a final failure - add to errors and continue
          }

          // Check for goal achievement
          if (validation.goalAchieved) {
            logger.info(`[ExecutionEngine] Goal achieved`, {
              progress: validation.progress,
            })
            break
          }
        } catch (error: any) {
          logger.error(`[ExecutionEngine] Unexpected error executing step`, {
            stepId: step.id,
            error: error.message,
          })

          const errorResult = {
            stepId: step.id,
            stepOrder: step.order,
            success: false,
            error: error.message,
            errorType: 'tool-error' as const,
            duration: 0,
            retries: 0,
            timestamp: new Date(),
            toolCalled: step.action,
            parametersUsed: step.parameters,
          }

          state = StateManager.updateStateAfterStep(state, errorResult)
          state.errors.push(`Step ${step.order}: ${error.message}`)
        }
      }
    }

    // Create final output
    return this.createFinalOutput(state)
  }

  /**
   * Create partial output (when pausing for user input)
   */
  private createPartialOutput(
    state: ExecutionState,
    requiresFeedback: boolean
  ): ExecutorAgentOutput {
    const totalDuration = Date.now() - state.startTime
    const overallSuccess = state.errors.length === 0 && state.executedSteps.size === state.plan.steps.length

    const executionResult = {
      planId: state.plan.id,
      overallSuccess,
      steps: state.executionResults,
      partialResults: state.partialResults,
      errors: state.errors,
      totalDuration,
      questionsAsked: state.questionsAsked,
      adaptations: state.adaptations,
      planUpdates: state.planUpdates && state.planUpdates.length > 0 ? state.planUpdates : undefined,
    }

    return {
      requestId: state.requestContext.requestId,
      agentName: 'executor-agent',
      timestamp: new Date(),
      requestContext: state.requestContext,
      executionResult,
      planId: state.plan.id,
      requiresUserFeedback: requiresFeedback,
      critiqueAvailable: !!state.critique,
      critiqueRecommendation: state.critique?.critique.recommendation,
    }
  }

  /**
   * Create final output
   */
  private createFinalOutput(state: ExecutionState): ExecutorAgentOutput {
    return this.createPartialOutput(state, state.questionsAsked.length > 0)
  }
}


/**
 * State Manager
 * 
 * Manages execution state and provides context for decision-making
 */

import { ExecutionState, StepExecutionContext } from '../types'
import { Plan, PlanStep, ExecutionResult, RequestContext, CriticAgentOutput, MCPContext } from '@/types'

export class StateManager {
  /**
   * Build initial execution state
   */
  static buildInitialState(
    plan: Plan,
    requestContext: RequestContext,
    critique?: CriticAgentOutput,
    mcpContext?: MCPContext
  ): ExecutionState {
    return {
      plan,
      requestContext,
      critique,
      executionResults: [],
      partialResults: {},
      errors: [],
      questionsAsked: [],
      adaptations: [],
      planUpdates: [],
      executedSteps: new Set<string>(),
      startTime: Date.now(),
      mcpContext,
    }
  }

  /**
   * Build context for step execution
   */
  static buildStepContext(
    step: PlanStep,
    state: ExecutionState
  ): StepExecutionContext {
    return {
      step,
      state,
      previousResults: state.partialResults,
    }
  }

  /**
   * Update state after step execution
   */
  static updateStateAfterStep(
    state: ExecutionState,
    result: ExecutionResult,
    planUpdate?: any
  ): ExecutionState {
    const newState = { ...state }
    
    newState.executionResults.push(result)
    newState.executedSteps.add(result.stepId)
    
    if (result.success && result.result) {
      newState.partialResults[result.stepId] = result.result
    }
    
    if (result.error) {
      newState.errors.push(`Step ${result.stepOrder}: ${result.error}`)
    }
    
    if (planUpdate) {
      if (!newState.planUpdates) {
        newState.planUpdates = []
      }
      newState.planUpdates.push(planUpdate)
    }
    
    return newState
  }

  /**
   * Get progress toward goal
   */
  static getProgress(state: ExecutionState): number {
    const totalSteps = state.plan.steps.length
    const completedSteps = state.executedSteps.size
    return totalSteps > 0 ? completedSteps / totalSteps : 0
  }

  /**
   * Check if goal is achieved
   */
  static isGoalAchieved(state: ExecutionState): boolean {
    // Check if all steps completed successfully
    const allStepsCompleted = state.executedSteps.size === state.plan.steps.length
    const noErrors = state.errors.length === 0
    return allStepsCompleted && noErrors
  }

  /**
   * Get ready steps (dependencies satisfied)
   */
  static getReadySteps(
    plan: Plan,
    executedSteps: Set<string>
  ): PlanStep[] {
    return plan.steps.filter(step => {
      // Skip if already executed
      if (executedSteps.has(step.id)) return false

      // Check dependencies
      if (!step.dependencies || step.dependencies.length === 0) {
        return true // No dependencies
      }

      return step.dependencies.every(depId => executedSteps.has(depId))
    })
  }
}


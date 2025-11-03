/**
 * Internal types for Executor Agent modules
 */

import {
  Plan,
  PlanStep,
  ExecutionResult,
  ExecutionFollowUpQuestion,
  PlanExecutionResult,
  RequestContext,
  CriticAgentOutput,
  MCPContext,
} from '@/types'

/**
 * Execution State - tracks the full context of execution
 */
export interface ExecutionState {
  plan: Plan
  requestContext: RequestContext
  critique?: CriticAgentOutput
  executionResults: ExecutionResult[]
  partialResults: Record<string, any>
  errors: string[]
  questionsAsked: ExecutionFollowUpQuestion[]
  adaptations: PlanExecutionResult['adaptations']
  planUpdates: PlanExecutionResult['planUpdates']
  executedSteps: Set<string>
  startTime: number
  mcpContext?: MCPContext
}

/**
 * Step Execution Context - context for executing a single step
 */
export interface StepExecutionContext {
  step: PlanStep
  state: ExecutionState
  previousResults: Record<string, any>
  coordinationNeeded?: boolean
}

/**
 * Coordination Result - result of LLM-driven coordination
 */
export interface CoordinationResult {
  needsCoordination: boolean
  reasoning?: string
  parameters?: Record<string, any>
  extractedValues?: Record<string, any>
  missingParams?: string[]
  alternatives?: string[]
  recommendation: 'proceed' | 'adapt' | 'ask-user'
}

/**
 * Plan Validation Result - result of meta-reasoning about plan
 */
export interface PlanValidationResult {
  isValid: boolean
  progress: number // 0.0 to 1.0
  goalAchieved: boolean
  shouldContinue: boolean
  shouldAdapt: boolean
  shouldReplan: boolean
  reasoning: string
  recommendations?: string[]
}

/**
 * Error Decision - LLM's decision on error handling
 */
export interface ErrorDecision {
  decision: 'retry' | 'ask-user' | 'adapt' | 'skip'
  reason: string
  adaptation?: {
    stepId: string
    originalAction: string
    adaptedAction: string
    reason: string
  }
  retryCount?: number
  maxRetries?: number
}

/**
 * Step Selection Result - result of intelligent step selection
 */
export interface StepSelectionResult {
  nextStep?: PlanStep
  reason: string
  shouldAskUser?: boolean
  question?: ExecutionFollowUpQuestion
  shouldAdaptPlan?: boolean
}


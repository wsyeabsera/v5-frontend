/**
 * Plan Validator - Continuous Meta-Reasoning
 * 
 * After each step, validates if plan is still valid and making progress
 */

import { ExecutionState, PlanValidationResult } from '../types'
import { logger } from '@/utils/logger'
import { StateManager } from '../core/state-manager'
import { createInternalAgent, InternalLLMAgent } from '../utils/internal-llm-agent'

export class PlanValidator {
  private agent: InternalLLMAgent
  private readonly systemPrompt = `You are a Meta-Reasoning Agent. Your job is to continuously evaluate execution progress and determine if the plan should continue, adapt, or be replanned.

After each step execution, you analyze:
1. Is the plan still valid given what we've learned?
2. Are we making progress toward the goal?
3. Should we continue, adapt, or replan?

You consider:
- The original goal
- Steps completed vs remaining
- Results achieved so far
- Errors encountered
- Whether the approach is working

Respond with JSON only:
{
  "isValid": boolean,
  "progress": 0.0-1.0,
  "goalAchieved": boolean,
  "shouldContinue": boolean,
  "shouldAdapt": boolean,
  "shouldReplan": boolean,
  "reasoning": "Your analysis",
  "recommendations": ["rec1", "rec2"]
}`

  constructor() {
    // Use executor-agent config (same as main executor)
    this.agent = createInternalAgent('executor-agent')
  }

  /**
   * Validate plan progress after a step
   */
  async validateProgress(state: ExecutionState): Promise<PlanValidationResult> {
    const progress = StateManager.getProgress(state)
    const goalAchieved = StateManager.isGoalAchieved(state)

    const prompt = `PLAN VALIDATION CHECKPOINT

ORIGINAL GOAL: ${state.plan.goal}

EXECUTION STATUS:
- Steps completed: ${state.executionResults.length}/${state.plan.steps.length}
- Progress: ${(progress * 100).toFixed(1)}%
- Errors: ${state.errors.length}
- Questions asked: ${state.questionsAsked.length}
- Adaptations made: ${state.adaptations.length}

RECENT RESULTS:
${state.executionResults.slice(-3).map((r, idx) => 
  `Step ${r.stepOrder}: ${r.success ? 'Success' : `Error: ${r.error}`}`
).join('\n')}

PARTIAL RESULTS:
${Object.keys(state.partialResults).length > 0
  ? Object.entries(state.partialResults)
      .map(([stepId, result]) => {
        const step = state.plan.steps.find(s => s.id === stepId)
        const resultPreview = typeof result === 'string'
          ? result.substring(0, 100)
          : JSON.stringify(result).substring(0, 100)
        return `Step ${step?.order || stepId}: ${resultPreview}...`
      })
      .join('\n')
  : 'No results yet'}

ERRORS ENCOUNTERED:
${state.errors.length > 0 ? state.errors.join('\n') : 'None'}

VALIDATION QUESTIONS:
1. Is the plan still valid given what we've learned?
2. Are we making progress toward "${state.plan.goal}"?
3. Is the current approach working, or should we adapt?
4. Should we continue with remaining steps or replan?

Provide your analysis and recommendation.`

    try {
      await this.agent.initialize()
      
      const messages = [
        { role: 'system' as const, content: this.systemPrompt },
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
        throw new Error('No JSON object found in validation response')
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
        throw new Error('Incomplete JSON object in validation response')
      }

      const jsonStr = cleanResponse.substring(jsonStart, jsonEnd)
      const validation = JSON.parse(jsonStr)

      logger.debug(`[PlanValidator] Validation result`, {
        isValid: validation.isValid,
        progress: validation.progress,
        shouldContinue: validation.shouldContinue,
        shouldAdapt: validation.shouldAdapt,
      })

      return {
        isValid: validation.isValid !== false,
        progress: validation.progress ?? progress,
        goalAchieved: validation.goalAchieved ?? goalAchieved,
        shouldContinue: validation.shouldContinue !== false,
        shouldAdapt: validation.shouldAdapt || false,
        shouldReplan: validation.shouldReplan || false,
        reasoning: validation.reasoning || 'Plan validation completed',
        recommendations: validation.recommendations || [],
      }
    } catch (error: any) {
      logger.error(`[PlanValidator] Failed to validate plan`, {
        error: error.message,
      })

      // Fallback: continue if no errors
      return {
        isValid: state.errors.length === 0,
        progress,
        goalAchieved,
        shouldContinue: state.errors.length === 0,
        shouldAdapt: false,
        shouldReplan: false,
        reasoning: 'Validation failed, defaulting to continue if no errors',
      }
    }
  }
}


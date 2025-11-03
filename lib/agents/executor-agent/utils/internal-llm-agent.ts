/**
 * Internal LLM Agent
 * 
 * Concrete implementation of BaseAgent for internal reasoning components
 * that need to call LLM without extending BaseAgent
 */

import { BaseAgent } from '../../base-agent'

/**
 * Simple concrete agent class for internal LLM calls
 */
export class InternalLLMAgent extends BaseAgent {
  // Concrete implementation - no abstract methods needed
  // This class just needs to extend BaseAgent to access protected methods
  
  /**
   * Public wrapper for protected callLLM method
   */
  async callLLMPublic(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      temperature?: number
      maxTokens?: number
      topP?: number
      responseFormat?: { type: 'json_object' }
    } = {}
  ): Promise<string> {
    return this.callLLM(messages, options)
  }
}

/**
 * Create an internal agent instance for LLM calls
 */
export function createInternalAgent(agentId: string): InternalLLMAgent {
  return new InternalLLMAgent(agentId)
}


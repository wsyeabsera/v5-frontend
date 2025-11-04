/**
 * Executor Agent - Main Orchestrator
 * 
 * Lightweight orchestrator that delegates to specialized modules
 */

import { BaseAgent } from '../base-agent'
import { Plan, ExecutorAgentOutput, RequestContext, CriticAgentOutput, MCPContext } from '@/types'
import { ExecutionEngine } from './core/execution-engine'
import { listMCPTools, listMCPPrompts } from '@/lib/mcp-prompts'
import { logger } from '@/utils/logger'

export class ExecutorAgent extends BaseAgent {
  private executionEngine: ExecutionEngine

  constructor() {
    super('executor-agent')
    this.executionEngine = new ExecutionEngine()
  }

  /**
   * Fetch MCP context (tools and prompts)
   */
  async fetchMCPContext(): Promise<MCPContext> {
    try {
      const [tools, prompts] = await Promise.all([
        listMCPTools().catch(() => []),
        listMCPPrompts().catch(() => [])
      ])

      logger.debug(`[ExecutorAgent] Fetched MCP context`, {
        toolsCount: tools.length,
        promptsCount: prompts.length,
      })

      return {
        tools,
        resources: [],
        prompts: prompts.map(p => ({
          name: p.name,
          description: p.description,
          arguments: p.arguments || [],
        })),
      }
    } catch (error: any) {
      logger.warn(`[ExecutorAgent] Failed to fetch MCP context`, {
        error: error.message,
      })

      return { tools: [], resources: [], prompts: [] }
    }
  }

  /**
   * Execute a complete plan
   */
  async executePlan(
    plan: Plan,
    requestContext: RequestContext,
    critique?: CriticAgentOutput,
    userFeedback?: { questionId: string; answer: string }[]
  ): Promise<ExecutorAgentOutput> {
    // Initialize agent
    await this.initialize()

    // Fetch MCP context
    const mcpContext = await this.fetchMCPContext()

    // Delegate to execution engine
    return await this.executionEngine.executePlan(
      plan,
      requestContext,
      critique,
      userFeedback,
      mcpContext
    )
  }
}


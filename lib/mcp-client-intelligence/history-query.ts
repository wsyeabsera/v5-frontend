import { mcpClientV2 } from '../mcp-client-v2'

interface SimilarTask {
  id: string
  query: string
  goal: string
  similarityScore: number
  status: string
  planId?: string
  executionTime?: number
  stepsCompleted?: number
  createdAt: string
}

interface SuccessfulPlan {
  id: string
  goal: string
  successRate: number
  usageCount: number
  averageExecutionTime: number
  steps: Array<{
    stepId: string
    toolName: string
    description: string
  }>
  createdAt: string
  lastUsed: string
}

interface ToolPerformance {
  toolName: string
  context?: string
  successRate: number
  averageDuration: number
  totalCalls: number
  successfulCalls: number
  failedCalls: number
  commonErrors?: Array<{
    error: string
    count: number
  }>
  recommendations?: string[]
}

interface AgentInsight {
  id: string
  agentType: string
  insightType: string
  insight: string
  confidence: number
  examples?: Array<{
    taskId: string
    context: string
  }>
  createdAt: string
}

export class HistoryQueryClient {
  /**
   * Find tasks similar to a given query
   */
  async getSimilarTasks(
    query: string,
    options?: {
      limit?: number
      minSimilarity?: number
      status?: 'completed' | 'failed'
    }
  ): Promise<SimilarTask[]> {
    const response = await mcpClientV2.request('get_similar_tasks', {
      query,
      ...options,
    })
    
    // Handle API response format: { tasks: [...], count: number, message: string }
    const tasks = response?.tasks || (Array.isArray(response) ? response : [])
    
    // Map API response fields to component expected fields
    return tasks.map((task: any) => ({
      id: task.taskId || task.id,
      query: task.query || '',
      goal: task.goal || '',
      similarityScore: task.similarity || task.similarityScore || 0,
      status: task.status || '',
      planId: task.planId,
      executionTime: task.executionTime || task.successMetrics?.executionTime,
      stepsCompleted: task.stepsCompleted || task.successMetrics?.stepsCompleted,
      createdAt: task.createdAt || '',
    }))
  }

  /**
   * Get successful plan patterns for a goal
   */
  async getSuccessfulPlans(
    goal: string,
    options?: {
      limit?: number
      minSuccessRate?: number
    }
  ): Promise<SuccessfulPlan[]> {
    return mcpClientV2.request('get_successful_plans', {
      goal,
      ...options,
    })
  }

  /**
   * Get performance metrics for a tool
   */
  async getToolPerformance(
    toolName: string,
    context?: string
  ): Promise<ToolPerformance> {
    return mcpClientV2.request('get_tool_performance', {
      toolName,
      context,
    })
  }

  /**
   * Get learned insights from an agent
   */
  async getAgentInsights(
    agentType: 'thought' | 'planner' | 'executor',
    options?: {
      insightType?: 'patterns' | 'optimizations' | 'warnings'
      limit?: number
    }
  ): Promise<AgentInsight[]> {
    return mcpClientV2.request('get_agent_insights', {
      agentType,
      ...options,
    })
  }
}

export const historyQueryClient = new HistoryQueryClient()

export type {
  SimilarTask,
  SuccessfulPlan,
  ToolPerformance,
  AgentInsight,
}


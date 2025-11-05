import { useQuery } from '@tanstack/react-query'
import { historyQueryClient } from '../mcp-client-intelligence/history-query'

export function useGetSimilarTasks(
  query: string,
  options?: {
    limit?: number
    minSimilarity?: number
    status?: 'completed' | 'failed'
  }
) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'similar-tasks', query, options],
    queryFn: () => historyQueryClient.getSimilarTasks(query, options),
    enabled: !!query && query.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useGetSuccessfulPlans(
  goal: string,
  options?: {
    limit?: number
    minSuccessRate?: number
  }
) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'successful-plans', goal, options],
    queryFn: () => historyQueryClient.getSuccessfulPlans(goal, options),
    enabled: !!goal && goal.length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

export function useGetToolPerformance(
  toolName: string,
  context?: string
) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'tool-performance', toolName, context],
    queryFn: () => historyQueryClient.getToolPerformance(toolName, context),
    enabled: !!toolName,
    staleTime: 1000 * 60 * 15, // 15 minutes
  })
}

export function useGetAgentInsights(
  agentType: 'thought' | 'planner' | 'executor',
  options?: {
    insightType?: 'patterns' | 'optimizations' | 'warnings'
    limit?: number
  }
) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'agent-insights', agentType, options],
    queryFn: () => historyQueryClient.getAgentInsights(agentType, options),
    enabled: !!agentType,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}


import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { memoryClient, LearnFromTaskParams } from '../mcp-client-intelligence/memory'

export function useLearnFromTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: LearnFromTaskParams) => memoryClient.learnFromTask(params),
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'memory'] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'tasks', variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'plans', variables.planId] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'patterns'] })
    },
  })
}

export function useMemoryPatterns(filters?: {
  patternType?: 'query_pattern' | 'plan_pattern' | 'tool_sequence' | 'error_pattern'
  context?: string
  limit?: number
  skip?: number
}) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'memory', 'patterns', filters],
    queryFn: () => memoryClient.listMemoryPatterns(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}


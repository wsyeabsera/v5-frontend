import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { smartFeaturesClient } from '../mcp-client-intelligence/smart-features'

export function usePredictPlanQuality(planId: string) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'plan-quality', planId],
    queryFn: () => smartFeaturesClient.predictPlanQuality(planId),
    enabled: !!planId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useGetToolRecommendations(
  requiredAction: string,
  context?: string
) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'tool-recommendations', requiredAction, context],
    queryFn: () => smartFeaturesClient.getToolRecommendations(requiredAction, context),
    enabled: !!requiredAction && requiredAction.length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

export function useRefinePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { planId: string; failureReason: string }) =>
      smartFeaturesClient.refinePlan(params.planId, params.failureReason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'plans'] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'plans', variables.planId] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'plan-quality'] })
    },
  })
}

export function useTrackCost(taskId: string) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'cost-tracking', taskId],
    queryFn: () => smartFeaturesClient.trackCost(taskId),
    enabled: !!taskId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useOptimizeCost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (planId: string) => smartFeaturesClient.optimizeCost(planId),
    onSuccess: (_, planId) => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'plans'] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'plans', planId] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'plan-quality'] })
    },
  })
}

export function usePlanQualityPredictions(filters?: {
  planId?: string
  startDate?: string
  endDate?: string
  limit?: number
  skip?: number
}) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'plan-quality', 'list', filters],
    queryFn: () => smartFeaturesClient.listPlanQualityPredictions(filters),
    staleTime: 1000 * 60 * 5,
  })
}

export function useListToolRecommendations(filters?: {
  requiredAction?: string
  context?: string
  startDate?: string
  endDate?: string
  limit?: number
  skip?: number
}) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'tool-recommendations', 'list', filters],
    queryFn: () => smartFeaturesClient.listToolRecommendations(filters),
    staleTime: 1000 * 60 * 5,
  })
}


import { useQuery } from '@tanstack/react-query'
import { costTrackingClient } from '../mcp-client-intelligence/cost-tracking'

export function useCostTrackings(filters?: {
  taskId?: string
  planId?: string
  agentConfigId?: string
  startDate?: string
  endDate?: string
  limit?: number
  skip?: number
}) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'cost-tracking', 'list', filters],
    queryFn: () => costTrackingClient.listCostTrackings(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useCostTracking(idOrTaskId: { id?: string; taskId?: string }) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'cost-tracking', idOrTaskId.id || idOrTaskId.taskId],
    queryFn: () => costTrackingClient.getCostTracking(idOrTaskId),
    enabled: !!(idOrTaskId.id || idOrTaskId.taskId),
    staleTime: 1000 * 60 * 5,
  })
}


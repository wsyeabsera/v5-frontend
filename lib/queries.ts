import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './mcp-client'
import { AgentConfig } from '@/types'

export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: () => apiClient.getModels(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useTools() {
  return useQuery({
    queryKey: ['tools'],
    queryFn: () => apiClient.getTools(),
    staleTime: 1000 * 60 * 5,
  })
}

export function useResources() {
  return useQuery({
    queryKey: ['resources'],
    queryFn: () => apiClient.getResources(),
    staleTime: 1000 * 60 * 5,
  })
}

export function useResource(uri: string) {
  return useQuery({
    queryKey: ['resource', uri],
    queryFn: () => apiClient.readResource(uri),
    enabled: !!uri,
  })
}

export function useCallTool() {
  return useMutation({
    mutationFn: ({ name, args }: { name: string; args: any }) =>
      apiClient.callTool(name, args),
  })
}

// Dashboard data hooks
export function useSystemStats() {
  return useQuery({
    queryKey: ['stats', 'overview'],
    queryFn: async () => {
      const response = await fetch('/api/stats')
      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }
      return response.json()
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  })
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ['activity', 'recent'],
    queryFn: async () => {
      const response = await fetch('/api/activity')
      if (!response.ok) {
        throw new Error('Failed to fetch activity')
      }
      return response.json()
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  })
}

// Agent configuration hooks
export function useAgentConfigs() {
  return useQuery({
    queryKey: ['agent-configs'],
    queryFn: async () => {
      const response = await fetch('/api/agents')
      if (!response.ok) {
        throw new Error('Failed to fetch agent configs')
      }
      const data = await response.json()
      return data.configs || []
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useUpdateAgentConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (config: AgentConfig) => {
      const response = await fetch(`/api/agents/${config.agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!response.ok) {
        throw new Error('Failed to update agent config')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-configs'] })
    },
  })
}

export function useCreateAgentConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (config: AgentConfig) => {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create agent config')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-configs'] })
    },
  })
}

export function useDeleteAgentConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (agentId: string) => {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete agent config')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-configs'] })
    },
  })
}


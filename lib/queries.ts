import { useQuery, useMutation } from '@tanstack/react-query'
import { apiClient } from './mcp-client'

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


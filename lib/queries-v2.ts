import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mcpClientV2 } from './mcp-client-v2'

// Available Models hooks
export function useAvailableModels(provider?: string) {
  return useQuery({
    queryKey: ['v2', 'available-models', provider],
    queryFn: () => mcpClientV2.listAvailableModels(provider),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useAvailableModel(id: string) {
  return useQuery({
    queryKey: ['v2', 'available-model', id],
    queryFn: () => mcpClientV2.getAvailableModel(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateAvailableModel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ provider, modelName, modelId }: { provider: string; modelName: string; modelId?: string }) =>
      mcpClientV2.createAvailableModel(provider, modelName, modelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'available-models'] })
    },
  })
}

export function useUpdateAvailableModel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: { provider?: string; modelName?: string; modelId?: string }
    }) => mcpClientV2.updateAvailableModel(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'available-models'] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'available-model', variables.id] })
    },
  })
}

export function useDeleteAvailableModel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => mcpClientV2.deleteAvailableModel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'available-models'] })
    },
  })
}

// Agent Config V2 hooks
export function useAgentConfigsV2(isEnabled?: boolean) {
  return useQuery({
    queryKey: ['v2', 'agent-configs', isEnabled],
    queryFn: () => mcpClientV2.listAgentConfigs(isEnabled),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useAgentConfigV2(id: string) {
  return useQuery({
    queryKey: ['v2', 'agent-config', id],
    queryFn: () => mcpClientV2.getAgentConfig(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateAgentConfigV2() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      availableModelId,
      apiKey,
      maxTokenCount,
      isEnabled = true,
    }: {
      availableModelId: string
      apiKey: string
      maxTokenCount: number
      isEnabled?: boolean
    }) =>
      mcpClientV2.createAgentConfig(availableModelId, apiKey, maxTokenCount, isEnabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'agent-configs'] })
    },
  })
}

export function useUpdateAgentConfigV2() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: {
        availableModelId?: string
        apiKey?: string
        maxTokenCount?: number
        isEnabled?: boolean
      }
    }) => mcpClientV2.updateAgentConfig(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'agent-configs'] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'agent-config', variables.id] })
    },
  })
}

export function useDeleteAgentConfigV2() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => mcpClientV2.deleteAgentConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'agent-configs'] })
    },
  })
}

// AI Execution hooks
export function useExecuteAICall() {
  return useMutation({
    mutationFn: ({
      agentConfigId,
      messages,
      options,
    }: {
      agentConfigId: string
      messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
      options?: {
        temperature?: number
        maxTokens?: number
        topP?: number
        responseFormat?: { type: 'json_object' }
      }
    }) => mcpClientV2.executeAICall(agentConfigId, messages, options),
  })
}

// Request management hooks
export function useRequests(filters?: {
  categories?: string[]
  tags?: string[]
  version?: string
}) {
  return useQuery({
    queryKey: ['v2', 'requests', filters],
    queryFn: () => mcpClientV2.listRequests(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useRequest(id: string) {
  return useQuery({
    queryKey: ['v2', 'request', id],
    queryFn: () => mcpClientV2.getRequest(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { query: string; categories: string[]; tags: string[]; version: string }) =>
      mcpClientV2.createRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'requests'] })
    },
  })
}

export function useUpdateRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: {
        query?: string
        categories?: string[]
        tags?: string[]
        version?: string
      }
    }) => mcpClientV2.updateRequest(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'requests'] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'request', variables.id] })
    },
  })
}

export function useDeleteRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => mcpClientV2.deleteRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'requests'] })
    },
  })
}

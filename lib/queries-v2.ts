import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { mcpClientV2 } from './mcp-client-v2'
import { mcpClientOrchestrator } from './mcp-client-orchestrator'

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

// Thoughts hooks
export function useThoughts(filters?: {
  userQuery?: string
  agentConfigId?: string
  limit?: number
  skip?: number
}) {
  return useQuery({
    queryKey: ['v2', 'thoughts', filters],
    queryFn: () => {
      const params: any = {}
      if (filters?.userQuery) params.userQuery = filters.userQuery
      if (filters?.agentConfigId) params.agentConfigId = filters.agentConfigId
      if (filters?.limit) params.limit = filters.limit
      if (filters?.skip) params.skip = filters.skip
      return callMCPTool('list_thoughts', params)
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useThought(id: string) {
  return useQuery({
    queryKey: ['v2', 'thought', id],
    queryFn: () => callMCPTool('get_thought', { id }),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  })
}

export function useGenerateThoughts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      userQuery: string
      agentConfigId: string
      conversationHistory?: Array<{ role: string; content: string }>
      availableTools?: string[]
    }) => callMCPTool('generate_thoughts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'thoughts'] })
    },
  })
}

export function useDeleteThought() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => callMCPTool('remove_thought', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'thoughts'] })
    },
  })
}

// Plans hooks
export function usePlans(filters?: {
  thoughtId?: string
  status?: 'pending' | 'in-progress' | 'completed' | 'failed'
  agentConfigId?: string
  startDate?: string
  endDate?: string
  limit?: number
  skip?: number
}) {
  return useQuery({
    queryKey: ['v2', 'plans', filters],
    queryFn: () => {
      const params: any = {}
      if (filters?.thoughtId) params.thoughtId = filters.thoughtId
      if (filters?.status) params.status = filters.status
      if (filters?.agentConfigId) params.agentConfigId = filters.agentConfigId
      if (filters?.startDate) params.startDate = filters.startDate
      if (filters?.endDate) params.endDate = filters.endDate
      if (filters?.limit) params.limit = filters.limit
      if (filters?.skip) params.skip = filters.skip
      return callMCPTool('list_plans', params)
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function usePlan(id: string) {
  return useQuery({
    queryKey: ['v2', 'plan', id],
    queryFn: () => callMCPTool('get_plan', { id }),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  })
}

export function useGeneratePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      thoughtId?: string
      thought?: any
      agentConfigId: string
      enableToolSearch?: boolean
    }) => callMCPTool('generate_plan', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'plans'] })
    },
  })
}

export function useDeletePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => callMCPTool('remove_plan', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'plans'] })
    },
  })
}

// Tasks hooks
export function useTasks(filters?: {
  planId?: string
  status?: 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled'
  agentConfigId?: string
  startDate?: string
  endDate?: string
  limit?: number
  skip?: number
}) {
  return useQuery({
    queryKey: ['v2', 'tasks', filters],
    queryFn: () => {
      const params: any = {}
      if (filters?.planId) params.planId = filters.planId
      if (filters?.status) params.status = filters.status
      if (filters?.agentConfigId) params.agentConfigId = filters.agentConfigId
      if (filters?.startDate) params.startDate = filters.startDate
      if (filters?.endDate) params.endDate = filters.endDate
      if (filters?.limit) params.limit = filters.limit
      if (filters?.skip) params.skip = filters.skip
      return callMCPTool('list_tasks', params)
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['v2', 'task', id],
    queryFn: () => callMCPTool('get_task', { id }),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => callMCPTool('remove_task', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'tasks'] })
    },
  })
}

export function useExecuteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ planId, agentConfigId }: { planId: string; agentConfigId: string }) =>
      mcpClientV2.executeTask(planId, agentConfigId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'tasks'] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'plans'] })
    },
  })
}

export function useResumeTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      taskId,
      userInputs,
    }: {
      taskId: string
      userInputs: Array<{ stepId: string; field: string; value: any }>
    }) => mcpClientV2.resumeTask(taskId, userInputs),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'tasks'] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'task', variables.taskId] })
    },
  })
}

export function useSummarizeTask() {
  return useMutation({
    mutationFn: ({
      taskId,
      format,
      includeInsights,
      includeRecommendations,
    }: {
      taskId: string
      format?: 'brief' | 'detailed' | 'technical'
      includeInsights?: boolean
      includeRecommendations?: boolean
    }) =>
      mcpClientV2.summarizeTask(taskId, {
        format,
        includeInsights,
        includeRecommendations,
      }),
  })
}

// Helper function to call MCP tools directly via /api/mcp-v2
async function callMCPTool(toolName: string, arguments_: any = {}) {
  const response = await fetch('/api/mcp-v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `req_${Date.now()}_${Math.random()}`,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: arguments_,
      },
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(data.error.message || 'MCP request failed')
  }

  // The route now handles cleaning and parsing, so data.result should already be parsed
  // But we still need to handle error cases
  if (data.result?.isError) {
    const errorText = data.result.content?.[0]?.text || 'Unknown error'
    throw new Error(errorText)
  }

  // Since the route now parses JSON responses, data.result should be the parsed data
  // If it's still in the old format with content array, handle it (backward compatibility)
  if (data.result?.content && Array.isArray(data.result.content)) {
    const textContent = data.result.content
      .map((item: any) => item?.text || '')
      .join('')
      .trim()

    if (textContent) {
      try {
        return JSON.parse(textContent)
      } catch {
        return textContent
      }
    }
  }

  // Transform the result to match component expectations
  let result = data.result

  // Handle search results that have a 'tools' or 'prompts' array
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    // If result has a 'tools' array (from search tools), extract and transform it
    if (Array.isArray(result.tools)) {
      return result.tools.map((tool: any) => ({
        name: tool.toolName || tool.name,
        description: tool.description,
        source: tool.source,
        operationType: tool.operationType,
        entityType: tool.entityType,
        score: tool.similarityScore || tool.originalScore || tool.score,
        inputSchema: tool.inputSchema,
        ...tool, // Include any other properties
      }))
    }

    // If result has a 'prompts' array (from search prompts), extract and transform it
    if (Array.isArray(result.prompts)) {
      return result.prompts.map((prompt: any) => ({
        name: prompt.promptName || prompt.name,
        description: prompt.description,
        source: prompt.source,
        arguments: prompt.arguments,
        score: prompt.similarityScore || prompt.originalScore || prompt.score,
        ...prompt, // Include any other properties
      }))
    }
  }

  // Return the result directly (should already be parsed by the route)
  return result
}

// Tools hooks
export function useTools(source?: 'remote' | 'local') {
  return useQuery({
    queryKey: ['v2', 'tools', source],
    queryFn: () => {
      const params = source ? { source } : {}
      return callMCPTool('list_tools', params)
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useTool(name: string) {
  return useQuery({
    queryKey: ['v2', 'tool', name],
    queryFn: () => callMCPTool('get_tool', { name }),
    enabled: !!name,
    staleTime: 1000 * 60 * 5,
  })
}

export function useExecuteTool() {
  return useMutation({
    mutationFn: ({ toolName, arguments: args }: { toolName: string; arguments: any }) =>
      callMCPTool('execute_mcp_tool', { toolName, arguments: args }),
  })
}

export function useInitTools() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ force = false, source = 'remote' }: { force?: boolean; source?: 'remote' | 'local' }) =>
      callMCPTool('init_tools', { force, source }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'tools'] })
    },
  })
}

// Prompts hooks
export function usePrompts(source?: 'remote' | 'local') {
  return useQuery({
    queryKey: ['v2', 'prompts', source],
    queryFn: () => {
      const params = source ? { source } : {}
      return callMCPTool('list_prompts', params)
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function usePrompt(name: string) {
  return useQuery({
    queryKey: ['v2', 'prompt', name],
    queryFn: () => callMCPTool('get_prompt', { name }),
    enabled: !!name,
    staleTime: 1000 * 60 * 5,
  })
}

export function useInitPrompts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ force = false, source = 'remote' }: { force?: boolean; source?: 'remote' | 'local' }) =>
      callMCPTool('init_prompts', { force, source }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'prompts'] })
    },
  })
}

// Resources hooks
export function useResources(source?: 'remote' | 'local') {
  return useQuery({
    queryKey: ['v2', 'resources', source],
    queryFn: () => {
      const params = source ? { source } : {}
      return callMCPTool('list_resources', params)
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useResource(uri: string) {
  return useQuery({
    queryKey: ['v2', 'resource', uri],
    queryFn: () => callMCPTool('get_resource', { uri }),
    enabled: !!uri,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateResource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      uri: string
      name: string
      description?: string
      mimeType?: string
      source?: 'remote' | 'local'
    }) => callMCPTool('add_resource', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'resources'] })
    },
  })
}

export function useUpdateResource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      uri,
      updates,
    }: {
      uri: string
      updates: {
        name?: string
        description?: string
        mimeType?: string
        source?: 'remote' | 'local'
      }
    }) => callMCPTool('update_resource', { uri, ...updates }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'resources'] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'resource', variables.uri] })
    },
  })
}

export function useDeleteResource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (uri: string) => callMCPTool('remove_resource', { uri }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'resources'] })
    },
  })
}

// Search hooks
export function useSearchTools(userPrompt: string, topK: number = 3) {
  return useQuery({
    queryKey: ['v2', 'search-tools', userPrompt, topK],
    queryFn: () => callMCPTool('get_tool_for_user_prompt', { userPrompt, topK }),
    enabled: !!userPrompt && userPrompt.trim().length > 0,
    staleTime: 1000 * 60 * 5,
  })
}

export function useSearchPrompts(userPrompt: string, topK: number = 3) {
  return useQuery({
    queryKey: ['v2', 'search-prompts', userPrompt, topK],
    queryFn: () => callMCPTool('get_prompt_for_user_prompt', { userPrompt, topK }),
    enabled: !!userPrompt && userPrompt.trim().length > 0,
    staleTime: 1000 * 60 * 5,
  })
}

// MCP Resources hooks (remote server resources)
export function useMCPResources() {
  return useQuery({
    queryKey: ['v2', 'mcp-resources'],
    queryFn: () => mcpClientV2.listMCPResources(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useMCPResource(uri: string) {
  return useQuery({
    queryKey: ['v2', 'mcp-resource', uri],
    queryFn: () => mcpClientV2.readMCPResource(uri),
    enabled: !!uri && uri.trim().length > 0,
    staleTime: 1000 * 60 * 5,
  })
}

// Prompt Extraction hooks
export function useExtractLocalPrompt() {
  return useMutation({
    mutationFn: ({ name, arguments: args }: { name: string; arguments?: Record<string, any> }) =>
      callMCPTool('extract_local_prompt', { name, arguments: args || {} }),
  })
}

export function useExtractRemotePrompt() {
  return useMutation({
    mutationFn: ({ name, arguments: args }: { name: string; arguments?: Record<string, any> }) =>
      callMCPTool('extract_remote_prompt', { name, arguments: args || {} }),
  })
}

// ============================================================================
// Orchestrator Management Hooks (port 5001)
// ============================================================================

// Available Models hooks
export function useOrchestratorAvailableModels(provider?: string) {
  return useQuery({
    queryKey: ['orchestrator', 'available-models', provider],
    queryFn: () => mcpClientOrchestrator.listAvailableModels(provider),
    staleTime: 1000 * 60 * 5,
  })
}

export function useOrchestratorAvailableModel(id: string) {
  return useQuery({
    queryKey: ['orchestrator', 'available-model', id],
    queryFn: () => mcpClientOrchestrator.getAvailableModel(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateOrchestratorAvailableModel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ provider, modelName, modelId }: { provider: string; modelName: string; modelId?: string }) =>
      mcpClientOrchestrator.createAvailableModel(provider, modelName, modelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orchestrator', 'available-models'] })
    },
  })
}

export function useUpdateOrchestratorAvailableModel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: { provider?: string; modelName?: string; modelId?: string }
    }) => mcpClientOrchestrator.updateAvailableModel(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orchestrator', 'available-models'] })
      queryClient.invalidateQueries({ queryKey: ['orchestrator', 'available-model', variables.id] })
    },
  })
}

export function useDeleteOrchestratorAvailableModel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => mcpClientOrchestrator.deleteAvailableModel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orchestrator', 'available-models'] })
    },
  })
}

// Agent Config hooks
export function useOrchestratorAgentConfigs(isEnabled?: boolean) {
  return useQuery({
    queryKey: ['orchestrator', 'agent-configs', isEnabled],
    queryFn: () => mcpClientOrchestrator.listAgentConfigs(isEnabled),
    staleTime: 1000 * 60 * 5,
  })
}

export function useOrchestratorAgentConfig(id: string) {
  return useQuery({
    queryKey: ['orchestrator', 'agent-config', id],
    queryFn: () => mcpClientOrchestrator.getAgentConfig(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateOrchestratorAgentConfig() {
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
      mcpClientOrchestrator.createAgentConfig(availableModelId, apiKey, maxTokenCount, isEnabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orchestrator', 'agent-configs'] })
    },
  })
}

export function useUpdateOrchestratorAgentConfig() {
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
    }) => mcpClientOrchestrator.updateAgentConfig(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orchestrator', 'agent-configs'] })
      queryClient.invalidateQueries({ queryKey: ['orchestrator', 'agent-config', variables.id] })
    },
  })
}

export function useDeleteOrchestratorAgentConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => mcpClientOrchestrator.deleteAgentConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orchestrator', 'agent-configs'] })
    },
  })
}

// Orchestrator hooks
export function useOrchestrators(filters?: { name?: string; status?: string }) {
  return useQuery({
    queryKey: ['orchestrator', 'orchestrators', filters],
    queryFn: () => mcpClientOrchestrator.listOrchestrators(filters),
    staleTime: 1000 * 60 * 5,
  })
}

export function useOrchestrator(id: string) {
  return useQuery({
    queryKey: ['orchestrator', 'orchestrator', id],
    queryFn: () => mcpClientOrchestrator.getOrchestrator(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateOrchestrator() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      name: string
      description?: string
      status?: string
      config?: any
    }) => mcpClientOrchestrator.createOrchestrator(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orchestrator', 'orchestrators'] })
    },
  })
}

export function useUpdateOrchestrator() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: {
        name?: string
        description?: string
        status?: string
        config?: any
      }
    }) => mcpClientOrchestrator.updateOrchestrator(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orchestrator', 'orchestrators'] })
      queryClient.invalidateQueries({ queryKey: ['orchestrator', 'orchestrator', variables.id] })
    },
  })
}

export function useDeleteOrchestrator() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => mcpClientOrchestrator.deleteOrchestrator(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orchestrator', 'orchestrators'] })
    },
  })
}

// Orchestration hooks
export function useOrchestrations(filters?: {
  orchestratorId?: string
  status?: 'pending' | 'thought' | 'planning' | 'executing' | 'paused' | 'completed' | 'failed'
  limit?: number
  skip?: number
}) {
  return useQuery({
    queryKey: ['orchestrator', 'orchestrations', filters],
    queryFn: () => mcpClientOrchestrator.listOrchestrations(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes for execution history
  })
}

export function useOrchestrationExecutions(filters?: {
  orchestratorId?: string
  status?: 'pending' | 'thought' | 'planning' | 'executing' | 'paused' | 'completed' | 'failed'
  limit?: number
  skip?: number
}) {
  return useQuery({
    queryKey: ['orchestrator', 'orchestration-executions', filters],
    queryFn: () => mcpClientOrchestrator.listOrchestrationExecutions(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes for execution history
  })
}

export function useOrchestration(id: string) {
  return useQuery({
    queryKey: ['orchestrator', 'orchestration', id],
    queryFn: () => mcpClientOrchestrator.getOrchestration(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  })
}

// Hook for getting orchestration (no polling - use SSE for real-time updates)
export function useGetOrchestration(executionId: string) {
  return useQuery({
    queryKey: ['orchestration', executionId],
    queryFn: () => mcpClientOrchestrator.getOrchestration(executionId),
    enabled: !!executionId,
    // No polling - use SSE streaming for real-time updates during execution
    staleTime: 1000 * 60 * 2, // 2 minutes for completed executions
  })
}

// Intelligence Dashboard hooks
export function useIntelligenceStats(timeRange?: string) {
  return useQuery({
    queryKey: ['intelligence', 'stats', timeRange],
    queryFn: () => mcpClientOrchestrator.getIntelligenceStats(timeRange),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

export function useIntelligenceHealth() {
  return useQuery({
    queryKey: ['intelligence', 'health'],
    queryFn: () => mcpClientOrchestrator.getIntelligenceHealth(),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
  })
}

export function useIntelligenceMetrics(timeRange?: string, type?: string) {
  return useQuery({
    queryKey: ['intelligence', 'metrics', timeRange, type],
    queryFn: () => mcpClientOrchestrator.getIntelligenceMetrics(timeRange, type),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// Semantic Search hooks
export function useSemanticSearch(
  query: string,
  filters?: any,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['intelligence', 'semantic-search', query, filters],
    queryFn: () => mcpClientOrchestrator.searchSimilarExecutions(query, filters),
    enabled: options?.enabled !== false && query.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Embeddings hooks
export function useEmbeddingsStatus() {
  return useQuery({
    queryKey: ['intelligence', 'embeddings', 'status'],
    queryFn: () => mcpClientOrchestrator.getEmbeddingsStatus(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  })
}

export function useEmbeddingsTimeline(timeRange?: string) {
  return useQuery({
    queryKey: ['intelligence', 'embeddings', 'timeline', timeRange],
    queryFn: () => mcpClientOrchestrator.getEmbeddingsTimeline(timeRange),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useTriggerBackfill() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (options?: { orchestratorId?: string }) =>
      mcpClientOrchestrator.triggerBackfill(options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intelligence', 'embeddings'] })
    },
  })
}

export function useBackfillStatus() {
  return useQuery({
    queryKey: ['intelligence', 'embeddings', 'backfill-status'],
    queryFn: () => mcpClientOrchestrator.getBackfillStatus(),
    staleTime: 1000 * 10, // 10 seconds
    refetchInterval: 1000 * 10, // Refetch every 10 seconds when backfill is running
  })
}

export function useExecuteOrchestration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      orchestratorId,
      userQuery,
      conversationHistory,
      stream = true,
    }: {
      orchestratorId: string
      userQuery: string
      conversationHistory?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
      stream?: boolean
    }) =>
      mcpClientOrchestrator.executeOrchestration(orchestratorId, userQuery, {
        conversationHistory,
        stream,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orchestrator', 'orchestrations'] })
    },
  })
}

// Performance Metrics hooks
export function usePerformanceMetrics(filters?: {
  executionId?: string
  orchestratorId?: string
  agentConfigId?: string
  startDate?: string
  endDate?: string
  limit?: number
  skip?: number
}) {
  return useQuery({
    queryKey: ['orchestrator', 'performance-metrics', filters],
    queryFn: () => mcpClientOrchestrator.getPerformanceMetrics(filters),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCapturePerformanceMetrics() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ executionId, metrics }: { executionId: string; metrics: any }) =>
      mcpClientOrchestrator.capturePerformanceMetrics(executionId, metrics),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orchestrator', 'performance-metrics'] })
    },
  })
}

export function usePerformanceTrends(filters: {
  orchestratorId?: string
  agentConfigId?: string
  metricType?: 'successRate' | 'latency' | 'confidence' | 'quality' | 'cost'
  startDate?: string
  endDate?: string
}) {
  return useQuery({
    queryKey: ['orchestrator', 'performance-trends', filters],
    queryFn: () => mcpClientOrchestrator.analyzePerformanceTrends(filters),
    enabled: !!filters.orchestratorId || !!filters.agentConfigId,
    staleTime: 1000 * 60 * 5,
  })
}

export function usePerformanceReport(filters: {
  orchestratorId: string
  startDate?: string
  endDate?: string
  format?: 'summary' | 'detailed'
}) {
  return useQuery({
    queryKey: ['orchestrator', 'performance-report', filters],
    queryFn: () => mcpClientOrchestrator.getPerformanceReport(filters),
    enabled: !!filters.orchestratorId,
    staleTime: 1000 * 60 * 5,
  })
}

// Confidence Scores hooks
export function useConfidenceScores(filters?: {
  executionId?: string
  orchestratorId?: string
  phase?: 'thought' | 'plan' | 'execution' | 'summary' | 'completed'
  startDate?: string
  endDate?: string
  limit?: number
  skip?: number
}) {
  return useQuery({
    queryKey: ['orchestrator', 'confidence-scores', filters],
    queryFn: () => mcpClientOrchestrator.getConfidenceScores(filters),
    staleTime: 1000 * 60 * 5,
  })
}

export function useStoreConfidenceScore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      executionId,
      phase,
      scores,
      agentConfigId,
      reasoning,
    }: {
      executionId: string
      phase: 'thought' | 'plan' | 'execution' | 'summary' | 'completed'
      scores: {
        thought?: number
        plan?: number
        execution?: number
        summary?: number
        overall?: number
      }
      agentConfigId?: string
      reasoning?: string
    }) =>
      mcpClientOrchestrator.storeConfidenceScore(executionId, phase, scores, {
        agentConfigId,
        reasoning,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orchestrator', 'confidence-scores'] })
    },
  })
}

export function useConfidenceCalibration(filters: {
  orchestratorId?: string
  phase?: 'thought' | 'plan' | 'execution' | 'summary' | 'completed'
  startDate?: string
  endDate?: string
}) {
  return useQuery({
    queryKey: ['orchestrator', 'confidence-calibration', filters],
    queryFn: () => mcpClientOrchestrator.analyzeConfidenceCalibration(filters),
    staleTime: 1000 * 60 * 5,
  })
}

// Performance Baselines hooks
export function useCreatePerformanceBaseline() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      orchestratorId: string
      name: string
      description?: string
      startDate: string
      endDate: string
    }) => mcpClientOrchestrator.createPerformanceBaseline(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orchestrator', 'performance-baselines'] })
    },
  })
}

export function useComparePerformance() {
  return useMutation({
    mutationFn: (data: {
      orchestratorId: string
      baselineId: string
      startDate?: string
      endDate?: string
    }) => mcpClientOrchestrator.comparePerformance(data),
  })
}

// Query Classification hooks
export function useClassifyQuery() {
  return useMutation({
    mutationFn: ({ query, orchestratorId }: { query: string; orchestratorId: string }) =>
      mcpClientOrchestrator.classifyQuery(query, orchestratorId),
  })
}

// Prompt Enhancement hooks
export function useEnhancePrompt() {
  return useMutation({
    mutationFn: ({
      basePrompt,
      userQuery,
      orchestratorId,
      phase,
      options,
    }: {
      basePrompt: string
      userQuery: string
      orchestratorId: string
      phase: 'thought' | 'plan' | 'execution' | 'summary'
      options?: {
        includeFewShot?: boolean
        includeContext?: boolean
        maxFewShotExamples?: number
        useMetaPrompting?: boolean
      }
    }) => mcpClientOrchestrator.enhancePrompt(basePrompt, userQuery, orchestratorId, phase, options),
  })
}

// Pattern hooks
export function usePatterns(filters?: { orchestratorId?: string; patternType?: string }) {
  return useQuery({
    queryKey: ['intelligence', 'patterns', filters],
    queryFn: () => mcpClientOrchestrator.listPatterns(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useExtractPatterns() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (options?: {
      orchestratorId?: string
      startDate?: string
      endDate?: string
    }) => mcpClientOrchestrator.extractPatterns(options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intelligence', 'patterns'] })
    },
  })
}

// Few-Shot Learning hooks
export function useFewShotExamples(filters?: {
  query?: string
  phase?: 'thought' | 'plan' | 'execution' | 'summary'
  orchestratorId?: string
  minSimilarity?: number
  limit?: number
  requireHighQuality?: boolean
}) {
  return useQuery({
    queryKey: ['intelligence', 'few-shot', 'examples', filters],
    queryFn: async () => {
      if (!filters?.query || !filters?.phase) {
        return { examples: [], count: 0, averageSimilarity: 0, averageConfidence: 0 }
      }
      return mcpClientOrchestrator.extractFewShotExamples(
        filters.query,
        filters.phase,
        {
          orchestratorId: filters.orchestratorId,
          minSimilarity: filters.minSimilarity,
          limit: filters.limit,
          requireHighQuality: filters.requireHighQuality,
        }
      )
    },
    enabled: !!filters?.query && !!filters?.phase,
    staleTime: 1000 * 60 * 5,
  })
}

export function useFewShotEffectiveness(filters?: {
  phase?: 'thought' | 'plan' | 'execution' | 'summary'
  orchestratorId?: string
}) {
  // Compute effectiveness from examples data
  const { data: examplesData } = useFewShotExamples({
    query: '', // Will be disabled without query
    phase: filters?.phase,
    orchestratorId: filters?.orchestratorId,
  })

  return useMemo(() => {
    if (!examplesData?.examples) {
      return {
        totalExamples: 0,
        avgSimilarity: 0,
        avgConfidence: 0,
        highQualityCount: 0,
      }
    }

    const examples = examplesData.examples || []
    const totalExamples = examples.length
    const avgSimilarity = examplesData.averageSimilarity || 0
    const avgConfidence = examplesData.averageConfidence || 0
    const highQualityCount = examples.filter((e: any) => e.quality && e.quality >= 80).length

    return {
      totalExamples,
      avgSimilarity,
      avgConfidence,
      highQualityCount,
    }
  }, [examplesData])
}

// Memory hooks
export function useMemoryList(filters?: {
  orchestratorId?: string
  category?: 'success' | 'pattern' | 'insight' | 'warning'
  limit?: number
}) {
  return useQuery({
    queryKey: ['intelligence', 'memory', 'list', filters],
    queryFn: () => mcpClientOrchestrator.listMemories(filters),
    staleTime: 1000 * 60 * 5,
  })
}

export function useMemoryAnalytics() {
  const { data: memoryData, isLoading } = useMemoryList()

  const analytics = useMemo(() => {
    if (!memoryData?.memories) {
      return {
        totalMemories: 0,
        avgEffectiveness: 0,
        totalUsage: 0,
        categoryBreakdown: {},
      }
    }

    const memories = memoryData.memories || []
    const totalMemories = memories.length
    const totalUsage = memories.reduce((sum: number, m: any) => sum + (m.usageCount || 0), 0)
    const avgEffectiveness =
      memories.length > 0
        ? memories.reduce((sum: number, m: any) => sum + (m.effectiveness || 0), 0) / memories.length
        : 0

    const categoryBreakdown: Record<string, number> = {}
    memories.forEach((m: any) => {
      const cat = m.category || 'unknown'
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1
    })

    return {
      totalMemories,
      avgEffectiveness,
      totalUsage,
      categoryBreakdown,
    }
  }, [memoryData])

  return { data: analytics, isLoading }
}

export function useMemoryEffectiveness(filters?: {
  category?: 'success' | 'pattern' | 'insight' | 'warning'
  minEffectiveness?: number
}) {
  const { data: memoryData } = useMemoryList({ category: filters?.category })

  return useMemo(() => {
    if (!memoryData?.memories) {
      return []
    }

    let memories = memoryData.memories || []

    if (filters?.minEffectiveness) {
      memories = memories.filter((m: any) => (m.effectiveness || 0) >= filters.minEffectiveness!)
    }

    return memories
      .sort((a: any, b: any) => (b.effectiveness || 0) - (a.effectiveness || 0))
      .map((m: any) => ({
        memoryId: m.memoryId,
        title: m.title || 'Untitled',
        category: m.category,
        effectiveness: m.effectiveness || 0,
        usageCount: m.usageCount || 0,
        successRate: m.successRate || 0,
        description: m.description || '',
      }))
  }, [memoryData, filters])
}

export function useMemoryUsage() {
  const { data: memoryData, isLoading } = useMemoryList()

  const usage = useMemo(() => {
    if (!memoryData?.memories) {
      return {
        usagePatterns: [],
        retrievalTrends: [],
      }
    }

    const memories = memoryData.memories || []
    const usagePatterns = memories
      .map((m: any) => ({
        memoryId: m.memoryId,
        category: m.category,
        usageCount: m.usageCount || 0,
      }))
      .sort((a: any, b: any) => b.usageCount - a.usageCount)

    return {
      usagePatterns,
      retrievalTrends: usagePatterns,
    }
  }, [memoryData])

  return { data: usage, isLoading }
}

// Intelligence Comparison hooks
export function useIntelligenceComparison(filters?: {
  orchestratorId?: string
  dateRange?: string
}) {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['intelligence', 'comparison', 'metrics', filters],
    queryFn: () =>
      mcpClientOrchestrator.getPerformanceMetrics({
        orchestratorId: filters?.orchestratorId,
      }),
    staleTime: 1000 * 60 * 5,
  })

  const comparison = useMemo(() => {
    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return {
        withIntelligence: { count: 0, successRate: 0, avgConfidence: 0, avgQuality: 0, avgLatency: 0 },
        withoutIntelligence: { count: 0, successRate: 0, avgConfidence: 0, avgQuality: 0, avgLatency: 0 },
      }
    }

    // Separate metrics by whether they used intelligence features
    // We'll use a heuristic: if confidence/quality scores exist, assume intelligence was used
    const withIntelligence = metrics.filter(
      (m: any) => m.confidence?.overall || m.quality?.outputCompleteness
    )
    const withoutIntelligence = metrics.filter(
      (m: any) => !m.confidence?.overall && !m.quality?.outputCompleteness
    )

    const calcStats = (items: any[]) => {
      if (items.length === 0) {
        return { count: 0, successRate: 0, avgConfidence: 0, avgQuality: 0, avgLatency: 0 }
      }

      const successCount = items.filter((m: any) => m.execution?.status === 'success').length
      const successRate = (successCount / items.length) * 100

      const confidences = items
        .map((m: any) => m.confidence?.overall)
        .filter((c: any) => c !== undefined)
      const avgConfidence = confidences.length > 0 ? confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length : 0

      const qualities = items
        .map((m: any) => m.quality?.outputCompleteness)
        .filter((q: any) => q !== undefined)
      const avgQuality = qualities.length > 0 ? qualities.reduce((a: number, b: number) => a + b, 0) / qualities.length : 0

      const latencies = items
        .map((m: any) => m.execution?.latency?.total)
        .filter((l: any) => l !== undefined)
      const avgLatency = latencies.length > 0 ? latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length : 0

      return {
        count: items.length,
        successRate,
        avgConfidence,
        avgQuality,
        avgLatency,
      }
    }

    return {
      withIntelligence: calcStats(withIntelligence),
      withoutIntelligence: calcStats(withoutIntelligence),
    }
  }, [metrics])

  return { data: comparison, isLoading }
}

export function useFeatureImpact(filters?: { orchestratorId?: string }) {
  const { data: comparison, isLoading } = useIntelligenceComparison(filters)

  const impact = useMemo(() => {
    if (!comparison) {
      return {
        impact: [],
        recommendations: [],
      }
    }

    const impactData = [
      {
        feature: 'Confidence Scoring',
        improvement: comparison.withIntelligence.avgConfidence - comparison.withoutIntelligence.avgConfidence,
      },
      {
        feature: 'Quality Metrics',
        improvement: comparison.withIntelligence.avgQuality - comparison.withoutIntelligence.avgQuality,
      },
      {
        feature: 'Success Rate',
        improvement: comparison.withIntelligence.successRate - comparison.withoutIntelligence.successRate,
      },
    ]

    return {
      impact: impactData,
      recommendations: impactData.filter((i) => i.improvement > 0),
    }
  }, [comparison])

  return { data: impact, isLoading }
}

export function usePerformanceComparison(filters?: {
  orchestratorId?: string
  dateRange?: string
}) {
  return useQuery({
    queryKey: ['intelligence', 'performance-comparison', filters],
    queryFn: () =>
      mcpClientOrchestrator.getPerformanceMetrics({
        orchestratorId: filters?.orchestratorId,
      }),
    staleTime: 1000 * 60 * 5,
  })
}

// Test Prompt hooks
export function useTestPrompts(filters?: {
  categories?: string[]
  tags?: string[]
  version?: string
}) {
  return useQuery({
    queryKey: ['test-prompts', filters],
    queryFn: () => mcpClientOrchestrator.listTestPrompts(filters),
    staleTime: 1000 * 60 * 5,
  })
}

export function useGetTestPrompt(promptId: string) {
  return useQuery({
    queryKey: ['test-prompt', promptId],
    queryFn: () => mcpClientOrchestrator.getTestPrompt(promptId),
    enabled: !!promptId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateTestPrompt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof mcpClientOrchestrator.createTestPrompt>[0]) =>
      mcpClientOrchestrator.createTestPrompt(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-prompts'] })
    },
  })
}

export function useUpdateTestPrompt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      promptId,
      ...data
    }: {
      promptId: string
    } & Partial<Parameters<typeof mcpClientOrchestrator.createTestPrompt>[0]>) =>
      mcpClientOrchestrator.updateTestPrompt(promptId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['test-prompts'] })
      queryClient.invalidateQueries({ queryKey: ['test-prompt', variables.promptId] })
    },
  })
}

export function useDeleteTestPrompt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (promptId: string) => mcpClientOrchestrator.deleteTestPrompt(promptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-prompts'] })
    },
  })
}

// Test Execution hooks
export function useRunTestPrompt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Parameters<typeof mcpClientOrchestrator.runTestPrompt>[0]) => {
      console.log('[useRunTestPrompt] Calling runTestPrompt with:', data)
      const result = await mcpClientOrchestrator.runTestPrompt(data)
      console.log('[useRunTestPrompt] Raw result:', result)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-runs'] })
      queryClient.invalidateQueries({ queryKey: ['test-prompts'] })
    },
  })
}

export function useGetTestRun(runId: string) {
  return useQuery({
    queryKey: ['test-run', runId],
    queryFn: () => mcpClientOrchestrator.getTestRun(runId),
    enabled: !!runId,
    // No polling - use SSE streaming for real-time updates during execution
    staleTime: 1000 * 60 * 2, // 2 minutes for completed tests
  })
}

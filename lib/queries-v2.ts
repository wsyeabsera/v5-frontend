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

'use client'

// Use Next.js API route as proxy to MCP V2 server (port 4000)
const MCP_V2_API_URL = '/api/mcp-v2'

// HTTP JSON-RPC client for MCP V2 (port 4000)
class MCPClientV2 {
  private url: string
  private requestId = 0

  constructor(url: string) {
    this.url = url
  }

  private generateId(): string {
    return `req_${Date.now()}_${++this.requestId}`
  }

  private async request(method: string, params: any = {}) {
    const id = this.generateId()
    
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id,
        method: 'tools/call',
        params: {
          name: method,
          arguments: params,
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

    // Handle MCP response format
    if (data.result?.isError) {
      const errorText = data.result.content?.[0]?.text || 'Unknown error'
      throw new Error(errorText)
    }

    // Parse JSON from text content if present
    const textContent = data.result?.content?.[0]?.text
    if (textContent) {
      try {
        return JSON.parse(textContent)
      } catch {
        return textContent
      }
    }

    return data.result
  }

  // Available Models methods
  async listAvailableModels(provider?: string) {
    const params = provider ? { provider } : {}
    return this.request('list_available_models', params)
  }

  async getAvailableModel(id: string) {
    return this.request('get_available_model', { id })
  }

  async createAvailableModel(provider: string, modelName: string, modelId?: string) {
    const params: any = { provider, modelName }
    if (modelId) {
      params.modelId = modelId
    }
    return this.request('add_available_model', params)
  }

  async updateAvailableModel(id: string, updates: { provider?: string; modelName?: string; modelId?: string }) {
    return this.request('update_available_model', { id, ...updates })
  }

  async deleteAvailableModel(id: string) {
    return this.request('remove_available_model', { id })
  }

  // Agent Config methods
  async listAgentConfigs(isEnabled?: boolean) {
    const params = isEnabled !== undefined ? { isEnabled } : {}
    return this.request('list_agent_configs', params)
  }

  async getAgentConfig(id: string) {
    return this.request('get_agent_config', { id })
  }

  async createAgentConfig(
    availableModelId: string,
    apiKey: string,
    maxTokenCount: number,
    isEnabled: boolean = true
  ) {
    return this.request('add_agent_config', {
      availableModelId,
      apiKey,
      maxTokenCount,
      isEnabled,
    })
  }

  async updateAgentConfig(
    id: string,
    updates: {
      availableModelId?: string
      apiKey?: string
      maxTokenCount?: number
      isEnabled?: boolean
    }
  ) {
    return this.request('update_agent_config', { id, ...updates })
  }

  async deleteAgentConfig(id: string) {
    return this.request('remove_agent_config', { id })
  }

  // AI Execution methods
  async executeAICall(
    agentConfigId: string,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: {
      temperature?: number
      maxTokens?: number
      topP?: number
      responseFormat?: { type: 'json_object' }
    }
  ) {
    const params: any = {
      agentConfigId,
      messages,
    }
    if (options?.temperature !== undefined) params.temperature = options.temperature
    if (options?.maxTokens !== undefined) params.maxTokens = options.maxTokens
    if (options?.topP !== undefined) params.topP = options.topP
    if (options?.responseFormat) params.responseFormat = options.responseFormat
    return this.request('execute_ai_call', params)
  }

  // Request management methods
  async createRequest(data: {
    query: string
    categories: string[]
    tags: string[]
    version: string
  }) {
    return this.request('add_request', data)
  }

  async getRequest(id: string) {
    return this.request('get_request', { id })
  }

  async listRequests(filters?: {
    categories?: string[]
    tags?: string[]
    version?: string
  }) {
    const params = filters || {}
    return this.request('list_requests', params)
  }

  async updateRequest(
    id: string,
    updates: {
      query?: string
      categories?: string[]
      tags?: string[]
      version?: string
    }
  ) {
    return this.request('update_request', { id, ...updates })
  }

  async deleteRequest(id: string) {
    return this.request('remove_request', { id })
  }
}

// Singleton instance
export const mcpClientV2 = new MCPClientV2(MCP_V2_API_URL)

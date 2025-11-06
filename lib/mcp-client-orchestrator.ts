'use client'

// Use Next.js API route as proxy to Orchestrator Management MCP server (port 5001)
const MCP_ORCHESTRATOR_API_URL = '/api/mcp-orchestrator'

// HTTP JSON-RPC client for Orchestrator Management MCP (port 5001)
class MCPClientOrchestrator {
  private url: string
  private requestId = 0

  constructor(url: string) {
    this.url = url
  }

  private generateId(): string {
    return `req_${Date.now()}_${++this.requestId}`
  }

  async request(method: string, params: any = {}, options?: { preserveNewlines?: boolean }) {
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
        options: options || {},
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

    if (data.result?.isError) {
      const errorText = data.result.content?.[0]?.text || 'Unknown error'
      throw new Error(errorText)
    }

    // The API route should already have cleaned and parsed the result
    // So data.result should already be the parsed object/array
    // But if it still has content array, parse it
    if (data.result?.content && Array.isArray(data.result.content)) {
      const textContent = data.result.content
        .map((item: any) => item?.text || '')
        .join('')
        .trim()

      if (textContent) {
        try {
          const parsed = JSON.parse(textContent)
          return parsed
        } catch {
          // If parsing fails, return as-is (might be a string)
          return textContent
        }
      }
    }

    // Return the result directly - it should already be parsed by the API route
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

  // Orchestrator methods
  async listOrchestrators(filters?: { name?: string; status?: string }) {
    const params = filters || {}
    return this.request('list_orchestrators', params)
  }

  async getOrchestrator(id: string) {
    return this.request('get_orchestrator', { id })
  }

  async createOrchestrator(data: {
    name: string
    description?: string
    status?: string
    config?: any
  }) {
    return this.request('create_orchestrator', data)
  }

  async updateOrchestrator(
    id: string,
    updates: {
      name?: string
      description?: string
      status?: string
      config?: any
    }
  ) {
    return this.request('update_orchestrator', { id, ...updates })
  }

  async deleteOrchestrator(id: string) {
    return this.request('delete_orchestrator', { id })
  }

  // Orchestration execution methods
  async executeOrchestration(
    orchestratorId: string,
    userQuery: string,
    options?: {
      conversationHistory?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
      stream?: boolean
      summaryFormat?: 'brief' | 'detailed' | 'technical'
    }
  ) {
    const params: any = {
      orchestratorId,
      userQuery,
      stream: options?.stream !== false, // Default to true
    }
    if (options?.conversationHistory) {
      params.conversationHistory = options.conversationHistory
    }
    if (options?.summaryFormat) {
      params.summaryFormat = options.summaryFormat
    }
    return this.request('execute_orchestration', params)
  }

  async getOrchestration(id: string) {
    return this.request('get_orchestration', { id })
  }

  async listOrchestrations(filters?: {
    orchestratorId?: string
    status?: 'pending' | 'thought' | 'planning' | 'executing' | 'paused' | 'completed' | 'failed'
    limit?: number
    skip?: number
  }) {
    const params = filters || {}
    const response = await this.request('list_orchestrations', params)
    // Extract executions array from nested response
    if (response && typeof response === 'object') {
      if (Array.isArray(response.executions)) {
        return response.executions
      }
      if (Array.isArray(response)) {
        return response // Backward compatibility
      }
    }
    return []
  }

  async listOrchestrationExecutions(filters?: {
    orchestratorId?: string
    status?: 'pending' | 'thought' | 'planning' | 'executing' | 'paused' | 'completed' | 'failed'
    limit?: number
    skip?: number
  }) {
    try {
      const params = filters || {}
      let response = await this.request('list_orchestration_executions', params)
      
      // If response is a string, try to parse it as JSON
      if (typeof response === 'string') {
        try {
          // Clean the string first - handle problematic escape sequences
          let cleaned = response.trim()
          
          // Fix common invalid escape sequences that might be in the JSON
          // Replace invalid escape sequences like \@, \! with the actual character
          cleaned = cleaned.replace(/\\([^"\\/bfnrtu])/g, '$1')
          
          // Replace escaped newlines with actual newlines, then remove them
          cleaned = cleaned.replace(/\\n/g, '')
          cleaned = cleaned.replace(/\n/g, '')
          // Remove trailing patterns like \n4
          cleaned = cleaned.replace(/\\n\d+$/g, '')
          cleaned = cleaned.replace(/\n\d+$/g, '')
          cleaned = cleaned.trim()
          
          response = JSON.parse(cleaned)
        } catch (e) {
          console.error('[listOrchestrationExecutions] Failed to parse string response:', e)
          console.error('[listOrchestrationExecutions] Response string length:', response.length)
          // Return empty array if parsing fails - the API route should have handled this
          return []
        }
      }
      
      // Extract executions array from nested response
      // Backend returns: { total: number, executions: [...] }
      // Wrapped in MCP content format: { content: [{ type: 'text', text: JSON.stringify({ total, executions }) }] }
      // After cleanAndParseMCPResult, should be: { total: number, executions: [...] }
      
      if (response && typeof response === 'object') {
        // Case 1: Direct array (backward compatibility)
        if (Array.isArray(response)) {
          return response
        }
        
        // Case 2: Object with executions array
        if (Array.isArray(response.executions)) {
          return response.executions
        }
        
        // Case 3: Object with data.executions (nested)
        if (response.data && Array.isArray(response.data.executions)) {
          return response.data.executions
        }
        
        // Case 4: Object with content that needs parsing (shouldn't happen after cleanAndParseMCPResult, but handle it)
        if (response.content && Array.isArray(response.content)) {
          const textContent = response.content
            .map((item: any) => item?.text || '')
            .join('')
            .trim()
          
          if (textContent) {
            try {
              const parsed = JSON.parse(textContent)
              if (Array.isArray(parsed.executions)) {
                return parsed.executions
              }
              if (Array.isArray(parsed)) {
                return parsed
              }
            } catch (e) {
              console.warn('[listOrchestrationExecutions] Failed to parse content:', e)
            }
          }
        }
        
        console.warn('[listOrchestrationExecutions] Unexpected response format:', response)
      }
      
      return []
    } catch (error: any) {
      console.error('[listOrchestrationExecutions] Error:', error)
      throw error
    }
  }

  // Performance metrics methods
  async getPerformanceMetrics(filters?: {
    executionId?: string
    orchestratorId?: string
    agentConfigId?: string
    startDate?: string
    endDate?: string
    limit?: number
    skip?: number
  }) {
    try {
      const params = filters || {}
      const response = await this.request('get_performance_metrics', params)
      
      // Extract metrics array from nested response
      // Backend returns: { total: number, metrics: [...] }
      // Wrapped in MCP content format: { content: [{ type: 'text', text: JSON.stringify({ total, metrics }) }] }
      // After cleanAndParseMCPResult, should be: { total: number, metrics: [...] }
      
      if (response && typeof response === 'object') {
        // Case 1: Direct array (backward compatibility)
        if (Array.isArray(response)) {
          return response
        }
        
        // Case 2: Object with metrics array
        if (Array.isArray(response.metrics)) {
          return response.metrics
        }
        
        // Case 3: Object with data.metrics (nested)
        if (response.data && Array.isArray(response.data.metrics)) {
          return response.data.metrics
        }
        
        // Case 4: Object with content that needs parsing (shouldn't happen after cleanAndParseMCPResult, but handle it)
        if (response.content && Array.isArray(response.content)) {
          const textContent = response.content
            .map((item: any) => item?.text || '')
            .join('')
            .trim()
          
          if (textContent) {
            try {
              const parsed = JSON.parse(textContent)
              if (Array.isArray(parsed.metrics)) {
                return parsed.metrics
              }
              if (Array.isArray(parsed)) {
                return parsed
              }
            } catch (e) {
              console.warn('[getPerformanceMetrics] Failed to parse content:', e)
            }
          }
        }
      }
      return []
    } catch (error: any) {
      console.error('[getPerformanceMetrics] Error:', error)
      throw error
    }
  }

  async capturePerformanceMetrics(executionId: string, metrics: any) {
    return this.request('capture_performance_metrics', { executionId, metrics })
  }

  async analyzePerformanceTrends(filters: {
    orchestratorId?: string
    agentConfigId?: string
    metricType?: 'successRate' | 'latency' | 'confidence' | 'quality' | 'cost'
    startDate?: string
    endDate?: string
  }) {
    return this.request('analyze_performance_trends', filters)
  }

  async getPerformanceReport(filters: {
    orchestratorId: string
    startDate?: string
    endDate?: string
    format?: 'summary' | 'detailed'
  }) {
    return this.request('get_performance_report', filters)
  }

  // Confidence scores methods
  async getConfidenceScores(filters?: {
    executionId?: string
    orchestratorId?: string
    phase?: 'thought' | 'plan' | 'execution' | 'summary' | 'completed'
    startDate?: string
    endDate?: string
    limit?: number
    skip?: number
  }) {
    const params = filters || {}
    return this.request('get_confidence_scores', params)
  }

  async storeConfidenceScore(
    executionId: string,
    phase: 'thought' | 'plan' | 'execution' | 'summary' | 'completed',
    scores: {
      thought?: number
      plan?: number
      execution?: number
      summary?: number
      overall?: number
    },
    options?: {
      agentConfigId?: string
      reasoning?: string
    }
  ) {
    return this.request('store_confidence_score', {
      executionId,
      phase,
      scores,
      ...options,
    })
  }

  async analyzeConfidenceCalibration(filters: {
    orchestratorId?: string
    phase?: 'thought' | 'plan' | 'execution' | 'summary' | 'completed'
    startDate?: string
    endDate?: string
  }) {
    return this.request('analyze_confidence_calibration', filters)
  }

  // Intelligence Dashboard methods
  async getIntelligenceStats(timeRange?: string) {
    return this.request('get_intelligence_stats', { timeRange })
  }

  async getIntelligenceHealth() {
    return this.request('get_intelligence_health', {})
  }

  async getIntelligenceMetrics(timeRange?: string, type?: string) {
    return this.request('get_intelligence_metrics', { timeRange, type })
  }

  // Semantic Search methods
  async searchSimilarExecutions(
    query: string,
    filters?: {
      orchestratorId?: string
      status?: 'completed' | 'failed' | 'paused'
      minConfidence?: number
      minQuality?: number
      searchType?: 'query' | 'thought' | 'plan' | 'summary' | 'combined'
      limit?: number
    }
  ) {
    const params: any = { query, stream: false }
    if (filters) {
      Object.assign(params, filters)
    }
    return this.request('search_similar_executions', params)
  }

  // Embeddings methods
  async getEmbeddingsStatus() {
    return this.request('get_embeddings_status', {})
  }

  async getEmbeddingsTimeline(timeRange?: string) {
    return this.request('get_embeddings_timeline', { timeRange })
  }

  async triggerBackfill(options?: { orchestratorId?: string }) {
    return this.request('trigger_embeddings_backfill', options || {})
  }

  async getBackfillStatus() {
    return this.request('get_backfill_status', {})
  }

  // Performance baselines
  async createPerformanceBaseline(data: {
    orchestratorId: string
    name: string
    description?: string
    startDate: string
    endDate: string
  }) {
    return this.request('create_performance_baseline', data)
  }

  async comparePerformance(data: {
    orchestratorId: string
    baselineId: string
    startDate?: string
    endDate?: string
  }) {
    return this.request('compare_performance', data)
  }
}

// Singleton instance
export const mcpClientOrchestrator = new MCPClientOrchestrator(MCP_ORCHESTRATOR_API_URL)


import { mcpClientV2 } from '../mcp-client-v2'

// Cost Tracking interfaces
interface CostTrackingTokenUsage {
  input: number
  output: number
  total: number
}

interface CostTracking {
  _id: string
  taskId: string
  planId: string
  agentConfigId: string
  tokenUsage: CostTrackingTokenUsage
  apiCalls: number
  estimatedCost: number
  timestamp: string
  createdAt: string
  updatedAt: string
}

interface CostTrackingListResponse {
  costTrackings: CostTracking[]
  total: number
  limit: number
  skip: number
  hasMore: boolean
}

export class CostTrackingClient {
  /**
   * List cost tracking records with filters and pagination
   */
  async listCostTrackings(filters?: {
    taskId?: string
    planId?: string
    agentConfigId?: string
    startDate?: string
    endDate?: string
    limit?: number
    skip?: number
  }): Promise<CostTrackingListResponse> {
    const result = await mcpClientV2.request('list_cost_trackings', filters || {})
    if (result && typeof result === 'object' && 'costTrackings' in result) {
      return result as CostTrackingListResponse
    }
    throw new Error('Unexpected response format from list_cost_trackings')
  }

  /**
   * Get a cost tracking record by ID or taskId
   * If taskId is provided, returns the most recent cost tracking for that task
   */
  async getCostTracking(idOrTaskId: { id?: string; taskId?: string }): Promise<CostTracking> {
    const params: any = {}
    if (idOrTaskId.id) {
      params.id = idOrTaskId.id
    } else if (idOrTaskId.taskId) {
      params.taskId = idOrTaskId.taskId
    } else {
      throw new Error('Either id or taskId must be provided')
    }
    return mcpClientV2.request('get_cost_tracking', params)
  }
}

export const costTrackingClient = new CostTrackingClient()

export type {
  CostTracking,
  CostTrackingListResponse,
  CostTrackingTokenUsage,
}


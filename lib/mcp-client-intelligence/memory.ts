import { mcpClientV2 } from '../mcp-client-v2'

interface LearnFromTaskParams {
  taskId: string
  planId: string
  status: 'completed' | 'failed'
  metrics: {
    executionTime: number
    stepsCompleted: number
    retries: number
    userInputsRequired: number
  }
  insights?: string[]
}

interface LearnFromTaskResponse {
  success: boolean
  memoryId?: string
  patternsExtracted?: number
  message: string
}

// Memory Pattern interfaces
interface MemoryPatternData {
  query?: string
  goal?: string
  steps: string[]
  context?: string
}

interface MemoryPatternSuccessMetrics {
  successRate: number
  avgExecutionTime: number
  avgSteps: number
  reliability: number
}

interface MemoryPatternEvidence {
  taskId: string
  planId: string
  outcome: 'success' | 'failure'
  timestamp: string
}

interface MemoryPattern {
  _id: string
  patternId: string
  patternType: 'query_pattern' | 'plan_pattern' | 'tool_sequence' | 'error_pattern'
  pattern: MemoryPatternData
  successMetrics: MemoryPatternSuccessMetrics
  usageCount: number
  lastUsed: string
  firstSeen: string
  evidence: MemoryPatternEvidence[]
  confidence: number
  validatedAt: string
  createdAt: string
  updatedAt: string
}

interface MemoryPatternListResponse {
  patterns: MemoryPattern[]
  total: number
  limit: number
  skip: number
  hasMore: boolean
}

export class MemoryClient {
  /**
   * Store learnings from a completed task execution
   */
  async learnFromTask(params: LearnFromTaskParams): Promise<LearnFromTaskResponse> {
    return mcpClientV2.request('learn_from_task', params)
  }

  /**
   * List memory patterns with filters and pagination
   */
  async listMemoryPatterns(filters?: {
    patternType?: 'query_pattern' | 'plan_pattern' | 'tool_sequence' | 'error_pattern'
    context?: string
    limit?: number
    skip?: number
  }): Promise<MemoryPatternListResponse> {
    const result = await mcpClientV2.request('list_memory_patterns', filters || {})
    if (result && typeof result === 'object' && 'patterns' in result) {
      return result as MemoryPatternListResponse
    }
    throw new Error('Unexpected response format from list_memory_patterns')
  }
}

export const memoryClient = new MemoryClient()

export type {
  LearnFromTaskParams,
  LearnFromTaskResponse,
  MemoryPattern,
  MemoryPatternListResponse,
  MemoryPatternData,
  MemoryPatternSuccessMetrics,
  MemoryPatternEvidence,
}


import { mcpClientV2 } from '../mcp-client-v2'

interface MemoryPattern {
  id: string
  patternType: 'query_pattern' | 'plan_pattern' | 'tool_sequence' | 'error_pattern'
  pattern: string
  description: string
  successRate: number
  usageCount: number
  examples: Array<{
    taskId: string
    context: string
    result: 'success' | 'failure'
  }>
  metadata?: {
    averageDuration?: number
    averageSteps?: number
    commonTools?: string[]
  }
  createdAt: string
  lastUsed: string
}

export class PatternRecognitionClient {
  /**
   * Query stored patterns from memory
   */
  async getMemoryPattern(
    patternType: 'query_pattern' | 'plan_pattern' | 'tool_sequence' | 'error_pattern',
    pattern: string
  ): Promise<MemoryPattern[]> {
    return mcpClientV2.request('get_memory_pattern', {
      patternType,
      pattern,
    })
  }
}

export const patternRecognitionClient = new PatternRecognitionClient()

export type { MemoryPattern }


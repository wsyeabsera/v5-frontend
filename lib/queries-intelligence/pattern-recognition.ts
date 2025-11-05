import { useQuery } from '@tanstack/react-query'
import { patternRecognitionClient } from '../mcp-client-intelligence/pattern-recognition'

export function useGetMemoryPattern(
  patternType: 'query_pattern' | 'plan_pattern' | 'tool_sequence' | 'error_pattern',
  pattern: string
) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'memory-patterns', patternType, pattern],
    queryFn: () => patternRecognitionClient.getMemoryPattern(patternType, pattern),
    enabled: !!pattern && pattern.length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}


import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  benchmarksClient,
  CreateBenchmarkTestParams,
} from '../mcp-client-intelligence/benchmarks'

export function useCreateBenchmarkTest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: CreateBenchmarkTestParams) =>
      benchmarksClient.createBenchmarkTest(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'benchmarks'] })
    },
  })
}

export function useRunBenchmarkTest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { testId: string; agentConfigId: string }) =>
      benchmarksClient.runBenchmarkTest(params.testId, params.agentConfigId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'benchmarks'] })
      queryClient.invalidateQueries({
        queryKey: ['v2', 'intelligence', 'benchmark-results', variables.testId],
      })
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'benchmarks', 'runs'] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'benchmarks', 'regressions'] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'performance-metrics'] })
    },
  })
}

export function useRunBenchmarkSuite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { suiteId: string; agentConfigId: string; parallel?: boolean }) =>
      benchmarksClient.runBenchmarkSuite(params.suiteId, params.agentConfigId, params.parallel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'benchmarks'] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'benchmark-results'] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'benchmarks', 'runs'] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'benchmarks', 'regressions'] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'benchmarks', 'suites'] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'performance-metrics'] })
    },
  })
}

export function useDetectRegressions(testId: string, threshold?: number) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'regressions', testId, threshold],
    queryFn: () => benchmarksClient.detectRegressions(testId, threshold),
    enabled: !!testId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useGetPerformanceMetrics(
  options?: {
    metricType?: 'success_rate' | 'duration' | 'cost' | 'all'
    period?: 'hour' | 'day' | 'week' | 'month'
    testId?: string
    agentConfigId?: string
  }
) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'performance-metrics', options],
    queryFn: () => benchmarksClient.getPerformanceMetrics(options),
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

export function useListBenchmarkTests(options?: {
  category?: string
  tags?: string[]
  priority?: 'critical' | 'high' | 'medium' | 'low'
  limit?: number
  skip?: number
}) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'benchmarks', 'list', options],
    queryFn: () => benchmarksClient.listBenchmarkTests(options),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useBenchmarkTest(testId: string) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'benchmarks', 'test', testId],
    queryFn: () => benchmarksClient.getBenchmarkTest(testId),
    enabled: !!testId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useBenchmarkRuns(filters?: {
  testId?: string
  status?: 'passed' | 'failed' | 'timeout' | 'error'
  agentConfigId?: string
  startDate?: string
  endDate?: string
  limit?: number
  skip?: number
}) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'benchmarks', 'runs', filters],
    queryFn: () => benchmarksClient.listBenchmarkRuns(filters),
    staleTime: 1000 * 60 * 5,
  })
}

export function useBenchmarkRun(runId: string) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'benchmarks', 'run', runId],
    queryFn: () => benchmarksClient.getBenchmarkRun(runId),
    enabled: !!runId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useBenchmarkSuites(filters?: {
  startDate?: string
  endDate?: string
  limit?: number
  skip?: number
}) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'benchmarks', 'suites', filters],
    queryFn: () => benchmarksClient.listBenchmarkSuites(filters),
    staleTime: 1000 * 60 * 5,
  })
}

export function useBenchmarkSuite(suiteId: string) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'benchmarks', 'suite', suiteId],
    queryFn: () => benchmarksClient.getBenchmarkSuite(suiteId),
    enabled: !!suiteId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useRegressions(filters?: {
  testId?: string
  severity?: 'critical' | 'high' | 'medium' | 'low'
  resolved?: boolean
  startDate?: string
  endDate?: string
  limit?: number
  skip?: number
}) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'benchmarks', 'regressions', filters],
    queryFn: () => benchmarksClient.listRegressions(filters),
    staleTime: 1000 * 60 * 5,
  })
}

export function useRegression(regressionId: string) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'benchmarks', 'regression', regressionId],
    queryFn: () => benchmarksClient.getRegression(regressionId),
    enabled: !!regressionId,
    staleTime: 1000 * 60 * 5,
  })
}


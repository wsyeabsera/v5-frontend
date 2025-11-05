import { mcpClientV2 } from '../mcp-client-v2'

interface CreateBenchmarkTestParams {
  name: string
  description: string
  query: string
  expectedOutcome: {
    type: 'success' | 'failure' | 'partial'
    maxDuration?: number
    minSteps?: number
    maxSteps?: number
  }
  category: string
  priority: 'low' | 'medium' | 'high'
}

// Benchmark Test interfaces
interface BenchmarkTestExpectedOutcome {
  type: 'success' | 'failure' | 'specific_output'
  expectedOutput?: any
  expectedSteps?: string[]
  maxDuration?: number
}

interface BenchmarkTestData {
  query: string
  expectedOutcome: BenchmarkTestExpectedOutcome
  context?: Record<string, any>
}

interface BenchmarkTest {
  _id: string
  testId: string
  name: string
  description: string
  test: BenchmarkTestData
  category: string
  tags: string[]
  priority: 'critical' | 'high' | 'medium' | 'low'
  createdAt: string
  updatedAt: string
}

interface BenchmarkTestListResponse {
  tests: BenchmarkTest[]
  total: number
  limit: number
  skip: number
  hasMore: boolean
}

// Benchmark Run interfaces
interface BenchmarkRunExecution {
  taskId: string
  planId: string
  thoughtId?: string
  agentConfigId: string
  startedAt: string
  completedAt?: string
  duration: number
}

interface BenchmarkRunResult {
  status: 'passed' | 'failed' | 'timeout' | 'error'
  actualOutput?: any
  actualSteps: string[]
  error?: string
  matchesExpected: boolean
}

interface BenchmarkRunMetrics {
  executionTime: number
  stepsCompleted: number
  stepsExpected: number
  retries: number
  userInputsRequired: number
  tokenUsage?: number
  apiCalls?: number
}

interface BenchmarkRunBaselineComparison {
  baselineRunId?: string
  performanceDelta?: number
  statusChange?: 'improved' | 'degraded' | 'same'
}

interface BenchmarkRun {
  _id: string
  runId: string
  testId: string
  testName: string
  execution: BenchmarkRunExecution
  result: BenchmarkRunResult
  metrics: BenchmarkRunMetrics
  baselineComparison?: BenchmarkRunBaselineComparison
  createdAt: string
}

interface BenchmarkRunListResponse {
  runs: BenchmarkRun[]
  total: number
  limit: number
  skip: number
  hasMore: boolean
}

// Benchmark Suite interfaces
interface BenchmarkSuiteFilters {
  categories?: string[]
  tags?: string[]
  priority?: string[]
}

interface BenchmarkSuiteConfig {
  agentConfigId: string
  timeout: number
  parallel: boolean
  maxConcurrent: number
}

interface BenchmarkSuiteResults {
  totalTests: number
  passed: number
  failed: number
  timeout: number
  error: number
  avgDuration: number
  successRate: number
}

interface BenchmarkSuite {
  _id: string
  suiteId: string
  name: string
  description: string
  testIds: string[]
  filters: BenchmarkSuiteFilters
  config: BenchmarkSuiteConfig
  results: BenchmarkSuiteResults
  createdAt: string
  completedAt?: string
  createdBy?: string
}

interface BenchmarkSuiteListResponse {
  suites: BenchmarkSuite[]
  total: number
  limit: number
  skip: number
  hasMore: boolean
}

// Regression interfaces
interface RegressionBaseline {
  runId: string
  status: 'passed' | 'failed'
  duration: number
  metrics: Record<string, any>
}

interface RegressionCurrent {
  runId: string
  status: 'passed' | 'failed'
  duration: number
  metrics: Record<string, any>
}

interface RegressionDelta {
  statusChanged: boolean
  durationDelta: number
  metricDeltas: Record<string, number>
}

interface Regression {
  _id: string
  regressionId: string
  testId: string
  testName: string
  detectedAt: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  baseline: RegressionBaseline
  current: RegressionCurrent
  delta: RegressionDelta
  resolved: boolean
  resolvedAt?: string
  resolution?: string
  resolvedBy?: string
  createdAt: string
  updatedAt: string
}

interface RegressionListResponse {
  regressions: Regression[]
  total: number
  limit: number
  skip: number
  hasMore: boolean
}

// Legacy interfaces (for backward compatibility)
interface BenchmarkTestResult {
  testId: string
  testName: string
  agentConfigId: string
  status: 'success' | 'failure' | 'partial'
  duration: number
  stepsCompleted: number
  passed: boolean
  metrics: {
    executionTime: number
    tokenUsage?: number
    cost?: number
  }
  errors?: string[]
  timestamp: string
}

interface BenchmarkSuiteResult {
  suiteId: string
  agentConfigId: string
  totalTests: number
  passedTests: number
  failedTests: number
  results: BenchmarkTestResult[]
  totalDuration: number
  averageDuration: number
  timestamp: string
}

interface PerformanceMetric {
  timestamp: string
  metricType: string
  value: number
  testId?: string
  agentConfigId?: string
}

export class BenchmarksClient {
  /**
   * Create a new benchmark test
   */
  async createBenchmarkTest(params: CreateBenchmarkTestParams): Promise<BenchmarkTest> {
    return mcpClientV2.request('create_benchmark_test', params)
  }

  /**
   * Run a single benchmark test
   */
  async runBenchmarkTest(testId: string, agentConfigId: string): Promise<BenchmarkTestResult> {
    const result = await mcpClientV2.request('run_benchmark_test', {
      testId,
      agentConfigId,
    })
    
    // Log the response for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[BenchmarksClient] run_benchmark_test response:', result)
      console.log('[BenchmarksClient] Response type:', typeof result)
      console.log('[BenchmarksClient] Response keys:', result ? Object.keys(result) : 'null/undefined')
    }
    
    return result
  }

  /**
   * Run a suite of benchmark tests
   */
  async runBenchmarkSuite(
    suiteId: string,
    agentConfigId: string,
    parallel?: boolean
  ): Promise<BenchmarkSuiteResult> {
    return mcpClientV2.request('run_benchmark_suite', {
      suiteId,
      agentConfigId,
      parallel,
    })
  }

  /**
   * Detect performance regressions
   */
  async detectRegressions(testId: string, threshold?: number): Promise<Regression[]> {
    return mcpClientV2.request('detect_regressions', {
      testId,
      threshold,
    })
  }

  /**
   * Get performance metrics over time
   */
  async getPerformanceMetrics(
    options?: {
      metricType?: 'success_rate' | 'duration' | 'cost' | 'all'
      period?: 'hour' | 'day' | 'week' | 'month'
      testId?: string
      agentConfigId?: string
    }
  ): Promise<PerformanceMetric[]> {
    return mcpClientV2.request('get_performance_metrics', options || {})
  }

  /**
   * List all benchmark tests with pagination
   */
  async listBenchmarkTests(options?: {
    category?: string
    tags?: string[]
    priority?: 'critical' | 'high' | 'medium' | 'low'
    limit?: number
    skip?: number
  }): Promise<BenchmarkTestListResponse> {
      const result = await mcpClientV2.request('list_benchmark_tests', options || {})
    // Handle paginated response format
    if (result && typeof result === 'object' && 'tests' in result) {
      return result as BenchmarkTestListResponse
    }
    // Fallback for array response (backward compatibility)
      if (Array.isArray(result)) {
      return {
        tests: result,
        total: result.length,
        limit: options?.limit || 50,
        skip: options?.skip || 0,
        hasMore: false,
      }
    }
    throw new Error('Unexpected response format from list_benchmark_tests')
  }

  /**
   * Get a benchmark test by testId
   */
  async getBenchmarkTest(testId: string): Promise<BenchmarkTest> {
    return mcpClientV2.request('get_benchmark_test', { testId })
  }

  /**
   * List benchmark runs with filters and pagination
   */
  async listBenchmarkRuns(filters?: {
    testId?: string
    status?: 'passed' | 'failed' | 'timeout' | 'error'
    agentConfigId?: string
    startDate?: string
    endDate?: string
    limit?: number
    skip?: number
  }): Promise<BenchmarkRunListResponse> {
    const result = await mcpClientV2.request('list_benchmark_runs', filters || {})
    if (result && typeof result === 'object' && 'runs' in result) {
      return result as BenchmarkRunListResponse
    }
    // Handle array response (backward compatibility)
    if (Array.isArray(result)) {
      return {
        runs: result,
        total: result.length,
        limit: filters?.limit || 50,
        skip: filters?.skip || 0,
        hasMore: false,
      }
    }
    // Handle empty or unexpected response
    console.warn('Unexpected response format from list_benchmark_runs:', result)
    return {
      runs: [],
      total: 0,
      limit: filters?.limit || 50,
      skip: filters?.skip || 0,
      hasMore: false,
    }
  }

  /**
   * Get a benchmark run by runId
   */
  async getBenchmarkRun(runId: string): Promise<BenchmarkRun> {
    return mcpClientV2.request('get_benchmark_run', { runId })
  }

  /**
   * List benchmark suites with filters and pagination
   */
  async listBenchmarkSuites(filters?: {
    startDate?: string
    endDate?: string
    limit?: number
    skip?: number
  }): Promise<BenchmarkSuiteListResponse> {
    const result = await mcpClientV2.request('list_benchmark_suites', filters || {})
    if (result && typeof result === 'object' && 'suites' in result) {
      return result as BenchmarkSuiteListResponse
    }
    // Handle array response (backward compatibility)
    if (Array.isArray(result)) {
      return {
        suites: result,
        total: result.length,
        limit: filters?.limit || 50,
        skip: filters?.skip || 0,
        hasMore: false,
      }
    }
    // Handle empty or unexpected response
    console.warn('Unexpected response format from list_benchmark_suites:', result)
    return {
      suites: [],
      total: 0,
      limit: filters?.limit || 50,
      skip: filters?.skip || 0,
      hasMore: false,
    }
  }

  /**
   * Get a benchmark suite by suiteId
   */
  async getBenchmarkSuite(suiteId: string): Promise<BenchmarkSuite> {
    return mcpClientV2.request('get_benchmark_suite', { suiteId })
  }

  /**
   * List regressions with filters and pagination
   */
  async listRegressions(filters?: {
    testId?: string
    severity?: 'critical' | 'high' | 'medium' | 'low'
    resolved?: boolean
    startDate?: string
    endDate?: string
    limit?: number
    skip?: number
  }): Promise<RegressionListResponse> {
    const result = await mcpClientV2.request('list_regressions', filters || {})
    if (result && typeof result === 'object' && 'regressions' in result) {
      return result as RegressionListResponse
    }
    // Handle array response (backward compatibility)
    if (Array.isArray(result)) {
      return {
        regressions: result,
        total: result.length,
        limit: filters?.limit || 50,
        skip: filters?.skip || 0,
        hasMore: false,
      }
    }
    // Handle empty or unexpected response
    console.warn('Unexpected response format from list_regressions:', result)
    return {
      regressions: [],
      total: 0,
      limit: filters?.limit || 50,
      skip: filters?.skip || 0,
      hasMore: false,
    }
  }

  /**
   * Get a regression by regressionId
   */
  async getRegression(regressionId: string): Promise<Regression> {
    return mcpClientV2.request('get_regression', { regressionId })
  }
}

export const benchmarksClient = new BenchmarksClient()

export type {
  CreateBenchmarkTestParams,
  BenchmarkTest,
  BenchmarkTestListResponse,
  BenchmarkTestExpectedOutcome,
  BenchmarkTestData,
  BenchmarkRun,
  BenchmarkRunListResponse,
  BenchmarkRunExecution,
  BenchmarkRunResult,
  BenchmarkRunMetrics,
  BenchmarkRunBaselineComparison,
  BenchmarkSuite,
  BenchmarkSuiteListResponse,
  BenchmarkSuiteFilters,
  BenchmarkSuiteConfig,
  BenchmarkSuiteResults,
  Regression,
  RegressionListResponse,
  RegressionBaseline,
  RegressionCurrent,
  RegressionDelta,
  // Legacy types for backward compatibility
  BenchmarkTestResult,
  BenchmarkSuiteResult,
  PerformanceMetric,
}


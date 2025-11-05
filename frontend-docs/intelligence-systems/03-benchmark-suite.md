# Benchmark Suite Documentation

## Overview

The Benchmark Suite provides comprehensive benchmarking capabilities for performance tracking, test execution, and regression detection. It enables systematic testing of agent performance and ensures consistent behavior over time.

### Purpose

- Define benchmark tests for agent operations
- Execute tests and track performance metrics
- Detect performance regressions
- Monitor system performance over time
- Ensure quality standards are maintained

### Key Features

- Test definition and management
- Test execution with metrics
- Suite execution (multiple tests)
- Regression detection
- Performance metrics tracking
- Historical performance data

### Use Cases

- Create standard test suites for common operations
- Run benchmarks before/after system changes
- Detect performance regressions automatically
- Track performance trends over time
- Ensure quality standards are met
- Compare performance across agent configurations

## MCP Tools Reference

### `create_benchmark_test`

Create a new benchmark test definition.

**Tool Name:** `create_benchmark_test`

**Request Parameters:**

```typescript
interface CreateBenchmarkTestParams {
  name: string                      // Test name
  description: string                // Test description
  query: string                      // Query to test
  expectedOutcome: {
    type: 'success' | 'failure' | 'partial'
    maxDuration?: number             // Maximum duration in ms
    minSteps?: number                // Minimum steps required
    maxSteps?: number                // Maximum steps allowed
  }
  category: string                   // Test category (e.g., 'crud', 'complex', 'error')
  priority: 'low' | 'medium' | 'high' // Test priority
}
```

**Response Format:**

```typescript
interface BenchmarkTest {
  id: string
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
  priority: string
  createdAt: string
  updatedAt: string
}

interface CreateBenchmarkTestResponse extends BenchmarkTest {}
```

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "create_benchmark_test",
    "arguments": {
      "name": "CRUD Operations",
      "description": "Test basic CRUD operations",
      "query": "Create, read, update, and delete a facility",
      "expectedOutcome": {
        "type": "success",
        "maxDuration": 5000
      },
      "category": "crud",
      "priority": "high"
    }
  }
}
```

### `run_benchmark_test`

Run a single benchmark test.

**Tool Name:** `run_benchmark_test`

**Request Parameters:**

```typescript
interface RunBenchmarkTestParams {
  testId: string                     // Benchmark test ID
  agentConfigId: string              // Agent configuration to use
}
```

**Response Format:**

```typescript
interface BenchmarkTestResult {
  testId: string
  testName: string
  agentConfigId: string
  status: 'success' | 'failure' | 'partial'
  duration: number                   // Execution duration in ms
  stepsCompleted: number
  passed: boolean                    // Whether test passed
  metrics: {
    executionTime: number
    tokenUsage?: number
    cost?: number
  }
  errors?: string[]
  timestamp: string
}

interface RunBenchmarkTestResponse extends BenchmarkTestResult {}
```

### `run_benchmark_suite`

Run a suite of benchmark tests.

**Tool Name:** `run_benchmark_suite`

**Request Parameters:**

```typescript
interface RunBenchmarkSuiteParams {
  suiteId: string                    // Suite ID (or category name)
  agentConfigId: string              // Agent configuration to use
  parallel?: boolean                 // Run tests in parallel (default: false)
}
```

**Response Format:**

```typescript
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

interface RunBenchmarkSuiteResponse extends BenchmarkSuiteResult {}
```

### `detect_regressions`

Detect performance regressions for a test.

**Tool Name:** `detect_regressions`

**Request Parameters:**

```typescript
interface DetectRegressionsParams {
  testId: string                     // Test ID to check
  threshold?: number                 // Regression threshold (default: 0.2 = 20% worse)
}
```

**Response Format:**

```typescript
interface Regression {
  testId: string
  testName: string
  metric: 'duration' | 'steps' | 'success_rate'
  currentValue: number
  previousValue: number
  regressionPercentage: number      // Percentage worse
  severity: 'low' | 'medium' | 'high'
  detectedAt: string
}

interface DetectRegressionsResponse extends Array<Regression> {}
```

### `get_performance_metrics`

Get performance metrics over time.

**Tool Name:** `get_performance_metrics`

**Request Parameters:**

```typescript
interface GetPerformanceMetricsParams {
  metricType?: 'success_rate' | 'duration' | 'cost' | 'all'
  period?: 'hour' | 'day' | 'week' | 'month'
  testId?: string                    // Optional: filter by test
  agentConfigId?: string             // Optional: filter by agent config
}
```

**Response Format:**

```typescript
interface PerformanceMetric {
  timestamp: string
  metricType: string
  value: number
  testId?: string
  agentConfigId?: string
}

interface GetPerformanceMetricsResponse extends Array<PerformanceMetric> {}
```

## Query Hooks Specification

### File: `lib/queries-intelligence/benchmarks.ts`

### `useCreateBenchmarkTest`

Mutation hook to create a benchmark test.

```typescript
export function useCreateBenchmarkTest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: CreateBenchmarkTestParams) =>
      mcpClientIntelligence.createBenchmarkTest(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'benchmarks'] })
    },
  })
}
```

### `useRunBenchmarkTest`

Mutation hook to run a benchmark test.

```typescript
export function useRunBenchmarkTest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { testId: string; agentConfigId: string }) =>
      mcpClientIntelligence.runBenchmarkTest(params.testId, params.agentConfigId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'benchmarks'] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'benchmark-results', variables.testId] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'performance-metrics'] })
    },
  })
}
```

### `useRunBenchmarkSuite`

Mutation hook to run a benchmark suite.

```typescript
export function useRunBenchmarkSuite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { suiteId: string; agentConfigId: string; parallel?: boolean }) =>
      mcpClientIntelligence.runBenchmarkSuite(params.suiteId, params.agentConfigId, params.parallel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'benchmarks'] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'benchmark-results'] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'performance-metrics'] })
    },
  })
}
```

### `useDetectRegressions`

Query hook to detect regressions.

```typescript
export function useDetectRegressions(testId: string, threshold?: number) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'regressions', testId, threshold],
    queryFn: () => mcpClientIntelligence.detectRegressions(testId, threshold),
    enabled: !!testId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
```

### `useGetPerformanceMetrics`

Query hook to get performance metrics.

```typescript
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
    queryFn: () => mcpClientIntelligence.getPerformanceMetrics(options),
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}
```

## MCP Client Methods Specification

### File: `lib/mcp-client-intelligence/benchmarks.ts`

```typescript
import { mcpClientV2 } from '../mcp-client-v2'

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
    return mcpClientV2.request('run_benchmark_test', {
      testId,
      agentConfigId,
    })
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
}

export const benchmarksClient = new BenchmarksClient()
```

## UI Component Specifications

### File: `components/v2/benchmarks/BenchmarkPanel.tsx`

**Purpose:** Main panel for benchmark management

**Props:**

```typescript
interface BenchmarkPanelProps {
  // No props needed
}
```

**Features:**

- Tabs: Tests, Run Tests, Results, Metrics, Regressions
- Test creation form
- Test list with status
- Run test controls
- Results visualization
- Metrics charts
- Regression alerts

### File: `components/v2/benchmarks/BenchmarkTestCard.tsx`

**Purpose:** Display benchmark test information

**Props:**

```typescript
interface BenchmarkTestCardProps {
  test: BenchmarkTest
  onRun?: (testId: string) => void
  onView?: (testId: string) => void
  onDelete?: (testId: string) => void
}
```

**Display:**

- Test name and description
- Category badge
- Priority badge
- Expected outcome
- Last run status
- Quick run button

### File: `components/v2/benchmarks/BenchmarkTestDialog.tsx`

**Purpose:** Create/edit benchmark test

**Props:**

```typescript
interface BenchmarkTestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  test?: BenchmarkTest              // If provided, edit mode
}
```

**Features:**

- Form fields for all test properties
- Expected outcome configuration
- Category selection
- Priority selection
- Save/Cancel buttons

### File: `components/v2/benchmarks/BenchmarkResults.tsx`

**Purpose:** Display benchmark test results

**Props:**

```typescript
interface BenchmarkResultsProps {
  testId?: string                    // Filter by test
  agentConfigId?: string             // Filter by agent config
}
```

**Display:**

- Results table/list
- Status badges
- Duration metrics
- Pass/fail indicators
- Link to detailed results
- Charts for trends

### File: `components/v2/benchmarks/RegressionAlerts.tsx`

**Purpose:** Display regression alerts

**Props:**

```typescript
interface RegressionAlertsProps {
  testId?: string                    // Filter by test
  severity?: 'low' | 'medium' | 'high' // Filter by severity
}
```

**Display:**

- Alert cards for each regression
- Severity indicators
- Regression percentage
- Metric affected
- Detection timestamp
- Link to test details

## Page Structure

### File: `app/v2/benchmarks/page.tsx`

```typescript
'use client'

import { BenchmarkPanel } from '@/components/v2/benchmarks/BenchmarkPanel'
import { BarChart3 } from 'lucide-react'

export default function BenchmarksPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Benchmark Suite</h1>
        </div>
        <p className="text-muted-foreground">
          Create, run, and monitor benchmark tests. Track performance and detect regressions.
        </p>
      </div>

      <BenchmarkPanel />
    </div>
  )
}
```

**Route:** `/v2/benchmarks`

**Navigation Icon:** `BarChart3` from `lucide-react`

## Implementation Checklist

### Phase 1: Setup

- [ ] Create `lib/queries-intelligence/benchmarks.ts`
- [ ] Create `lib/mcp-client-intelligence/benchmarks.ts`
- [ ] Export benchmarks client from index

### Phase 2: Components

- [ ] Create `components/v2/benchmarks/BenchmarkPanel.tsx`
- [ ] Create `components/v2/benchmarks/BenchmarkTestCard.tsx`
- [ ] Create `components/v2/benchmarks/BenchmarkTestDialog.tsx`
- [ ] Create `components/v2/benchmarks/BenchmarkResults.tsx`
- [ ] Create `components/v2/benchmarks/RegressionAlerts.tsx`

### Phase 3: Page

- [ ] Create `app/v2/benchmarks/page.tsx`
- [ ] Add route to navigation sidebar
- [ ] Test all operations

### Phase 4: Integration

- [ ] Integrate with agent config selector
- [ ] Add charts for metrics visualization
- [ ] Add regression notifications
- [ ] Test with real benchmark data

### Phase 5: Testing

- [ ] Test test creation
- [ ] Test test execution
- [ ] Test suite execution
- [ ] Test regression detection
- [ ] Test metrics retrieval
- [ ] Test error handling
- [ ] Test loading states

## Dependencies

- `@tanstack/react-query` - For query hooks
- `lib/mcp-client-v2.ts` - Base MCP client
- `components/ui/*` - shadcn/ui components
- `recharts` or similar - For charts (optional)
- `lucide-react` - Icons

## Related Systems

- **Smart Features** - Uses benchmarks for cost optimization
- **History Query** - Uses benchmarks for performance tracking
- **Memory System** - Stores benchmark learnings


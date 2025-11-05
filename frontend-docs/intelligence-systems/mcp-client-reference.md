# Intelligence Systems MCP Client Reference

Complete reference for all MCP client methods for the intelligence systems.

## File Structure

All MCP client methods are organized in `lib/mcp-client-intelligence/`:

- `memory.ts` - Memory System client
- `history-query.ts` - History Query System client
- `benchmarks.ts` - Benchmark Suite client
- `smart-features.ts` - Smart Features client
- `pattern-recognition.ts` - Pattern Recognition client
- `index.ts` - Exports all clients

## Base Client

All intelligence clients use the base `mcpClientV2` from `lib/mcp-client-v2.ts`:

```typescript
import { mcpClientV2 } from '../mcp-client-v2'
```

The `mcpClientV2.request()` method handles JSON-RPC 2.0 communication with the MCP server.

## Memory System Client

### File: `lib/mcp-client-intelligence/memory.ts`

```typescript
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

export class MemoryClient {
  /**
   * Store learnings from a completed task execution
   */
  async learnFromTask(params: LearnFromTaskParams): Promise<LearnFromTaskResponse> {
    return mcpClientV2.request('learn_from_task', params)
  }
}

export const memoryClient = new MemoryClient()
```

**Method:** `learnFromTask(params)`

**MCP Tool:** `learn_from_task`

**Parameters:**
- `taskId` (string): ID of the completed task
- `planId` (string): ID of the plan that was executed
- `status` ('completed' | 'failed'): Task completion status
- `metrics` (object): Execution metrics
- `insights` (string[], optional): Key learnings

**Returns:** Response with success status and memory ID

**Error Handling:** Throws Error on network or API errors

## History Query System Client

### File: `lib/mcp-client-intelligence/history-query.ts`

```typescript
import { mcpClientV2 } from '../mcp-client-v2'

interface SimilarTask {
  id: string
  query: string
  goal: string
  similarityScore: number
  status: string
  planId?: string
  executionTime?: number
  stepsCompleted?: number
  createdAt: string
}

interface SuccessfulPlan {
  id: string
  goal: string
  successRate: number
  usageCount: number
  averageExecutionTime: number
  steps: Array<{
    stepId: string
    toolName: string
    description: string
  }>
  createdAt: string
  lastUsed: string
}

interface ToolPerformance {
  toolName: string
  context?: string
  successRate: number
  averageDuration: number
  totalCalls: number
  successfulCalls: number
  failedCalls: number
  commonErrors?: Array<{
    error: string
    count: number
  }>
  recommendations?: string[]
}

interface AgentInsight {
  id: string
  agentType: string
  insightType: string
  insight: string
  confidence: number
  examples?: Array<{
    taskId: string
    context: string
  }>
  createdAt: string
}

export class HistoryQueryClient {
  /**
   * Find tasks similar to a given query
   */
  async getSimilarTasks(
    query: string,
    options?: {
      limit?: number
      minSimilarity?: number
      status?: 'completed' | 'failed'
    }
  ): Promise<SimilarTask[]> {
    return mcpClientV2.request('get_similar_tasks', {
      query,
      ...options,
    })
  }

  /**
   * Get successful plan patterns for a goal
   */
  async getSuccessfulPlans(
    goal: string,
    options?: {
      limit?: number
      minSuccessRate?: number
    }
  ): Promise<SuccessfulPlan[]> {
    return mcpClientV2.request('get_successful_plans', {
      goal,
      ...options,
    })
  }

  /**
   * Get performance metrics for a tool
   */
  async getToolPerformance(
    toolName: string,
    context?: string
  ): Promise<ToolPerformance> {
    return mcpClientV2.request('get_tool_performance', {
      toolName,
      context,
    })
  }

  /**
   * Get learned insights from an agent
   */
  async getAgentInsights(
    agentType: 'thought' | 'planner' | 'executor',
    options?: {
      insightType?: 'patterns' | 'optimizations' | 'warnings'
      limit?: number
    }
  ): Promise<AgentInsight[]> {
    return mcpClientV2.request('get_agent_insights', {
      agentType,
      ...options,
    })
  }
}

export const historyQueryClient = new HistoryQueryClient()
```

**Methods:**

1. **`getSimilarTasks(query, options?)`**
   - MCP Tool: `get_similar_tasks`
   - Returns: Array of similar tasks

2. **`getSuccessfulPlans(goal, options?)`**
   - MCP Tool: `get_successful_plans`
   - Returns: Array of successful plans

3. **`getToolPerformance(toolName, context?)`**
   - MCP Tool: `get_tool_performance`
   - Returns: Tool performance metrics

4. **`getAgentInsights(agentType, options?)`**
   - MCP Tool: `get_agent_insights`
   - Returns: Array of agent insights

## Benchmark Suite Client

### File: `lib/mcp-client-intelligence/benchmarks.ts`

```typescript
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

interface Regression {
  testId: string
  testName: string
  metric: 'duration' | 'steps' | 'success_rate'
  currentValue: number
  previousValue: number
  regressionPercentage: number
  severity: 'low' | 'medium' | 'high'
  detectedAt: string
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

**Methods:**

1. **`createBenchmarkTest(params)`**
   - MCP Tool: `create_benchmark_test`
   - Returns: Created benchmark test

2. **`runBenchmarkTest(testId, agentConfigId)`**
   - MCP Tool: `run_benchmark_test`
   - Returns: Benchmark test result

3. **`runBenchmarkSuite(suiteId, agentConfigId, parallel?)`**
   - MCP Tool: `run_benchmark_suite`
   - Returns: Benchmark suite results

4. **`detectRegressions(testId, threshold?)`**
   - MCP Tool: `detect_regressions`
   - Returns: Array of regressions

5. **`getPerformanceMetrics(options?)`**
   - MCP Tool: `get_performance_metrics`
   - Returns: Array of performance metrics

## Smart Features Client

### File: `lib/mcp-client-intelligence/smart-features.ts`

```typescript
import { mcpClientV2 } from '../mcp-client-v2'

interface PlanQualityPrediction {
  planId: string
  successProbability: number
  qualityScore: number
  estimatedDuration: number
  estimatedCost?: number
  confidence: number
  risks: Array<{
    risk: string
    severity: 'low' | 'medium' | 'high'
  }>
  recommendations?: string[]
}

interface ToolRecommendation {
  toolName: string
  description: string
  confidence: number
  reason: string
  successRate?: number
  averageDuration?: number
}

interface RefinedPlan {
  originalPlanId: string
  refinedPlanId: string
  changes: Array<{
    stepId: string
    change: string
    reason: string
  }>
  confidence: number
  predictedImprovement: {
    successProbability: number
    estimatedDuration: number
  }
}

interface CostTracking {
  taskId: string
  planId: string
  agentConfigId: string
  totalTokens: number
  promptTokens: number
  completionTokens: number
  cost: number
  costBreakdown: Array<{
    stepId: string
    toolName?: string
    tokens: number
    cost: number
  }>
  timestamp: string
}

interface CostOptimization {
  originalPlanId: string
  optimizedPlanId: string
  estimatedSavings: number
  savingsPercentage: number
  changes: Array<{
    stepId: string
    change: string
    estimatedSavings: number
  }>
  qualityImpact: {
    predictedQuality: number
    qualityChange: number
  }
}

export class SmartFeaturesClient {
  /**
   * Predict plan quality before execution
   */
  async predictPlanQuality(planId: string): Promise<PlanQualityPrediction> {
    return mcpClientV2.request('predict_plan_quality', { planId })
  }

  /**
   * Get tool recommendations for an action
   */
  async getToolRecommendations(
    requiredAction: string,
    context?: string
  ): Promise<ToolRecommendation[]> {
    return mcpClientV2.request('get_tool_recommendations', {
      requiredAction,
      context,
    })
  }

  /**
   * Automatically refine a failed plan
   */
  async refinePlan(planId: string, failureReason: string): Promise<RefinedPlan> {
    return mcpClientV2.request('refine_plan', {
      planId,
      failureReason,
    })
  }

  /**
   * Track costs for a task
   */
  async trackCost(taskId: string): Promise<CostTracking> {
    return mcpClientV2.request('track_cost', { taskId })
  }

  /**
   * Optimize plan costs
   */
  async optimizeCost(planId: string): Promise<CostOptimization> {
    return mcpClientV2.request('optimize_cost', { planId })
  }
}

export const smartFeaturesClient = new SmartFeaturesClient()
```

**Methods:**

1. **`predictPlanQuality(planId)`**
   - MCP Tool: `predict_plan_quality`
   - Returns: Plan quality prediction

2. **`getToolRecommendations(requiredAction, context?)`**
   - MCP Tool: `get_tool_recommendations`
   - Returns: Array of tool recommendations

3. **`refinePlan(planId, failureReason)`**
   - MCP Tool: `refine_plan`
   - Returns: Refined plan with changes

4. **`trackCost(taskId)`**
   - MCP Tool: `track_cost`
   - Returns: Cost tracking information

5. **`optimizeCost(planId)`**
   - MCP Tool: `optimize_cost`
   - Returns: Cost optimization with savings

## Pattern Recognition Client

### File: `lib/mcp-client-intelligence/pattern-recognition.ts`

```typescript
import { mcpClientV2 } from '../mcp-client-v2'

interface MemoryPattern {
  id: string
  patternType: 'query' | 'plan' | 'tool' | 'error'
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
    patternType: 'query' | 'plan' | 'tool' | 'error',
    pattern: string
  ): Promise<MemoryPattern[]> {
    return mcpClientV2.request('get_memory_pattern', {
      patternType,
      pattern,
    })
  }
}

export const patternRecognitionClient = new PatternRecognitionClient()
```

**Method:** `getMemoryPattern(patternType, pattern)`

**MCP Tool:** `get_memory_pattern`

**Parameters:**
- `patternType` ('query' | 'plan' | 'tool' | 'error'): Type of pattern
- `pattern` (string): Pattern to search for

**Returns:** Array of matching memory patterns

## Central Export

### File: `lib/mcp-client-intelligence/index.ts`

```typescript
export { memoryClient, MemoryClient } from './memory'
export { historyQueryClient, HistoryQueryClient } from './history-query'
export { benchmarksClient, BenchmarksClient } from './benchmarks'
export { smartFeaturesClient, SmartFeaturesClient } from './smart-features'
export { patternRecognitionClient, PatternRecognitionClient } from './pattern-recognition'

// Convenience export for all clients
export const mcpClientIntelligence = {
  memory: memoryClient,
  historyQuery: historyQueryClient,
  benchmarks: benchmarksClient,
  smartFeatures: smartFeaturesClient,
  patternRecognition: patternRecognitionClient,
}
```

**Usage:**

```typescript
import { mcpClientIntelligence } from '@/lib/mcp-client-intelligence'

// Use individual clients
await mcpClientIntelligence.memory.learnFromTask(params)
await mcpClientIntelligence.historyQuery.getSimilarTasks(query)
await mcpClientIntelligence.benchmarks.createBenchmarkTest(params)
await mcpClientIntelligence.smartFeatures.predictPlanQuality(planId)
await mcpClientIntelligence.patternRecognition.getMemoryPattern(type, pattern)
```

## Error Handling

All client methods follow the same error handling pattern:

1. **Network Errors:** Thrown as Error with network message
2. **API Errors:** Thrown as Error with error message from MCP response
3. **Validation Errors:** Thrown as Error with validation details

**Example Error Handling:**

```typescript
try {
  const result = await mcpClientIntelligence.memory.learnFromTask(params)
  // Handle success
} catch (error) {
  if (error instanceof Error) {
    console.error('Memory learning failed:', error.message)
    // Handle error
  }
}
```

## Type Definitions

All TypeScript interfaces are defined in each client file. For shared types, consider creating a `types.ts` file:

```typescript
// lib/mcp-client-intelligence/types.ts
export type PatternType = 'query' | 'plan' | 'tool' | 'error'
export type AgentType = 'thought' | 'planner' | 'executor'
export type InsightType = 'patterns' | 'optimizations' | 'warnings'
export type MetricType = 'success_rate' | 'duration' | 'cost' | 'all'
export type Period = 'hour' | 'day' | 'week' | 'month'
```

## Request/Response Format

All methods use JSON-RPC 2.0 format internally (handled by `mcpClientV2.request()`):

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "unique-id",
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": { ... }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "unique-id",
  "result": { ... }
}
```

The `mcpClientV2.request()` method handles the JSON-RPC format conversion automatically.


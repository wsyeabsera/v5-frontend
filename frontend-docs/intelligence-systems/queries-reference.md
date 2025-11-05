# Intelligence Systems Queries Reference

Complete reference for all React Query hooks for the intelligence systems.

## File Structure

All query hooks are organized in `lib/queries-intelligence/`:

- `memory.ts` - Memory System hooks
- `history-query.ts` - History Query System hooks
- `benchmarks.ts` - Benchmark Suite hooks
- `smart-features.ts` - Smart Features hooks
- `pattern-recognition.ts` - Pattern Recognition hooks

## Memory System Hooks

### File: `lib/queries-intelligence/memory.ts`

### `useLearnFromTask`

Mutation hook to store learnings from a completed task.

```typescript
export function useLearnFromTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: {
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
    }) => mcpClientIntelligence.learnFromTask(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'memory'] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'tasks', variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'plans', variables.planId] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'patterns'] })
    },
  })
}
```

**Parameters:**
- `taskId` (string): ID of the completed task
- `planId` (string): ID of the plan that was executed
- `status` ('completed' | 'failed'): Task completion status
- `metrics` (object): Execution metrics
- `insights` (string[], optional): Key learnings from execution

**Invalidates:**
- Memory queries
- Task queries
- Plan queries
- Pattern queries

## History Query System Hooks

### File: `lib/queries-intelligence/history-query.ts`

### `useGetSimilarTasks`

Query hook to find similar tasks using semantic search.

```typescript
export function useGetSimilarTasks(
  query: string,
  options?: {
    limit?: number
    minSimilarity?: number
    status?: 'completed' | 'failed'
  }
) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'similar-tasks', query, options],
    queryFn: () => mcpClientIntelligence.getSimilarTasks(query, options),
    enabled: !!query && query.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
```

**Parameters:**
- `query` (string): Natural language query to match
- `options.limit` (number, optional): Maximum results (default: 10)
- `options.minSimilarity` (number, optional): Minimum similarity score 0-1 (default: 0.7)
- `options.status` ('completed' | 'failed', optional): Filter by status

**Returns:** Array of similar tasks with similarity scores

**Stale Time:** 5 minutes

### `useGetSuccessfulPlans`

Query hook to get successful plan patterns.

```typescript
export function useGetSuccessfulPlans(
  goal: string,
  options?: {
    limit?: number
    minSuccessRate?: number
  }
) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'successful-plans', goal, options],
    queryFn: () => mcpClientIntelligence.getSuccessfulPlans(goal, options),
    enabled: !!goal && goal.length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}
```

**Parameters:**
- `goal` (string): Goal to match plans against
- `options.limit` (number, optional): Maximum results (default: 5)
- `options.minSuccessRate` (number, optional): Minimum success rate 0-1 (default: 0.8)

**Returns:** Array of successful plans with success rates

**Stale Time:** 10 minutes

### `useGetToolPerformance`

Query hook to get tool performance metrics.

```typescript
export function useGetToolPerformance(
  toolName: string,
  context?: string
) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'tool-performance', toolName, context],
    queryFn: () => mcpClientIntelligence.getToolPerformance(toolName, context),
    enabled: !!toolName,
    staleTime: 1000 * 60 * 15, // 15 minutes
  })
}
```

**Parameters:**
- `toolName` (string): Name of the tool
- `context` (string, optional): Context filter (e.g., "facility_management")

**Returns:** Tool performance metrics

**Stale Time:** 15 minutes

### `useGetAgentInsights`

Query hook to get agent insights.

```typescript
export function useGetAgentInsights(
  agentType: 'thought' | 'planner' | 'executor',
  options?: {
    insightType?: 'patterns' | 'optimizations' | 'warnings'
    limit?: number
  }
) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'agent-insights', agentType, options],
    queryFn: () => mcpClientIntelligence.getAgentInsights(agentType, options),
    enabled: !!agentType,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}
```

**Parameters:**
- `agentType` ('thought' | 'planner' | 'executor'): Agent type
- `options.insightType` ('patterns' | 'optimizations' | 'warnings', optional): Filter by insight type
- `options.limit` (number, optional): Maximum results (default: 10)

**Returns:** Array of agent insights

**Stale Time:** 10 minutes

## Benchmark Suite Hooks

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

**Parameters:**
- `name` (string): Test name
- `description` (string): Test description
- `query` (string): Query to test
- `expectedOutcome` (object): Expected outcome configuration
- `category` (string): Test category
- `priority` ('low' | 'medium' | 'high'): Test priority

**Invalidates:** Benchmark queries

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

**Parameters:**
- `testId` (string): Benchmark test ID
- `agentConfigId` (string): Agent configuration to use

**Invalidates:** Benchmark queries, results, and metrics

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

**Parameters:**
- `suiteId` (string): Suite ID or category name
- `agentConfigId` (string): Agent configuration to use
- `parallel` (boolean, optional): Run tests in parallel (default: false)

**Invalidates:** Benchmark queries, results, and metrics

### `useDetectRegressions`

Query hook to detect performance regressions.

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

**Parameters:**
- `testId` (string): Test ID to check
- `threshold` (number, optional): Regression threshold (default: 0.2 = 20% worse)

**Returns:** Array of regression detections

**Stale Time:** 5 minutes

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

**Parameters:**
- `options.metricType` ('success_rate' | 'duration' | 'cost' | 'all', optional): Metric type
- `options.period` ('hour' | 'day' | 'week' | 'month', optional): Time period
- `options.testId` (string, optional): Filter by test
- `options.agentConfigId` (string, optional): Filter by agent config

**Returns:** Array of performance metrics

**Stale Time:** 10 minutes

## Smart Features Hooks

### File: `lib/queries-intelligence/smart-features.ts`

### `usePredictPlanQuality`

Query hook to predict plan quality.

```typescript
export function usePredictPlanQuality(planId: string) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'plan-quality', planId],
    queryFn: () => mcpClientIntelligence.predictPlanQuality(planId),
    enabled: !!planId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
```

**Parameters:**
- `planId` (string): Plan ID to predict

**Returns:** Plan quality prediction with success probability and quality score

**Stale Time:** 5 minutes

### `useGetToolRecommendations`

Query hook to get tool recommendations.

```typescript
export function useGetToolRecommendations(
  requiredAction: string,
  context?: string
) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'tool-recommendations', requiredAction, context],
    queryFn: () => mcpClientIntelligence.getToolRecommendations(requiredAction, context),
    enabled: !!requiredAction && requiredAction.length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}
```

**Parameters:**
- `requiredAction` (string): Action to perform (natural language)
- `context` (string, optional): Optional context filter

**Returns:** Array of tool recommendations with confidence scores

**Stale Time:** 10 minutes

### `useRefinePlan`

Mutation hook to refine a plan.

```typescript
export function useRefinePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { planId: string; failureReason: string }) =>
      mcpClientIntelligence.refinePlan(params.planId, params.failureReason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'plans'] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'plans', variables.planId] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'plan-quality'] })
    },
  })
}
```

**Parameters:**
- `planId` (string): Plan ID to refine
- `failureReason` (string): Why the plan failed

**Returns:** Refined plan with changes and improvements

**Invalidates:** Plan queries and plan quality queries

### `useTrackCost`

Query hook to track costs.

```typescript
export function useTrackCost(taskId: string) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'cost-tracking', taskId],
    queryFn: () => mcpClientIntelligence.trackCost(taskId),
    enabled: !!taskId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
```

**Parameters:**
- `taskId` (string): Task ID to track

**Returns:** Cost tracking information with token usage and costs

**Stale Time:** 5 minutes

### `useOptimizeCost`

Mutation hook to optimize plan costs.

```typescript
export function useOptimizeCost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (planId: string) => mcpClientIntelligence.optimizeCost(planId),
    onSuccess: (_, planId) => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'plans'] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'plans', planId] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'plan-quality'] })
    },
  })
}
```

**Parameters:**
- `planId` (string): Plan ID to optimize

**Returns:** Cost optimization with estimated savings and changes

**Invalidates:** Plan queries and plan quality queries

## Pattern Recognition Hooks

### File: `lib/queries-intelligence/pattern-recognition.ts`

### `useGetMemoryPattern`

Query hook to get memory patterns.

```typescript
export function useGetMemoryPattern(
  patternType: 'query' | 'plan' | 'tool' | 'error',
  pattern: string
) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'memory-patterns', patternType, pattern],
    queryFn: () => mcpClientIntelligence.getMemoryPattern(patternType, pattern),
    enabled: !!pattern && pattern.length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}
```

**Parameters:**
- `patternType` ('query' | 'plan' | 'tool' | 'error'): Type of pattern to query
- `pattern` (string): Pattern to search for (natural language or pattern string)

**Returns:** Array of memory patterns matching the query

**Stale Time:** 10 minutes

## Query Key Patterns

All intelligence system queries follow this pattern:

```
['v2', 'intelligence', <system>, <identifier>, <options>]
```

Examples:
- `['v2', 'intelligence', 'similar-tasks', query, options]`
- `['v2', 'intelligence', 'benchmarks']`
- `['v2', 'intelligence', 'plan-quality', planId]`

## Stale Time Configuration

- **Frequently changing data:** 5 minutes (similar tasks, plan quality, cost tracking)
- **Moderately changing data:** 10 minutes (successful plans, agent insights, tool recommendations, patterns, metrics)
- **Slowly changing data:** 15 minutes (tool performance)

## Mutation Invalidation Patterns

Mutations typically invalidate:

1. **Related system queries** - The queries for the system being modified
2. **Cross-system queries** - Related queries in other systems (e.g., memory mutations invalidate pattern queries)
3. **Entity queries** - Queries for specific entities (tasks, plans) that were affected

## Usage Examples

### Example: Using Similar Tasks Hook

```typescript
function SimilarTasksView() {
  const [query, setQuery] = useState('create facility')
  const { data: similarTasks, isLoading } = useGetSimilarTasks(query, {
    limit: 10,
    minSimilarity: 0.7,
  })

  if (isLoading) return <Loading />
  
  return (
    <div>
      {similarTasks?.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  )
}
```

### Example: Using Plan Quality Prediction

```typescript
function PlanQualityView({ planId }: { planId: string }) {
  const { data: prediction, isLoading } = usePredictPlanQuality(planId)

  if (isLoading) return <Loading />

  return (
    <div>
      <div>Success Probability: {prediction.successProbability * 100}%</div>
      <div>Quality Score: {prediction.qualityScore}</div>
      <div>Estimated Duration: {prediction.estimatedDuration}ms</div>
    </div>
  )
}
```

### Example: Using Mutation Hook

```typescript
function LearnFromTaskButton({ taskId, planId }: { taskId: string; planId: string }) {
  const learnFromTask = useLearnFromTask()

  const handleClick = () => {
    learnFromTask.mutate({
      taskId,
      planId,
      status: 'completed',
      metrics: {
        executionTime: 5000,
        stepsCompleted: 5,
        retries: 0,
        userInputsRequired: 1,
      },
      insights: ['Tool sequence worked well'],
    })
  }

  return (
    <Button onClick={handleClick} disabled={learnFromTask.isPending}>
      Learn from Task
    </Button>
  )
}
```


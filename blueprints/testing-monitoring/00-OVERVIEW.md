# Testing System Pages - Overview

## Purpose

Build comprehensive management and execution pages for the orchestrator testing system including:
- Test prompt storage and management
- Test suite organization
- Test execution and monitoring
- Test run history and results
- Test comparison and baselines
- Test analytics and trends

## Architecture

```
Frontend (Next.js) → API Routes → Orchestrator MCP Server (port 5001)
```

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **UI:** React + shadcn/ui (Tailwind)
- **State:** TanStack Query for data fetching
- **API Client:** MCPClientOrchestrator (via `/api/mcp-orchestrator`)
- **Charts:** Recharts (for analytics)
- **TypeScript:** Strict mode

## Implementation Phases

### Phase 1: Foundation (Essential)
1. **Test Prompt Management** - Create, view, edit, delete test prompts with user input configuration
2. **Test Suite Management** - Organize test prompts into testable suites

### Phase 2: Core Features (Important)
3. **Test Execution** - Run individual prompts and suites with real-time monitoring
4. **Test Run History** - View test run results, filter, and analyze outcomes

### Phase 3: Advanced Features (Nice to have)
5. **Test Comparison & Baselines** - Compare runs, create baselines, detect regressions
6. **Test Analytics** - Execution trends, success rates, performance metrics

## File Structure

```
frontend/
├── app/v2/orchestrator/testing/
│   ├── test-prompts/
│   │   └── page.tsx
│   ├── test-suites/
│   │   └── page.tsx
│   ├── execution/
│   │   └── page.tsx
│   ├── runs/
│   │   └── page.tsx
│   ├── comparison/
│   │   └── page.tsx
│   └── analytics/
│       └── page.tsx
├── components/v2/orchestrator/testing/
│   ├── test-prompts/
│   │   ├── TestPromptList.tsx
│   │   ├── TestPromptForm.tsx
│   │   ├── TestPromptCard.tsx
│   │   ├── UserInputConfig.tsx
│   │   └── ExpectedOutcomeEditor.tsx
│   ├── test-suites/
│   │   ├── TestSuiteList.tsx
│   │   ├── TestSuiteForm.tsx
│   │   ├── TestSuiteCard.tsx
│   │   ├── TestCaseManager.tsx
│   │   └── TestCaseCard.tsx
│   ├── execution/
│   │   ├── TestExecutionPanel.tsx
│   │   ├── ExecutionMonitor.tsx
│   │   ├── UserInputHandler.tsx
│   │   └── ExecutionProgress.tsx
│   ├── runs/
│   │   ├── TestRunList.tsx
│   │   ├── TestRunCard.tsx
│   │   ├── TestRunDetails.tsx
│   │   ├── TestCaseResult.tsx
│   │   └── MetricsDisplay.tsx
│   ├── comparison/
│   │   ├── ComparisonView.tsx
│   │   ├── BaselineManager.tsx
│   │   ├── RegressionDetector.tsx
│   │   └── ComparisonCharts.tsx
│   └── analytics/
│       ├── AnalyticsDashboard.tsx
│       ├── ExecutionTrends.tsx
│       ├── SuccessRateChart.tsx
│       ├── PerformanceMetrics.tsx
│       └── UserInputStats.tsx
└── lib/
    ├── mcp-client-orchestrator.ts (extend with testing methods)
    └── queries-v2.ts (extend with testing hooks)
```

## API Methods Needed

All methods will be added to `MCPClientOrchestrator`:

### Test Prompt Management
- `createTestPrompt(data)`
- `getTestPrompt(promptId)`
- `listTestPrompts(filters)`
- `updateTestPrompt(promptId, data)`
- `deleteTestPrompt(promptId)`

### Test Suite Management
- `createTestSuite(data)`
- `getTestSuite(suiteId)`
- `listTestSuites(filters)`
- `updateTestSuite(suiteId, data)`
- `deleteTestSuite(suiteId)`

### Test Execution
- `runTestPrompt(promptId, orchestratorId, options)`
- `runTestSuite(suiteId, orchestratorId, options)`
- `bulkExecutePrompts(promptIds, orchestratorId, options)`
- `provideTestUserInput(executionId, userInputs)`

### Test Run History
- `getTestRun(runId)`
- `listTestRuns(filters)`

### Comparison & Baselines
- `compareTestRuns(runId1, runId2)`
- `createBaseline(runId, label, description)`
- `checkRegression(runId, baselineId)`

### Analytics
- `getPerformanceMetrics(filters)`
- `getPerformanceTrends(filters)`
- `getPerformanceReport(orchestratorId, dateRange)`

## Data Models

### TestPrompt
```typescript
interface TestPrompt {
  promptId: string
  query: string
  name?: string
  description?: string
  categories: string[]
  tags: string[]
  version: string
  userInputs?: Array<{
    stepId?: string
    field: string
    value: any
    description?: string
    order?: number
  }>
  expectedOutcome?: {
    success: boolean
    expectedPhases?: string[]
    maxDuration?: number
    expectedResults?: any
  }
  metadata?: {
    difficulty?: 'easy' | 'medium' | 'hard'
    priority?: 'low' | 'medium' | 'high'
    source?: string
    domain?: string
    author?: string
  }
  stats?: {
    executionCount: number
    successCount: number
    failureCount: number
    averageLatency: number
    lastExecutedAt?: Date
    lastExecutionId?: string
  }
}
```

### TestSuite
```typescript
interface TestSuite {
  suiteId: string
  name: string
  description?: string
  category?: string
  version: string
  testCases: Array<{
    id: string
    promptId: string
    query: string
    expectedOutcome?: {
      success: boolean
      expectedResults?: any
      expectedPhases?: string[]
      maxDuration?: number
    }
    metadata?: {
      tags: string[]
      difficulty: 'easy' | 'medium' | 'hard'
      category: string
      description?: string
    }
  }>
  metadata?: {
    author?: string
    source?: string
    tags?: string[]
  }
}
```

### TestRun
```typescript
interface TestRun {
  runId: string
  suiteId?: string
  orchestratorId: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  startedAt: Date
  completedAt?: Date
  results: Array<{
    testCaseId: string
    promptId: string
    executionId?: string
    status: 'passed' | 'failed' | 'error' | 'skipped'
    confidence?: number
    metrics?: {
      latency: number
      tokenUsage?: {
        input: number
        output: number
        total: number
      }
    }
    actualOutcome?: {
      success: boolean
      phases?: string[]
      duration?: number
    }
    userInputsProvided?: number
    userInputsRequired?: number
    error?: string
  }>
  summary: {
    total: number
    passed: number
    failed: number
    skipped: number
    averageLatency: number
    successRate: number
  }
}
```

## Next Steps

Read blueprints in order:
1. `07-PHASE-1-TEST-PROMPTS.md` - Test Prompt Management
2. `08-PHASE-1-TEST-SUITES.md` - Test Suite Management
3. `09-PHASE-2-TEST-EXECUTION.md` - Test Execution
4. `10-PHASE-2-TEST-RUNS.md` - Test Run History
5. `11-PHASE-3-TEST-COMPARISON.md` - Test Comparison & Baselines
6. `12-PHASE-3-TEST-ANALYTICS.md` - Test Analytics Dashboard


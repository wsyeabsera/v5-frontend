# Phase 2: Test Run History Page

## Overview

Build a comprehensive page for viewing test run history, filtering results, and analyzing detailed test case outcomes with metrics and execution links.

## Page: `app/v2/orchestrator/testing/runs/page.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { TestRunList } from '@/components/v2/orchestrator/testing/runs/TestRunList'
import { TestRunDetails } from '@/components/v2/orchestrator/testing/runs/TestRunDetails'
import { History } from 'lucide-react'
import { DashboardLayout } from '@/components/v2/orchestrator/dashboard/DashboardLayout'

export default function TestRunsPage() {
  const searchParams = useSearchParams()
  const runId = searchParams.get('runId')
  const [selectedRunId, setSelectedRunId] = useState<string | null>(runId)

  useEffect(() => {
    if (runId) {
      setSelectedRunId(runId)
    }
  }, [runId])

  return (
    <div className="container mx-auto py-8 px-4 max-w-[95vw]">
      <DashboardLayout
        title="Test Run History"
        description="View and analyze test run results. Filter by orchestrator, status, date range, and view detailed metrics."
      >
        {selectedRunId ? (
          <TestRunDetails
            runId={selectedRunId}
            onBack={() => setSelectedRunId(null)}
          />
        ) : (
          <TestRunList onSelectRun={setSelectedRunId} />
        )}
      </DashboardLayout>
    </div>
  )
}
```

## Component: `components/v2/orchestrator/testing/runs/TestRunList.tsx`

```typescript
'use client'

import { useTestRuns, useOrchestrators } from '@/lib/queries-v2'
import { TestRunCard } from './TestRunCard'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Loader2, Search, Calendar } from 'lucide-react'
import { useState } from 'react'
import { DatePickerWithRange } from '@/components/ui/date-picker'
import { DateRange } from 'react-day-picker'

interface TestRunListProps {
  onSelectRun: (runId: string) => void
}

export function TestRunList({ onSelectRun }: TestRunListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [orchestratorFilter, setOrchestratorFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  const { data: runs, isLoading, error } = useTestRuns({
    orchestratorId: orchestratorFilter !== 'all' ? orchestratorFilter : undefined,
    status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
    startDate: dateRange?.from?.toISOString(),
    endDate: dateRange?.to?.toISOString(),
  })

  const { data: orchestrators } = useOrchestrators()

  const filteredRuns = runs?.data?.filter((run) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        run.runId.toLowerCase().includes(query) ||
        run.suiteId?.toLowerCase().includes(query)
      )
    }
    return true
  }) || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-red-600">Error loading test runs: {error.message}</div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by run ID or suite ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={orchestratorFilter} onValueChange={setOrchestratorFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Orchestrator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orchestrators</SelectItem>
              {orchestrators?.data?.map((orch) => (
                <SelectItem key={orch._id} value={String(orch._id)}>
                  {orch.name || orch._id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <DatePickerWithRange
            date={dateRange}
            onDateChange={setDateRange}
          />
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Runs</div>
          <div className="text-2xl font-bold">{runs?.data?.length || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Completed</div>
          <div className="text-2xl font-bold text-green-600">
            {runs?.data?.filter((r) => r.status === 'completed').length || 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Failed</div>
          <div className="text-2xl font-bold text-red-600">
            {runs?.data?.filter((r) => r.status === 'failed').length || 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Running</div>
          <div className="text-2xl font-bold text-blue-600">
            {runs?.data?.filter((r) => r.status === 'running').length || 0}
          </div>
        </Card>
      </div>

      {/* Run List */}
      <div className="space-y-4">
        {filteredRuns.map((run) => (
          <TestRunCard
            key={run.runId}
            run={run}
            onClick={() => onSelectRun(run.runId)}
          />
        ))}
      </div>

      {filteredRuns.length === 0 && (
        <Card className="p-12 text-center">
          <div className="text-muted-foreground">No test runs found</div>
        </Card>
      )}
    </div>
  )
}
```

## Component: `components/v2/orchestrator/testing/runs/TestRunCard.tsx`

```typescript
'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Clock, Loader2, ArrowRight } from 'lucide-react'

interface TestRun {
  runId: string
  suiteId?: string
  orchestratorId: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  startedAt: string
  completedAt?: string
  summary?: {
    total: number
    passed: number
    failed: number
    successRate: number
    averageLatency: number
  }
}

interface TestRunCardProps {
  run: TestRun
  onClick: () => void
}

export function TestRunCard({ run, onClick }: TestRunCardProps) {
  const getStatusIcon = () => {
    switch (run.status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
      default:
        return <Clock className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusVariant = (): 'default' | 'destructive' | 'secondary' => {
    switch (run.status) {
      case 'completed':
        return 'default'
      case 'failed':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <Card
      className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          {getStatusIcon()}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">Run: {run.runId}</h3>
              <Badge variant={getStatusVariant()}>{run.status}</Badge>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>Orchestrator: {run.orchestratorId}</div>
              {run.suiteId && <div>Suite: {run.suiteId}</div>}
              <div>
                Started: {new Date(run.startedAt).toLocaleString()}
                {run.completedAt && ` • Completed: ${new Date(run.completedAt).toLocaleString()}`}
              </div>
            </div>
            {run.summary && (
              <div className="grid grid-cols-4 gap-4 mt-3 pt-3 border-t">
                <div>
                  <div className="text-xs text-muted-foreground">Total</div>
                  <div className="font-semibold">{run.summary.total}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Passed</div>
                  <div className="font-semibold text-green-600">{run.summary.passed}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                  <div className="font-semibold text-red-600">{run.summary.failed}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Success Rate</div>
                  <div className="font-semibold">{run.summary.successRate.toFixed(1)}%</div>
                </div>
              </div>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm">
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  )
}
```

## Component: `components/v2/orchestrator/testing/runs/TestRunDetails.tsx`

```typescript
'use client'

import { useGetTestRun } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TestCaseResult } from './TestCaseResult'
import { MetricsDisplay } from './MetricsDisplay'
import { Loader2, ArrowLeft, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface TestRunDetailsProps {
  runId: string
  onBack: () => void
}

export function TestRunDetails({ runId, onBack }: TestRunDetailsProps) {
  const router = useRouter()
  const { data: testRun, isLoading, error } = useGetTestRun(runId)

  const run = testRun?.data

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !run) {
    return (
      <Card className="p-6">
        <div className="text-red-600">Error loading test run: {error?.message || 'Not found'}</div>
        <Button onClick={onBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to List
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Test Run: {run.runId}</h2>
            <p className="text-sm text-muted-foreground">
              Started: {new Date(run.startedAt).toLocaleString()}
              {run.completedAt && ` • Completed: ${new Date(run.completedAt).toLocaleString()}`}
            </p>
          </div>
        </div>
        <Badge variant={run.status === 'completed' ? 'default' : 'destructive'}>
          {run.status}
        </Badge>
      </div>

      {/* Summary */}
      {run.summary && (
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="text-2xl font-bold">{run.summary.total}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Passed</div>
              <div className="text-2xl font-bold text-green-600">{run.summary.passed}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Failed</div>
              <div className="text-2xl font-bold text-red-600">{run.summary.failed}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
              <div className="text-2xl font-bold">{run.summary.successRate.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Avg Latency</div>
              <div className="text-2xl font-bold">
                {Math.round(run.summary.averageLatency || 0)}ms
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Metrics */}
      {run.results && run.results.length > 0 && (
        <MetricsDisplay results={run.results} />
      )}

      {/* Test Case Results */}
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4">Test Case Results</h3>
        <div className="space-y-4">
          {run.results?.map((result, index) => (
            <TestCaseResult
              key={index}
              result={result}
              onViewExecution={() => {
                if (result.executionId) {
                  router.push(`/v2/orchestrator/orchestrations/${result.executionId}`)
                }
              }}
            />
          ))}
        </div>
      </Card>
    </div>
  )
}
```

## Component: `components/v2/orchestrator/testing/runs/TestCaseResult.tsx`

```typescript
'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronUp, ExternalLink, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface TestCaseResult {
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
    executionCode?: string
    executionMessage?: string
  }
  userInputsProvided?: number
  userInputsRequired?: number
  error?: string
}

interface TestCaseResultProps {
  result: TestCaseResult
  onViewExecution: () => void
}

export function TestCaseResult({ result, onViewExecution }: TestCaseResultProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getStatusVariant = (): 'default' | 'destructive' | 'secondary' | 'outline' => {
    switch (result.status) {
      case 'passed':
        return 'default'
      case 'failed':
      case 'error':
        return 'destructive'
      case 'skipped':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={getStatusVariant()}>{result.status}</Badge>
            <span className="font-medium">{result.testCaseId}</span>
            {result.confidence !== undefined && (
              <Badge variant="outline">Confidence: {(result.confidence * 100).toFixed(1)}%</Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground mb-2">
            Prompt: {result.promptId}
          </div>
          {result.metrics && (
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Latency: </span>
                <span className="font-medium">{result.metrics.latency}ms</span>
              </div>
              {result.userInputsProvided !== undefined && (
                <div>
                  <span className="text-muted-foreground">Inputs: </span>
                  <span className="font-medium">
                    {result.userInputsProvided}/{result.userInputsRequired || 0}
                  </span>
                </div>
              )}
              {result.metrics.tokenUsage && (
                <div>
                  <span className="text-muted-foreground">Tokens: </span>
                  <span className="font-medium">{result.metrics.tokenUsage.total}</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {result.executionId && (
            <Button variant="outline" size="sm" onClick={onViewExecution}>
              <ExternalLink className="w-4 h-4 mr-2" />
              View Execution
            </Button>
          )}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
      </div>

      {result.error && (
        <Alert variant="destructive" className="mt-3">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      )}

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent className="mt-4 pt-4 border-t space-y-3">
          {result.actualOutcome && (
            <div>
              <div className="text-sm font-medium mb-1">Actual Outcome:</div>
              <div className="text-sm text-muted-foreground">
                Success: {result.actualOutcome.success ? 'Yes' : 'No'}
                {result.actualOutcome.executionCode && (
                  <> • Code: {result.actualOutcome.executionCode}</>
                )}
                {result.actualOutcome.executionMessage && (
                  <> • Message: {result.actualOutcome.executionMessage}</>
                )}
              </div>
            </div>
          )}
          {result.metrics?.tokenUsage && (
            <div>
              <div className="text-sm font-medium mb-1">Token Usage:</div>
              <div className="text-sm text-muted-foreground">
                Input: {result.metrics.tokenUsage.input} • Output: {result.metrics.tokenUsage.output} • Total: {result.metrics.tokenUsage.total}
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
```

## Component: `components/v2/orchestrator/testing/runs/MetricsDisplay.tsx`

```typescript
'use client'

import { Card } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface TestCaseResult {
  testCaseId: string
  status: string
  metrics?: {
    latency: number
  }
}

interface MetricsDisplayProps {
  results: TestCaseResult[]
}

export function MetricsDisplay({ results }: MetricsDisplayProps) {
  const chartData = results.map((r) => ({
    name: r.testCaseId,
    latency: r.metrics?.latency || 0,
    status: r.status,
  }))

  const statusCounts = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold mb-4">Metrics</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium mb-2">Latency by Test Case</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="latency" fill="#8884d8" name="Latency (ms)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-2">Status Distribution</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={Object.entries(statusCounts).map(([status, count]) => ({ status, count }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#82ca9d" name="Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  )
}
```

## API Integration

### Extend `lib/mcp-client-orchestrator.ts`

```typescript
async getTestRun(runId: string) {
  return this.callTool('get_test_run', { runId, stream: false })
}

async listTestRuns(filters?: {
  suiteId?: string
  orchestratorId?: string
  status?: 'running' | 'completed' | 'failed' | 'cancelled'
  startDate?: string
  endDate?: string
  limit?: number
  skip?: number
}) {
  return this.callTool('list_test_runs', { ...filters, stream: false })
}
```

### Extend `lib/queries-v2.ts`

```typescript
export function useGetTestRun(runId: string) {
  return useQuery({
    queryKey: ['test-run', runId],
    queryFn: () => mcpClient.getTestRun(runId),
    enabled: !!runId,
  })
}

export function useTestRuns(filters?: {
  suiteId?: string
  orchestratorId?: string
  status?: 'running' | 'completed' | 'failed' | 'cancelled'
  startDate?: string
  endDate?: string
}) {
  return useQuery({
    queryKey: ['test-runs', filters],
    queryFn: () => mcpClient.listTestRuns(filters),
  })
}
```

## Implementation Steps

1. Create page component at `app/v2/orchestrator/testing/runs/page.tsx`
2. Create component directory `components/v2/orchestrator/testing/runs/`
3. Implement `TestRunList` with filtering and search
4. Implement `TestRunCard` for displaying runs
5. Implement `TestRunDetails` for detailed view
6. Implement `TestCaseResult` for individual results
7. Implement `MetricsDisplay` for charts
8. Extend `MCPClientOrchestrator` with test run methods
9. Add query hooks to `queries-v2.ts`
10. Test filtering and search
11. Test detailed view navigation
12. Test metrics visualization

## Success Criteria

- ✅ List test runs with filtering
- ✅ Filter by orchestrator, status, and date range
- ✅ Search by run ID or suite ID
- ✅ View detailed test run information
- ✅ View individual test case results
- ✅ View execution metrics and charts
- ✅ Navigate to execution details
- ✅ View user input statistics


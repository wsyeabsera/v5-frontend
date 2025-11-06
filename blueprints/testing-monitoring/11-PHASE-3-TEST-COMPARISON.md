# Phase 3: Test Comparison & Baselines Page

## Overview

Build a comprehensive page for comparing test runs, creating and managing baselines, detecting regressions, and visualizing performance differences.

## Page: `app/v2/orchestrator/testing/comparison/page.tsx`

```typescript
'use client'

import { ComparisonView } from '@/components/v2/orchestrator/testing/comparison/ComparisonView'
import { BaselineManager } from '@/components/v2/orchestrator/testing/comparison/BaselineManager'
import { RegressionDetector } from '@/components/v2/orchestrator/testing/comparison/RegressionDetector'
import { GitCompare } from 'lucide-react'
import { DashboardLayout } from '@/components/v2/orchestrator/dashboard/DashboardLayout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function TestComparisonPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-[95vw]">
      <DashboardLayout
        title="Test Comparison & Baselines"
        description="Compare test runs, create baselines, and detect performance regressions."
      >
        <Tabs defaultValue="comparison" className="w-full">
          <TabsList>
            <TabsTrigger value="comparison">Run Comparison</TabsTrigger>
            <TabsTrigger value="baselines">Baselines</TabsTrigger>
            <TabsTrigger value="regression">Regression Detection</TabsTrigger>
          </TabsList>

          <TabsContent value="comparison">
            <ComparisonView />
          </TabsContent>

          <TabsContent value="baselines">
            <BaselineManager />
          </TabsContent>

          <TabsContent value="regression">
            <RegressionDetector />
          </TabsContent>
        </Tabs>
      </DashboardLayout>
    </div>
  )
}
```

## Component: `components/v2/orchestrator/testing/comparison/ComparisonView.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTestRuns } from '@/lib/queries-v2'
import { useCompareTestRuns } from '@/lib/queries-v2'
import { ComparisonCharts } from './ComparisonCharts'
import { Loader2 } from 'lucide-react'

export function ComparisonView() {
  const [runId1, setRunId1] = useState<string>('')
  const [runId2, setRunId2] = useState<string>('')
  const [compareEnabled, setCompareEnabled] = useState(false)

  const { data: runs } = useTestRuns({ limit: 50 })
  const { data: comparison, isLoading } = useCompareTestRuns(
    runId1,
    runId2,
    { enabled: compareEnabled && !!runId1 && !!runId2 }
  )

  const handleCompare = () => {
    if (runId1 && runId2) {
      setCompareEnabled(true)
    }
  }

  return (
    <div className="space-y-6">
      {/* Run Selection */}
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4">Select Test Runs to Compare</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Run 1 (Baseline)</label>
            <Select value={runId1} onValueChange={(v) => { setRunId1(v); setCompareEnabled(false) }}>
              <SelectTrigger>
                <SelectValue placeholder="Select first test run" />
              </SelectTrigger>
              <SelectContent>
                {runs?.data?.map((run) => (
                  <SelectItem key={run.runId} value={run.runId}>
                    {run.runId} - {new Date(run.startedAt).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Run 2 (Current)</label>
            <Select value={runId2} onValueChange={(v) => { setRunId2(v); setCompareEnabled(false) }}>
              <SelectTrigger>
                <SelectValue placeholder="Select second test run" />
              </SelectTrigger>
              <SelectContent>
                {runs?.data?.map((run) => (
                  <SelectItem key={run.runId} value={run.runId}>
                    {run.runId} - {new Date(run.startedAt).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          onClick={handleCompare}
          disabled={!runId1 || !runId2 || runId1 === runId2}
          className="mt-4"
        >
          Compare Runs
        </Button>
      </Card>

      {/* Comparison Results */}
      {isLoading && (
        <Card className="p-12">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </Card>
      )}

      {comparison?.data && (
        <>
          <ComparisonCharts comparison={comparison.data} />
          
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4">Detailed Comparison</h3>
            <div className="space-y-4">
              {comparison.data.differences?.map((diff, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{diff.testCaseId}</div>
                    <Badge variant={diff.status === 'improved' ? 'default' : 'destructive'}>
                      {diff.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Run 1</div>
                      <div>Status: {diff.run1Status}</div>
                      <div>Latency: {diff.run1Latency}ms</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Run 2</div>
                      <div>Status: {diff.run2Status}</div>
                      <div>Latency: {diff.run2Latency}ms</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
```

## Component: `components/v2/orchestrator/testing/comparison/BaselineManager.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTestRuns } from '@/lib/queries-v2'
import { useCreateBaseline } from '@/lib/queries-v2'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

export function BaselineManager() {
  const [selectedRunId, setSelectedRunId] = useState<string>('')
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')

  const { data: runs } = useTestRuns({ status: 'completed', limit: 50 })
  const createBaselineMutation = useCreateBaseline()

  const handleCreateBaseline = async () => {
    if (!selectedRunId || !label) {
      alert('Please select a run and provide a label')
      return
    }

    try {
      await createBaselineMutation.mutateAsync({
        runId: selectedRunId,
        label,
        description: description || undefined,
      })
      setSelectedRunId('')
      setLabel('')
      setDescription('')
      alert('Baseline created successfully')
    } catch (error: any) {
      alert(`Failed to create baseline: ${error.message}`)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4">Create Baseline</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="run-select">Test Run *</Label>
            <Select value={selectedRunId} onValueChange={setSelectedRunId}>
              <SelectTrigger id="run-select">
                <SelectValue placeholder="Select a completed test run" />
              </SelectTrigger>
              <SelectContent>
                {runs?.data?.map((run) => (
                  <SelectItem key={run.runId} value={run.runId}>
                    {run.runId} - {new Date(run.startedAt).toLocaleDateString()}
                    {run.summary && (
                      <> - {run.summary.successRate.toFixed(1)}% success</>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Label *</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., v1.0-baseline, production-baseline"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
            />
          </div>

          <Button
            onClick={handleCreateBaseline}
            disabled={!selectedRunId || !label || createBaselineMutation.isPending}
          >
            {createBaselineMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Baseline'
            )}
          </Button>
        </div>
      </Card>

      {/* Existing Baselines */}
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4">Existing Baselines</h3>
        <p className="text-muted-foreground">
          Baselines can be used for regression detection. Use the Regression Detection tab to check runs against baselines.
        </p>
      </Card>
    </div>
  )
}
```

## Component: `components/v2/orchestrator/testing/comparison/RegressionDetector.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTestRuns } from '@/lib/queries-v2'
import { useCheckRegression } from '@/lib/queries-v2'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'

export function RegressionDetector() {
  const [selectedRunId, setSelectedRunId] = useState<string>('')
  const [baselineId, setBaselineId] = useState<string>('')
  const [checkEnabled, setCheckEnabled] = useState(false)

  const { data: runs } = useTestRuns({ limit: 50 })
  const { data: regression, isLoading } = useCheckRegression(
    selectedRunId,
    baselineId,
    { enabled: checkEnabled && !!selectedRunId && !!baselineId }
  )

  const handleCheck = () => {
    if (selectedRunId && baselineId) {
      setCheckEnabled(true)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4">Check for Regressions</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Test Run</label>
            <Select value={selectedRunId} onValueChange={(v) => { setSelectedRunId(v); setCheckEnabled(false) }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a test run to check" />
              </SelectTrigger>
              <SelectContent>
                {runs?.data?.map((run) => (
                  <SelectItem key={run.runId} value={run.runId}>
                    {run.runId} - {new Date(run.startedAt).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Baseline</label>
            <Select value={baselineId} onValueChange={(v) => { setBaselineId(v); setCheckEnabled(false) }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a baseline" />
              </SelectTrigger>
              <SelectContent>
                {/* Baselines would come from a separate query */}
                <SelectItem value="baseline1">Baseline 1</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleCheck}
            disabled={!selectedRunId || !baselineId}
          >
            Check for Regressions
          </Button>
        </div>
      </Card>

      {isLoading && (
        <Card className="p-12">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </Card>
      )}

      {regression?.data && (
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Regression Analysis</h3>
          {regression.data.hasRegression ? (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                Regressions detected! {regression.data.regressionCount} test case(s) show performance degradation.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <CheckCircle2 className="w-4 h-4" />
              <AlertDescription>
                No regressions detected. Performance is equal to or better than baseline.
              </AlertDescription>
            </Alert>
          )}

          {regression.data.regressions && regression.data.regressions.length > 0 && (
            <div className="mt-4 space-y-2">
              {regression.data.regressions.map((reg, index) => (
                <Card key={index} className="p-4">
                  <div className="font-medium mb-2">{reg.testCaseId}</div>
                  <div className="text-sm text-muted-foreground">
                    {reg.reason}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
```

## Component: `components/v2/orchestrator/testing/comparison/ComparisonCharts.tsx`

```typescript
'use client'

import { Card } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

interface ComparisonData {
  summary: {
    run1: {
      total: number
      passed: number
      failed: number
      successRate: number
      averageLatency: number
    }
    run2: {
      total: number
      passed: number
      failed: number
      successRate: number
      averageLatency: number
    }
  }
  differences?: Array<{
    testCaseId: string
    status: 'improved' | 'regressed' | 'unchanged'
    run1Status: string
    run2Status: string
    run1Latency: number
    run2Latency: number
  }>
}

interface ComparisonChartsProps {
  comparison: ComparisonData
}

export function ComparisonCharts({ comparison }: ComparisonChartsProps) {
  const summaryData = [
    {
      metric: 'Total',
      run1: comparison.summary.run1.total,
      run2: comparison.summary.run2.total,
    },
    {
      metric: 'Passed',
      run1: comparison.summary.run1.passed,
      run2: comparison.summary.run2.passed,
    },
    {
      metric: 'Failed',
      run1: comparison.summary.run1.failed,
      run2: comparison.summary.run2.failed,
    },
    {
      metric: 'Success Rate',
      run1: comparison.summary.run1.successRate,
      run2: comparison.summary.run2.successRate,
    },
  ]

  const latencyData = comparison.differences?.map((diff) => ({
    testCase: diff.testCaseId,
    run1: diff.run1Latency,
    run2: diff.run2Latency,
  })) || []

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-6">
        <h4 className="text-sm font-medium mb-4">Summary Comparison</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={summaryData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="metric" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="run1" fill="#8884d8" name="Run 1" />
            <Bar dataKey="run2" fill="#82ca9d" name="Run 2" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6">
        <h4 className="text-sm font-medium mb-4">Latency Comparison</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={latencyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="testCase" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="run1" stroke="#8884d8" name="Run 1" />
            <Line type="monotone" dataKey="run2" stroke="#82ca9d" name="Run 2" />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
```

## API Integration

### Extend `lib/mcp-client-orchestrator.ts`

```typescript
async compareTestRuns(runId1: string, runId2: string) {
  return this.callTool('compare_test_runs', { runId1, runId2, stream: false })
}

async createBaseline(data: {
  runId: string
  label: string
  description?: string
}) {
  return this.callTool('create_baseline', { ...data, stream: false })
}

async checkRegression(runId: string, baselineId: string) {
  return this.callTool('check_regression', { runId, baselineId, stream: false })
}
```

### Extend `lib/queries-v2.ts`

```typescript
export function useCompareTestRuns(
  runId1: string,
  runId2: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['test-run-comparison', runId1, runId2],
    queryFn: () => mcpClient.compareTestRuns(runId1, runId2),
    enabled: (options?.enabled ?? true) && !!runId1 && !!runId2,
  })
}

export function useCreateBaseline() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof mcpClient.createBaseline>[0]) =>
      mcpClient.createBaseline(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['baselines'] })
    },
  })
}

export function useCheckRegression(
  runId: string,
  baselineId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['regression-check', runId, baselineId],
    queryFn: () => mcpClient.checkRegression(runId, baselineId),
    enabled: (options?.enabled ?? true) && !!runId && !!baselineId,
  })
}
```

## Implementation Steps

1. Create page component at `app/v2/orchestrator/testing/comparison/page.tsx`
2. Create component directory `components/v2/orchestrator/testing/comparison/`
3. Implement `ComparisonView` for comparing two runs
4. Implement `BaselineManager` for creating baselines
5. Implement `RegressionDetector` for checking regressions
6. Implement `ComparisonCharts` for visualization
7. Extend `MCPClientOrchestrator` with comparison methods
8. Add query hooks to `queries-v2.ts`
9. Test run comparison
10. Test baseline creation
11. Test regression detection
12. Test chart visualization

## Success Criteria

- ✅ Compare two test runs side-by-side
- ✅ Create and manage baselines
- ✅ Detect performance regressions
- ✅ Visualize comparison metrics
- ✅ View detailed differences
- ✅ Identify improved/regressed test cases


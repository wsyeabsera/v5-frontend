# Phase 2: Test Execution Page

## Overview

Build a comprehensive page for executing test prompts and test suites with real-time monitoring, user input handling, and progress tracking.

## Page: `app/v2/orchestrator/testing/execution/page.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { TestExecutionPanel } from '@/components/v2/orchestrator/testing/execution/TestExecutionPanel'
import { ExecutionMonitor } from '@/components/v2/orchestrator/testing/execution/ExecutionMonitor'
import { Play } from 'lucide-react'
import { DashboardLayout } from '@/components/v2/orchestrator/dashboard/DashboardLayout'

export default function TestExecutionPage() {
  const searchParams = useSearchParams()
  const promptId = searchParams.get('promptId')
  const suiteId = searchParams.get('suiteId')
  const [executionId, setExecutionId] = useState<string | null>(null)

  return (
    <div className="container mx-auto py-8 px-4 max-w-[95vw]">
      <DashboardLayout
        title="Test Execution"
        description="Execute test prompts and suites with real-time monitoring. User inputs are automatically provided when configured."
      >
        <div className="space-y-6">
          {!executionId ? (
            <TestExecutionPanel
              initialPromptId={promptId || undefined}
              initialSuiteId={suiteId || undefined}
              onExecutionStart={(id) => setExecutionId(id)}
            />
          ) : (
            <ExecutionMonitor
              executionId={executionId}
              onComplete={() => setExecutionId(null)}
              onCancel={() => setExecutionId(null)}
            />
          )}
        </div>
      </DashboardLayout>
    </div>
  )
}
```

## Component: `components/v2/orchestrator/testing/execution/TestExecutionPanel.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTestPrompts, useTestSuites, useOrchestrators } from '@/lib/queries-v2'
import { useRunTestPrompt, useRunTestSuite } from '@/lib/queries-v2'
import { Play, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface TestExecutionPanelProps {
  initialPromptId?: string
  initialSuiteId?: string
  onExecutionStart: (executionId: string) => void
}

export function TestExecutionPanel({
  initialPromptId,
  initialSuiteId,
  onExecutionStart,
}: TestExecutionPanelProps) {
  const [executionType, setExecutionType] = useState<'prompt' | 'suite'>(
    initialSuiteId ? 'suite' : 'prompt'
  )
  const [selectedPromptId, setSelectedPromptId] = useState(initialPromptId || '')
  const [selectedSuiteId, setSelectedSuiteId] = useState(initialSuiteId || '')
  const [selectedOrchestratorId, setSelectedOrchestratorId] = useState('')
  const [timeout, setTimeout] = useState(300000) // 5 minutes default

  const { data: prompts } = useTestPrompts()
  const { data: suites } = useTestSuites()
  const { data: orchestrators } = useOrchestrators()
  const runPromptMutation = useRunTestPrompt()
  const runSuiteMutation = useRunTestSuite()

  const selectedPrompt = prompts?.data?.find((p) => p.promptId === selectedPromptId)
  const selectedSuite = suites?.data?.find((s) => s.suiteId === selectedSuiteId)

  const handleExecute = async () => {
    if (!selectedOrchestratorId) {
      alert('Please select an orchestrator')
      return
    }

    try {
      let result
      if (executionType === 'prompt') {
        if (!selectedPromptId) {
          alert('Please select a test prompt')
          return
        }
        result = await runPromptMutation.mutateAsync({
          promptId: selectedPromptId,
          orchestratorId: selectedOrchestratorId,
          timeout,
        })
      } else {
        if (!selectedSuiteId) {
          alert('Please select a test suite')
          return
        }
        result = await runSuiteMutation.mutateAsync({
          suiteId: selectedSuiteId,
          orchestratorId: selectedOrchestratorId,
          timeout,
        })
      }

      const runId = result.data?.runId
      if (runId) {
        onExecutionStart(runId)
      }
    } catch (error: any) {
      console.error('Execution error:', error)
      alert(`Execution failed: ${error.message}`)
    }
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Execute Test</h2>
          <p className="text-muted-foreground">
            Select a test prompt or suite to execute against an orchestrator.
          </p>
        </div>

        <Tabs value={executionType} onValueChange={(v) => setExecutionType(v as 'prompt' | 'suite')}>
          <TabsList>
            <TabsTrigger value="prompt">Single Prompt</TabsTrigger>
            <TabsTrigger value="suite">Test Suite</TabsTrigger>
          </TabsList>

          <TabsContent value="prompt" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt-select">Test Prompt *</Label>
              <Select value={selectedPromptId} onValueChange={setSelectedPromptId}>
                <SelectTrigger id="prompt-select">
                  <SelectValue placeholder="Select a test prompt" />
                </SelectTrigger>
                <SelectContent>
                  {prompts?.data?.map((prompt) => (
                    <SelectItem key={prompt.promptId} value={prompt.promptId}>
                      {prompt.name || prompt.promptId} - {prompt.query.substring(0, 50)}
                      {prompt.query.length > 50 ? '...' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPrompt && (
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <div className="text-sm font-medium mb-1">Selected Prompt:</div>
                  <div className="text-sm text-muted-foreground">{selectedPrompt.query}</div>
                  {selectedPrompt.userInputs && selectedPrompt.userInputs.length > 0 && (
                    <Badge variant="outline" className="mt-2">
                      {selectedPrompt.userInputs.length} user inputs configured
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="suite" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="suite-select">Test Suite *</Label>
              <Select value={selectedSuiteId} onValueChange={setSelectedSuiteId}>
                <SelectTrigger id="suite-select">
                  <SelectValue placeholder="Select a test suite" />
                </SelectTrigger>
                <SelectContent>
                  {suites?.data?.map((suite) => (
                    <SelectItem key={suite.suiteId} value={suite.suiteId}>
                      {suite.name} ({suite.testCases.length} cases)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSuite && (
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <div className="text-sm font-medium mb-1">Selected Suite:</div>
                  <div className="text-sm text-muted-foreground">{selectedSuite.description || 'No description'}</div>
                  <Badge variant="outline" className="mt-2">
                    {selectedSuite.testCases.length} test cases
                  </Badge>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <Label htmlFor="orchestrator-select">Orchestrator *</Label>
          <Select value={selectedOrchestratorId} onValueChange={setSelectedOrchestratorId}>
            <SelectTrigger id="orchestrator-select">
              <SelectValue placeholder="Select an orchestrator" />
            </SelectTrigger>
            <SelectContent>
              {orchestrators?.data?.map((orch) => (
                <SelectItem key={orch._id} value={String(orch._id)}>
                  {orch.name || orch._id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timeout">Timeout (ms)</Label>
          <Input
            id="timeout"
            type="number"
            value={timeout}
            onChange={(e) => setTimeout(parseInt(e.target.value) || 300000)}
            placeholder="300000"
          />
          <p className="text-xs text-muted-foreground">
            Maximum execution time in milliseconds (default: 300000 = 5 minutes)
          </p>
        </div>

        <Button
          onClick={handleExecute}
          disabled={
            runPromptMutation.isPending ||
            runSuiteMutation.isPending ||
            !selectedOrchestratorId ||
            (executionType === 'prompt' && !selectedPromptId) ||
            (executionType === 'suite' && !selectedSuiteId)
          }
          className="w-full"
          size="lg"
        >
          {runPromptMutation.isPending || runSuiteMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Starting Execution...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Execute Test
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}
```

## Component: `components/v2/orchestrator/testing/execution/ExecutionMonitor.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ExecutionProgress } from './ExecutionProgress'
import { UserInputHandler } from './UserInputHandler'
import { useGetTestRun } from '@/lib/queries-v2'
import { Loader2, CheckCircle2, XCircle, Clock, X } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ExecutionMonitorProps {
  executionId: string
  onComplete: () => void
  onCancel: () => void
}

export function ExecutionMonitor({ executionId, onComplete, onCancel }: ExecutionMonitorProps) {
  const { data: testRun, isLoading, error, refetch } = useGetTestRun(executionId, {
    refetchInterval: (data) => {
      // Poll every 2 seconds if still running
      return data?.data?.status === 'running' ? 2000 : false
    },
  })

  const run = testRun?.data
  const isRunning = run?.status === 'running'
  const isCompleted = run?.status === 'completed'
  const isFailed = run?.status === 'failed'

  useEffect(() => {
    if (isCompleted || isFailed) {
      // Stop polling after a delay
      setTimeout(() => {
        refetch()
      }, 1000)
    }
  }, [isCompleted, isFailed, refetch])

  if (isLoading && !run) {
    return (
      <Card className="p-12">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Error loading test run: {error.message}</AlertDescription>
      </Alert>
    )
  }

  if (!run) {
    return (
      <Alert>
        <AlertDescription>Test run not found</AlertDescription>
      </Alert>
    )
  }

  const successRate = run.summary?.total
    ? ((run.summary.passed / run.summary.total) * 100).toFixed(1)
    : '0'

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {isRunning && <Clock className="w-6 h-6 text-blue-600 animate-pulse" />}
            {isCompleted && <CheckCircle2 className="w-6 h-6 text-green-600" />}
            {isFailed && <XCircle className="w-6 h-6 text-red-600" />}
            <div>
              <h2 className="text-2xl font-bold">Test Run: {run.runId}</h2>
              <p className="text-sm text-muted-foreground">
                Started: {new Date(run.startedAt).toLocaleString()}
                {run.completedAt && ` • Completed: ${new Date(run.completedAt).toLocaleString()}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isRunning ? 'default' : isCompleted ? 'default' : 'destructive'}>
              {run.status}
            </Badge>
            {isRunning && (
              <Button variant="outline" size="sm" onClick={onCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        {run.summary && (
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
              <div className="text-2xl font-bold">{successRate}%</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Avg Latency</div>
              <div className="text-2xl font-bold">
                {Math.round(run.summary.averageLatency || 0)}ms
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {isRunning && run.summary && (
          <div className="mt-4">
            <Progress
              value={(run.summary.passed + run.summary.failed) / run.summary.total * 100}
              className="h-2"
            />
          </div>
        )}
      </Card>

      {/* Execution Progress */}
      {isRunning && <ExecutionProgress testRun={run} />}

      {/* User Input Handler */}
      {isRunning && <UserInputHandler testRun={run} />}

      {/* Results */}
      {run.results && run.results.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Test Case Results</h3>
          <div className="space-y-3">
            {run.results.map((result, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium">Test Case: {result.testCaseId}</div>
                    <div className="text-sm text-muted-foreground">
                      Prompt: {result.promptId}
                    </div>
                  </div>
                  <Badge
                    variant={
                      result.status === 'passed'
                        ? 'default'
                        : result.status === 'failed'
                        ? 'destructive'
                        : 'outline'
                    }
                  >
                    {result.status}
                  </Badge>
                </div>
                {result.error && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertDescription>{result.error}</AlertDescription>
                  </Alert>
                )}
                {result.metrics && (
                  <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Latency: </span>
                      <span className="font-medium">{result.metrics.latency}ms</span>
                    </div>
                    {result.userInputsProvided !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Inputs Provided: </span>
                        <span className="font-medium">{result.userInputsProvided}</span>
                      </div>
                    )}
                    {result.userInputsRequired !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Inputs Required: </span>
                        <span className="font-medium">{result.userInputsRequired}</span>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Completion Actions */}
      {(isCompleted || isFailed) && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onComplete}>
            Run Another Test
          </Button>
          <Button onClick={() => window.location.href = `/v2/orchestrator/testing/runs?runId=${run.runId}`}>
            View Details
          </Button>
        </div>
      )}
    </div>
  )
}
```

## Component: `components/v2/orchestrator/testing/execution/ExecutionProgress.tsx`

```typescript
'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'

interface TestRun {
  runId: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  results?: Array<{
    testCaseId: string
    status: 'passed' | 'failed' | 'error' | 'skipped'
    promptId: string
  }>
}

interface ExecutionProgressProps {
  testRun: TestRun
}

export function ExecutionProgress({ testRun }: ExecutionProgressProps) {
  const results = testRun.results || []

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold mb-4">Execution Progress</h3>
      <div className="space-y-2">
        {results.map((result, index) => (
          <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-md">
            {result.status === 'passed' && (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            )}
            {result.status === 'failed' && (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            {result.status === 'error' && (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            {!result.status && (
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            )}
            <div className="flex-1">
              <div className="font-medium">{result.testCaseId}</div>
              <div className="text-sm text-muted-foreground">{result.promptId}</div>
            </div>
            {result.status && (
              <Badge
                variant={
                  result.status === 'passed'
                    ? 'default'
                    : result.status === 'failed' || result.status === 'error'
                    ? 'destructive'
                    : 'outline'
                }
              >
                {result.status}
              </Badge>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
```

## Component: `components/v2/orchestrator/testing/execution/UserInputHandler.tsx`

```typescript
'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useProvideTestUserInput } from '@/lib/queries-v2'
import { Info } from 'lucide-react'

interface TestRun {
  runId: string
  status: string
  results?: Array<{
    executionId?: string
    userInputsRequired?: number
    userInputsProvided?: number
  }>
}

interface UserInputHandlerProps {
  testRun: TestRun
}

export function UserInputHandler({ testRun }: UserInputHandlerProps) {
  // This component would handle manual user input provision if needed
  // Most inputs should be provided automatically via test prompt configuration
  
  const needsInput = testRun.results?.some(
    (r) => r.userInputsRequired && r.userInputsRequired > (r.userInputsProvided || 0)
  )

  if (!needsInput) {
    return null
  }

  return (
    <Card className="p-6 border-yellow-500">
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          Some test cases require user input. User inputs configured in test prompts are automatically provided.
          If additional inputs are needed, they can be provided manually via the execution details.
        </AlertDescription>
      </Alert>
    </Card>
  )
}
```

## API Integration

### Extend `lib/mcp-client-orchestrator.ts`

```typescript
async runTestPrompt(data: {
  promptId: string
  orchestratorId: string
  timeout?: number
}) {
  return this.callTool('run_test_prompt', { ...data, stream: false })
}

async runTestSuite(data: {
  suiteId: string
  orchestratorId: string
  timeout?: number
  config?: {
    parallel?: boolean
    maxConcurrent?: number
    continueOnError?: boolean
  }
}) {
  return this.callTool('run_test_suite', { ...data, stream: false })
}

async provideTestUserInput(data: {
  executionId: string
  userInputs: Array<{
    stepId: string
    field: string
    value: any
  }>
}) {
  return this.callTool('provide_test_user_input', { ...data, stream: false })
}
```

### Extend `lib/queries-v2.ts`

```typescript
export function useGetTestRun(runId: string, options?: { refetchInterval?: number | false }) {
  return useQuery({
    queryKey: ['test-run', runId],
    queryFn: () => mcpClient.getTestRun(runId),
    enabled: !!runId,
    refetchInterval: options?.refetchInterval,
  })
}

export function useRunTestPrompt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof mcpClient.runTestPrompt>[0]) =>
      mcpClient.runTestPrompt(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-runs'] })
    },
  })
}

export function useRunTestSuite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof mcpClient.runTestSuite>[0]) =>
      mcpClient.runTestSuite(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-runs'] })
    },
  })
}

export function useProvideTestUserInput() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof mcpClient.provideTestUserInput>[0]) =>
      mcpClient.provideTestUserInput(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['test-run', variables.executionId] })
    },
  })
}
```

## Implementation Steps

1. Create page component at `app/v2/orchestrator/testing/execution/page.tsx`
2. Create component directory `components/v2/orchestrator/testing/execution/`
3. Implement `TestExecutionPanel` for selecting and starting tests
4. Implement `ExecutionMonitor` for real-time monitoring
5. Implement `ExecutionProgress` for showing test case progress
6. Implement `UserInputHandler` for manual input provision (if needed)
7. Extend `MCPClientOrchestrator` with execution methods
8. Add query hooks to `queries-v2.ts`
9. Test single prompt execution
10. Test suite execution
11. Test real-time monitoring
12. Test user input handling

## Success Criteria

- ✅ Execute single test prompts
- ✅ Execute test suites
- ✅ Real-time progress monitoring
- ✅ Automatic user input provision
- ✅ Manual user input provision (if needed)
- ✅ View execution results
- ✅ Navigate to detailed results
- ✅ Cancel running executions


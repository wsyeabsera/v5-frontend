'use client'

import { useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useGetTestRun, useGetOrchestration } from '@/lib/queries-v2'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, CheckCircle2, XCircle, Clock, ArrowLeft, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { PhaseTimeline } from './PhaseTimeline'
import { ExecutionSummary } from './ExecutionSummary'
import { FullOutput } from './FullOutput'
import { extractExecutionError } from './errorUtils'

interface ExecutionMonitorProps {
  executionId: string
  orchestratorExecutionId?: string | null
  onComplete: () => void
  onCancel: () => void
}

export function ExecutionMonitor({ executionId, orchestratorExecutionId: propOrchestratorExecutionId, onComplete, onCancel }: ExecutionMonitorProps) {
  const queryClient = useQueryClient()

  // Fetch test run data
  const { data: testRun, isLoading: isLoadingTestRun, error: testRunError } = useGetTestRun(executionId)

  // Handle response structure
  const run = testRun?.data || testRun
  const firstResult = run?.results?.[0]
  
  // Extract executionId from test result - safely handle if it's an object
  // Prefer the prop (from SSE events) over the test run data
  const orchestratorExecutionId = propOrchestratorExecutionId || (firstResult?.executionId
    ? (typeof firstResult.executionId === 'object' && firstResult.executionId !== null
        ? (firstResult.executionId as any).id || (firstResult.executionId as any)._id || String(firstResult.executionId)
        : String(firstResult.executionId))
    : null)

  // Fetch orchestrator execution data (no polling - use SSE for real-time updates)
  const {
    data: execution,
    isLoading: isLoadingExecution,
    error: executionError,
  } = useGetOrchestration(orchestratorExecutionId || '')

  const isRunning = run?.status === 'running'
  const isCompleted = run?.status === 'completed'
  const isFailed = run?.status === 'failed'
  
  // Determine test result status
  const testStatus = firstResult?.status || 'unknown'
  const testPassed = testStatus === 'passed'
  const testFailed = testStatus === 'failed' || testStatus === 'error' || testStatus === 'timeout'

  // Periodically invalidate queries to get updates while test is running
  // (The actual streaming happens in TestExecutionPanel, but we need to refresh data here)
  useEffect(() => {
    if (!isRunning) {
      return
    }

    // Refresh data every 3 seconds while test is running
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['test-run', executionId] })
      if (orchestratorExecutionId) {
        queryClient.invalidateQueries({ queryKey: ['orchestration', orchestratorExecutionId] })
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [isRunning, executionId, orchestratorExecutionId, queryClient])

  // Invalidate queries when test completes to get final results
  useEffect(() => {
    if (isCompleted || isFailed) {
      // Refresh test run data to get final results
      queryClient.invalidateQueries({ queryKey: ['test-run', executionId] })
      if (orchestratorExecutionId) {
        queryClient.invalidateQueries({ queryKey: ['orchestration', orchestratorExecutionId] })
      }
    }
  }, [isCompleted, isFailed, executionId, orchestratorExecutionId, queryClient])

  if (isLoadingTestRun && !run) {
    return (
      <Card className="p-12">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-3">Loading test run...</span>
        </div>
      </Card>
    )
  }

  if (testRunError) {
    const errorMessage = testRunError instanceof Error 
      ? testRunError.message 
      : typeof testRunError === 'object' && testRunError !== null && 'message' in testRunError
        ? String((testRunError as any).message)
        : String(testRunError)
    
    return (
      <Card className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Error loading test run: {errorMessage}</AlertDescription>
        </Alert>
        <Button onClick={onCancel} className="mt-4" variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </Card>
    )
  }

  if (!run) {
    return (
      <Card className="p-6">
        <Alert>
          <AlertDescription>Test run not found</AlertDescription>
        </Alert>
        <Button onClick={onCancel} className="mt-4" variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success/Failure Banner - Show prominently when test is complete */}
      {isCompleted && testPassed && (
        <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-300 dark:border-green-700">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <CheckCircle2 className="w-12 h-12 text-green-600 animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-1">
                ✓ Test Passed Successfully!
              </h3>
              <p className="text-green-600 dark:text-green-500">
                The test execution completed successfully. All checks passed.
              </p>
            </div>
            <Badge
              variant="default"
              className="text-lg px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold"
            >
              PASSED
            </Badge>
          </div>
        </Card>
      )}

      {isCompleted && testFailed && (
        <Card className="p-6 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-2 border-red-300 dark:border-red-700">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-red-700 dark:text-red-400 mb-1">
                ✗ Test Failed
              </h3>
              <p className="text-red-600 dark:text-red-500">
                The test execution did not meet the expected criteria.
              </p>
            </div>
            <Badge
              variant="destructive"
              className="text-lg px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              FAILED
            </Badge>
          </div>
        </Card>
      )}

      {/* Header Section */}
      <Card className={`p-6 ${testPassed ? 'border-green-200 dark:border-green-800' : testFailed ? 'border-red-200 dark:border-red-800' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {isRunning && <Clock className="w-6 h-6 text-blue-600 animate-pulse" />}
            {isCompleted && testPassed && <CheckCircle2 className="w-6 h-6 text-green-600" />}
            {(isFailed || testFailed) && <XCircle className="w-6 h-6 text-red-600" />}
            {isCompleted && !testPassed && !testFailed && <Clock className="w-6 h-6 text-gray-400" />}
            <div>
              <h2 className="text-2xl font-bold">Test Run: {run.runId}</h2>
              <p className="text-sm text-muted-foreground">
                Started: {new Date(run.startedAt).toLocaleString()}
                {run.completedAt && ` • Completed: ${new Date(run.completedAt).toLocaleString()}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {firstResult && (firstResult.status === 'passed' || firstResult.status === 'failed' || firstResult.status === 'error' || firstResult.status === 'timeout') && (
              <Badge
                variant={firstResult.status === 'passed' ? 'default' : 'destructive'}
                className={`text-base px-4 py-2 font-semibold ${
                  firstResult.status === 'passed' 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {firstResult.status === 'passed' ? '✓ PASSED' : firstResult.status === 'timeout' ? '⏱ TIMEOUT' : '✗ FAILED'}
              </Badge>
            )}
            <Badge variant={isRunning ? 'default' : isCompleted ? 'default' : 'destructive'}>
              {run.status}
            </Badge>
            <Button variant="outline" size="sm" onClick={onCancel}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </Card>

      {/* Execution-level error banner */}
      {execution && (execution.status === 'failed' || extractExecutionError(execution)) && (
        <Card className="p-6 border-2 border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20">
          <Alert variant="destructive">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="font-semibold">Execution Failed</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              {(() => {
                const execError = extractExecutionError(execution)
                if (execError) {
                  return (
                    <>
                      <div className="font-medium">{execError.message}</div>
                      {execError.code && (
                        <div className="text-sm">
                          Error Code: <code className="bg-background px-1 py-0.5 rounded text-xs">{execError.code}</code>
                        </div>
                      )}
                      {execError.stack && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm font-medium">Stack Trace</summary>
                          <pre className="mt-2 text-xs bg-background/50 p-3 rounded-md overflow-x-auto max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                            {execError.stack}
                          </pre>
                        </details>
                      )}
                    </>
                  )
                }
                const exec = execution?.data || execution
                return (
                  <>
                    <div className="font-medium">
                      {exec.executionMessage || 'Execution failed without detailed error information'}
                    </div>
                    {exec.executionCode && (
                      <div className="text-sm">
                        Error Code: <code className="bg-background px-1 py-0.5 rounded text-xs">{exec.executionCode}</code>
                      </div>
                    )}
                  </>
                )
              })()}
            </AlertDescription>
          </Alert>
        </Card>
      )}

      {/* Phase Timeline - Show orchestrator execution phases */}
      {orchestratorExecutionId && (
        <div>
          {isLoadingExecution && !execution ? (
            <Card className="p-6">
              <div className="flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
                <span>Loading execution phases...</span>
              </div>
            </Card>
              ) : executionError ? (
                <Card className="p-6">
                  <Alert variant="destructive">
                    <AlertDescription>
                      Error loading execution: {executionError instanceof Error 
                        ? executionError.message 
                        : typeof executionError === 'object' && executionError !== null && 'message' in executionError
                          ? String((executionError as any).message)
                          : String(executionError)}
                    </AlertDescription>
                  </Alert>
                </Card>
          ) : (
            <PhaseTimeline execution={execution} testRun={testRun} />
          )}
        </div>
      )}

      {/* Summary Section - Show when complete (always show for completed tests, not just failed) */}
      {isCompleted && (
        <ExecutionSummary testRun={testRun} execution={execution} />
      )}

      {/* Full Output Section - Show when complete */}
      {isCompleted && (
        <FullOutput testRun={testRun} execution={execution} />
      )}

      {/* Show message if no execution ID yet */}
      {!orchestratorExecutionId && isRunning && (
        <Card className="p-6">
          <Alert>
            <AlertDescription>
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Test run created. Waiting for orchestrator execution to start... This usually takes a few seconds.</span>
              </div>
            </AlertDescription>
          </Alert>
        </Card>
      )}
    </div>
  )
}

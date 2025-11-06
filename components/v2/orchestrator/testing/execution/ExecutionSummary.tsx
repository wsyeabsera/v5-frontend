'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Clock, TrendingUp, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { extractExecutionError, extractPhaseErrors, formatError, type ExtractedError } from './errorUtils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface ExecutionSummaryProps {
  testRun: any
  execution?: any
}

export function ExecutionSummary({ testRun, execution }: ExecutionSummaryProps) {
  if (!testRun) return null

  const run = testRun?.data || testRun
  const exec = execution?.data || execution
  const firstResult = run.results?.[0]

  const successRate = run.summary?.total
    ? ((run.summary.passed / run.summary.total) * 100).toFixed(1)
    : '0'

  const isCompleted = run.status === 'completed'
  const isFailed = run.status === 'failed'
  
  // Determine test result status
  const testStatus = firstResult?.status || 'unknown'
  const testPassed = testStatus === 'passed'
  const testFailed = testStatus === 'failed' || testStatus === 'error' || testStatus === 'timeout'
  
  // Get user input information
  const userInputsProvided = firstResult?.userInputsProvided ?? 0
  const userInputsRequired = firstResult?.userInputsRequired ?? 0
  const userInputsConfigured = firstResult?.userInputsConfigured ?? 0
  // If inputs were configured but never required, show configured count
  const displayRequired = userInputsRequired > 0 ? userInputsRequired : userInputsConfigured
  const allInputsProvided = userInputsRequired > 0 
    ? userInputsProvided >= userInputsRequired 
    : userInputsConfigured > 0 
      ? userInputsProvided >= userInputsConfigured 
      : true

  return (
    <Card className={`p-8 border-2 shadow-lg ${
      testPassed 
        ? 'bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 dark:from-green-950/30 dark:via-emerald-950/30 dark:to-green-950/40 border-green-300 dark:border-green-700' 
        : testFailed
        ? 'bg-gradient-to-br from-red-50 via-rose-50 to-red-100 dark:from-red-950/30 dark:via-rose-950/30 dark:to-red-950/40 border-red-300 dark:border-red-700'
        : 'bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950/20 dark:to-blue-950/20'
    }`}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          {testPassed && <CheckCircle2 className="w-12 h-12 text-green-600 animate-pulse" />}
          {testFailed && <XCircle className="w-12 h-12 text-red-600" />}
          <div>
            <h3 className="text-3xl font-bold mb-2">Execution Summary</h3>
            {testPassed && (
              <p className="text-lg text-green-700 dark:text-green-400 font-semibold">
                ✓ Test Passed Successfully - All checks completed
              </p>
            )}
            {testFailed && (
              <p className="text-lg text-red-700 dark:text-red-400 font-semibold">
                ✗ Test Failed - Review details below
              </p>
            )}
            {!testPassed && !testFailed && (
              <p className="text-lg text-muted-foreground font-medium">
                Test completed with status: {testStatus}
              </p>
            )}
          </div>
        </div>
        <Badge
          variant={testPassed ? 'default' : 'destructive'}
          className={`text-xl px-6 py-3 font-bold shadow-md ${
            testPassed 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {testPassed ? '✓ PASSED' : testFailed ? '✗ FAILED' : testStatus.toUpperCase()}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-background/50 p-4 rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">Total Tests</div>
          <div className="text-3xl font-bold">{run.summary?.total || 0}</div>
        </div>
        <div className="bg-background/50 p-4 rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">Passed</div>
          <div className="text-3xl font-bold text-green-600">{run.summary?.passed || 0}</div>
        </div>
        <div className="bg-background/50 p-4 rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">Failed</div>
          <div className="text-3xl font-bold text-red-600">{run.summary?.failed || 0}</div>
        </div>
        <div className="bg-background/50 p-4 rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">Success Rate</div>
          <div className="text-3xl font-bold">{successRate}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {run.summary?.averageLatency && (
          <div className="bg-background/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Average Latency</div>
            </div>
            <div className="text-2xl font-bold">
              {Math.round(run.summary.averageLatency)}ms
            </div>
          </div>
        )}

        {firstResult?.metrics?.tokenUsage && (
          <div className="bg-background/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Token Usage</div>
            </div>
            <div className="text-2xl font-bold">
              {firstResult.metrics.tokenUsage.total || 0} tokens
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {firstResult.metrics.tokenUsage.input || 0} in /{' '}
              {firstResult.metrics.tokenUsage.output || 0} out
            </div>
          </div>
        )}

        {firstResult?.confidence !== undefined && (
          <div className="bg-background/50 p-4 rounded-lg">
            <div className="text-sm text-muted-foreground mb-2">Confidence Score</div>
            <div className="text-2xl font-bold">{firstResult.confidence}%</div>
          </div>
        )}

        <div className={`bg-background/50 p-4 rounded-lg border-2 ${
          allInputsProvided 
            ? 'border-green-200 dark:border-green-800' 
            : 'border-yellow-200 dark:border-yellow-800'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">User Inputs</div>
            {allInputsProvided && userInputsRequired > 0 && (
              <Badge variant="default" className="bg-green-600 text-xs">All Provided</Badge>
            )}
            {!allInputsProvided && userInputsRequired > 0 && (
              <Badge variant="outline" className="border-yellow-600 text-yellow-600 text-xs">
                Missing Inputs
              </Badge>
            )}
          </div>
          <div className="text-2xl font-bold">
            {userInputsProvided} / {displayRequired}
          </div>
          {userInputsRequired > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              {allInputsProvided 
                ? '✓ All required inputs were provided' 
                : `⚠ Missing ${userInputsRequired - userInputsProvided} input(s)`}
            </div>
          )}
          {userInputsRequired === 0 && userInputsConfigured > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              {userInputsProvided > 0 
                ? `✓ ${userInputsProvided} of ${userInputsConfigured} configured input(s) were provided (not required during execution)` 
                : `${userInputsConfigured} input(s) configured but not required during execution`}
            </div>
          )}
          {userInputsRequired === 0 && userInputsConfigured === 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              No user inputs configured for this test
            </div>
          )}
        </div>
      </div>

      {exec?.results?.summary && (
        <div className="mt-6">
          <div className="text-sm font-medium mb-2">Quick Summary</div>
          <div className="bg-background/50 p-4 rounded-lg">
            <p className="text-sm whitespace-pre-wrap">{exec.results.summary}</p>
          </div>
        </div>
      )}

      {/* Error Details Section - Show prominently when there are errors */}
      {(firstResult?.error || exec?.results?.error || exec?.executionCode) && (
        <div className="mt-6">
          <Card className="p-6 border-2 border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h4 className="text-lg font-semibold text-red-700 dark:text-red-400">Error Details</h4>
            </div>
            
            <div className="space-y-4">
              {/* Test Result Error */}
              {firstResult?.error && (
                <div>
                  <div className="text-sm font-medium mb-2">Test Execution Error:</div>
                  <Alert variant="destructive">
                    <AlertDescription>
                      <div className="space-y-2">
                        <div className="font-medium">
                          {typeof firstResult.error === 'string'
                            ? firstResult.error
                            : typeof firstResult.error === 'object' && firstResult.error !== null && 'message' in firstResult.error
                              ? String((firstResult.error as any).message)
                              : JSON.stringify(firstResult.error)}
                        </div>
                        {typeof firstResult.error === 'object' && firstResult.error !== null && 'phase' in firstResult.error && (
                          <div className="text-xs text-muted-foreground">
                            Failed Phase: <strong>{String((firstResult.error as any).phase)}</strong>
                          </div>
                        )}
                        {typeof firstResult.error === 'object' && firstResult.error !== null && 'stack' in firstResult.error && (
                          <ErrorStackTrace stack={String((firstResult.error as any).stack)} />
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Execution-level Error */}
              {(() => {
                const execError = extractExecutionError(execution)
                if (execError) {
                  return (
                    <div>
                      <div className="text-sm font-medium mb-2">Orchestrator Execution Error:</div>
                      <Alert variant="destructive">
                        <AlertDescription>
                          <div className="space-y-2">
                            <div className="font-medium">{formatError(execError)}</div>
                            {execError.code && (
                              <div className="text-xs text-muted-foreground">
                                Error Code: <code className="bg-background px-1 py-0.5 rounded">{execError.code}</code>
                              </div>
                            )}
                            {execError.stack && (
                              <ErrorStackTrace stack={execError.stack} />
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    </div>
                  )
                }
                return null
              })()}

              {/* Phase-specific Errors */}
              {(() => {
                const phaseErrors = extractPhaseErrors(execution)
                const errorPhases = Object.entries(phaseErrors).filter(([_, error]) => error !== null)
                if (errorPhases.length > 0) {
                  return (
                    <div>
                      <div className="text-sm font-medium mb-2">Phase-Specific Errors:</div>
                      <div className="space-y-2">
                        {errorPhases.map(([phaseId, error]) => (
                          error && (
                            <Alert key={phaseId} variant="destructive">
                              <AlertDescription>
                                <div className="space-y-2">
                                  <div className="font-medium">
                                    <strong>{phaseId.charAt(0).toUpperCase() + phaseId.slice(1)} Phase:</strong> {formatError(error)}
                                  </div>
                                  {error.code && (
                                    <div className="text-xs text-muted-foreground">
                                      Error Code: <code className="bg-background px-1 py-0.5 rounded">{error.code}</code>
                                    </div>
                                  )}
                                  {error.stack && (
                                    <ErrorStackTrace stack={error.stack} />
                                  )}
                                </div>
                              </AlertDescription>
                            </Alert>
                          )
                        ))}
                      </div>
                    </div>
                  )
                }
                return null
              })()}

              {/* Execution Code and Message */}
              {exec?.executionCode && exec.executionCode !== 'ORCHESTRATION_SUCCESS' && (
                <div>
                  <div className="text-sm font-medium mb-2">Execution Status:</div>
                  <div className="space-y-1 text-sm">
                    <div>
                      <strong>Code:</strong> <code className="bg-background px-1 py-0.5 rounded text-xs">{exec.executionCode}</code>
                    </div>
                    {exec.executionMessage && (
                      <div>
                        <strong>Message:</strong> {exec.executionMessage}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Test Result Details */}
      <div className={`mt-6 p-4 rounded-lg border-2 ${
        testPassed 
          ? 'bg-green-100/50 dark:bg-green-900/20 border-green-300 dark:border-green-700' 
          : testFailed
          ? 'bg-red-100/50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
          : 'bg-background/50'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Test Result:</span>
          <Badge
            variant={testPassed ? 'default' : 'destructive'}
            className={`text-sm ${
              testPassed ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {testStatus.toUpperCase()}
          </Badge>
        </div>
        {firstResult?.actualOutcome && (
          <div className="mt-2 text-sm">
            <strong>Outcome:</strong>{' '}
            {firstResult.actualOutcome.success ? (
              <span className="text-green-700 dark:text-green-400">Success</span>
            ) : (
              <span className="text-red-700 dark:text-red-400">Failed</span>
            )}
            {firstResult.actualOutcome.executionMessage && (
              <div className="mt-1 text-muted-foreground">
                {typeof firstResult.actualOutcome.executionMessage === 'string'
                  ? firstResult.actualOutcome.executionMessage
                  : typeof firstResult.actualOutcome.executionMessage === 'object' && firstResult.actualOutcome.executionMessage !== null && 'message' in firstResult.actualOutcome.executionMessage
                    ? String((firstResult.actualOutcome.executionMessage as any).message)
                    : JSON.stringify(firstResult.actualOutcome.executionMessage)}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

// Helper component for stack trace display
function ErrorStackTrace({ stack }: { stack: string }) {
  const [showStack, setShowStack] = useState(false)
  
  return (
    <Collapsible open={showStack} onOpenChange={setShowStack}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 text-xs mt-2">
          {showStack ? (
            <>
              <ChevronUp className="w-3 h-3 mr-1" />
              Hide Stack Trace
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3 mr-1" />
              Show Stack Trace
            </>
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="mt-2 text-xs bg-background/50 p-3 rounded-md overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap border border-destructive/20">
          {stack}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  )
}


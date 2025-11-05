'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAgentConfigsV2 } from '@/lib/queries-v2'
import { useRunBenchmarkTest, useListBenchmarkTests } from '@/lib/queries-intelligence/benchmarks'
import { useQueryClient } from '@tanstack/react-query'
import { BenchmarkTestDialog } from './BenchmarkTestDialog'
import { BenchmarkTestFilters } from './BenchmarkTestFilters'
import { PaginationControls } from '@/components/v2/shared/PaginationControls'
import { Loader2, Play, Eye, AlertCircle, Plus } from 'lucide-react'

export function BenchmarkTestList() {
  const [selectedTest, setSelectedTest] = useState<any>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewTest, setViewTest] = useState<any>(null)
  const [recentRunResults, setRecentRunResults] = useState<Array<{ testId: string; result: any; timestamp: Date }>>([])
  const [filters, setFilters] = useState<{
    category?: string
    tags?: string[]
    priority?: 'critical' | 'high' | 'medium' | 'low'
    limit?: number
    skip?: number
  }>({ limit: 50, skip: 0 })

  const queryClient = useQueryClient()
  const { data: agentConfigs } = useAgentConfigsV2()
  const runTest = useRunBenchmarkTest()
  const { data: testsData, isLoading, error } = useListBenchmarkTests(filters)
  
  // Handle paginated response format
  const tests = testsData?.tests || []
  const pagination = testsData
    ? {
        total: testsData.total || 0,
        limit: testsData.limit || filters.limit || 50,
        skip: testsData.skip || filters.skip || 0,
        hasMore: testsData.hasMore || false,
      }
    : null

  const handleRunTest = async (testId: string) => {
    if (!agentConfigs || !Array.isArray(agentConfigs) || agentConfigs.length === 0) {
      alert('Please configure an agent first in Settings')
      return
    }

    const agentConfigId = agentConfigs[0]._id || agentConfigs[0].id
    if (!agentConfigId) {
      alert('Invalid agent configuration')
      return
    }

    try {
      const result = await runTest.mutateAsync({ testId, agentConfigId })
      
      // Log the response for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('run_benchmark_test response:', result)
        console.log('Response structure:', {
          hasRunId: 'runId' in (result || {}),
          hasId: 'id' in (result || {}),
          hasTestId: 'testId' in (result || {}),
          keys: result ? Object.keys(result) : [],
          fullResult: result
        })
      }
      
      // Store the immediate result in component state
      if (result) {
        setRecentRunResults(prev => [
          { testId, result, timestamp: new Date() },
          ...prev.slice(0, 9) // Keep last 10 results
        ])
        
        // Also store in React Query cache for BenchmarkRunList to access
        // Convert BenchmarkTestResult to BenchmarkRun format
        // Actual response format: { runId, testId, status, matchesExpected, metrics: { executionTime, stepsCompleted, ... }, error?, message? }
        const runId = (result as any).runId || (result as any).id || `temp-${Date.now()}`
        const testName = tests.find(t => (t.testId || t._id) === ((result as any).testId || testId))?.name || (result as any).testName || testId
        const now = new Date().toISOString()
        
        const convertedRun = {
          _id: runId,
          runId: runId,
          testId: (result as any).testId || testId,
          testName: testName,
          execution: {
            taskId: (result as any).taskId || '',
            planId: (result as any).planId || '',
            agentConfigId: agentConfigId,
            startedAt: (result as any).startedAt || now,
            completedAt: (result as any).completedAt || now,
            duration: (result as any).metrics?.executionTime || 0,
          },
          result: {
            status: mapStatusToRunStatus((result as any).status),
            matchesExpected: (result as any).matchesExpected !== false,
            error: (result as any).error || undefined,
          },
          metrics: {
            executionTime: (result as any).metrics?.executionTime || 0,
            stepsCompleted: (result as any).metrics?.stepsCompleted || 0,
            stepsExpected: (result as any).metrics?.stepsExpected || 0,
            retries: (result as any).metrics?.retries || 0,
            tokenUsage: (result as any).metrics?.tokenUsage?.toString() || undefined,
          },
          createdAt: now,
        }
        
        // Update the cache with the new run (use default filters key)
        const defaultFilters = { limit: 50, skip: 0 }
        queryClient.setQueryData(['v2', 'intelligence', 'benchmarks', 'runs', defaultFilters], (oldData: any) => {
          if (!oldData) {
            const newData = {
              runs: [convertedRun],
              total: 1,
              limit: 50,
              skip: 0,
              hasMore: false,
            }
            if (process.env.NODE_ENV === 'development') {
              console.log('[BenchmarkTestList] Setting cache with new run:', newData)
            }
            return newData
          }
          
          // Check if run already exists
          const existingIndex = oldData.runs.findIndex((r: any) => (r.runId || r._id) === runId)
          if (existingIndex >= 0) {
            // Update existing
            const updated = [...oldData.runs]
            updated[existingIndex] = convertedRun
            const newData = { ...oldData, runs: updated }
            if (process.env.NODE_ENV === 'development') {
              console.log('[BenchmarkTestList] Updating existing run in cache:', newData)
            }
            return newData
          } else {
            // Add new run at the beginning
            const newData = {
              ...oldData,
              runs: [convertedRun, ...oldData.runs],
              total: (oldData.total || oldData.runs.length) + 1,
            }
            if (process.env.NODE_ENV === 'development') {
              console.log('[BenchmarkTestList] Adding new run to cache:', newData)
            }
            return newData
          }
        })
        
        // Also update all existing cache entries to include this run
        const queryCache = queryClient.getQueryCache()
        queryCache.getAll().forEach((query) => {
          if (query.queryKey[0] === 'v2' && 
              query.queryKey[1] === 'intelligence' && 
              query.queryKey[2] === 'benchmarks' && 
              query.queryKey[3] === 'runs') {
            const queryFilters = query.queryKey[4] as any
            if (queryFilters && typeof queryFilters === 'object') {
              queryClient.setQueryData(query.queryKey, (oldData: any) => {
                if (!oldData) return oldData
                const existingIndex = oldData.runs?.findIndex((r: any) => (r.runId || r._id) === runId)
                if (existingIndex >= 0) {
                  const updated = [...oldData.runs]
                  updated[existingIndex] = convertedRun
                  return { ...oldData, runs: updated }
                } else {
                  return {
                    ...oldData,
                    runs: [convertedRun, ...(oldData.runs || [])],
                    total: (oldData.total || 0) + 1,
                  }
                }
              })
            }
          }
        })
        
        // Store in localStorage as backup (survives invalidations)
        try {
          const storedRuns = JSON.parse(localStorage.getItem('benchmark_runs_immediate') || '[]')
          const existingIndex = storedRuns.findIndex((r: any) => (r.runId || r._id) === runId)
          if (existingIndex >= 0) {
            storedRuns[existingIndex] = convertedRun
          } else {
            storedRuns.unshift(convertedRun)
            // Keep only last 100 runs
            if (storedRuns.length > 100) {
              storedRuns.splice(100)
            }
          }
          localStorage.setItem('benchmark_runs_immediate', JSON.stringify(storedRuns))
          // Trigger storage event for same-tab listeners
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'benchmark_runs_immediate',
            newValue: JSON.stringify(storedRuns),
            storageArea: localStorage,
          }))
          if (process.env.NODE_ENV === 'development') {
            console.log('[BenchmarkTestList] Stored run in localStorage:', convertedRun)
          }
        } catch (e) {
          console.warn('Failed to store run in localStorage:', e)
        }
        
        // Trigger a refetch of the runs query to update the UI
        queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'benchmarks', 'runs'] })
      }
      
      alert('Test completed! Check Results tab to see the results.')
    } catch (error) {
      console.error('Failed to run test:', error)
      alert('Failed to run test: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleEdit = (test: any) => {
    setSelectedTest(test)
    setDialogOpen(true)
  }

  const handleView = (test: any) => {
    setViewTest(test)
  }

  if (isLoading) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin opacity-50" />
        <p className="text-muted-foreground">Loading benchmark tests...</p>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive opacity-50" />
        <p className="text-muted-foreground mb-2">Failed to load benchmark tests</p>
        <p className="text-sm text-muted-foreground mb-4">
          {error instanceof Error ? error.message : 'Unknown error occurred'}
        </p>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Test
        </Button>
      </Card>
    )
  }

  const handleLoadMore = () => {
    setFilters({
      ...filters,
      skip: (filters.skip || 0) + (filters.limit || 50),
    })
  }

  // Helper function to map status from BenchmarkTestResult to BenchmarkRun status
  const mapStatusToRunStatus = (status: string): 'passed' | 'failed' | 'timeout' | 'error' => {
    if (!status) return 'failed'
    const statusLower = status.toLowerCase()
    if (statusLower === 'success' || statusLower === 'passed') return 'passed'
    if (statusLower === 'failure' || statusLower === 'failed') return 'failed'
    if (statusLower === 'timeout') return 'timeout'
    if (statusLower === 'error') return 'error'
    return 'failed'
  }

  // Get test names for recent runs
  const getTestName = (testId: string) => {
    const test = tests.find(t => (t.testId || t._id) === testId)
    return test?.name || testId
  }

  return (
    <div className="space-y-4">
      <BenchmarkTestFilters filters={filters} onFiltersChange={setFilters} />

      {/* Display recent run results if any */}
      {recentRunResults.length > 0 && (
        <Card className="p-4 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <h3 className="font-semibold mb-3 text-sm">Recent Test Executions</h3>
          <div className="space-y-2">
            {recentRunResults.map((runResult, idx) => (
              <div key={idx} className="text-sm p-2 bg-background rounded border">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{getTestName(runResult.testId)}</span>
                    <span className="text-muted-foreground ml-2">
                      ({new Date(runResult.timestamp).toLocaleTimeString()})
                    </span>
                  </div>
                  {runResult.result?.status && (
                    <Badge variant={runResult.result.status === 'success' ? 'default' : 'destructive'}>
                      {runResult.result.status}
                    </Badge>
                  )}
                </div>
                {runResult.result?.duration && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Duration: {runResult.result.duration}ms
                  </div>
                )}
                {process.env.NODE_ENV === 'development' && (
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer text-muted-foreground">Debug Info</summary>
                    <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-auto max-h-40">
                      {JSON.stringify(runResult.result, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {!tests || tests.length === 0 ? (
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground mb-4">No benchmark tests found</p>
          <p className="text-sm text-muted-foreground mb-4">
            {filters.category || filters.priority || filters.tags?.length
              ? 'Try adjusting your filters or create a new test.'
              : 'Create benchmark tests to track agent performance and detect regressions.'}
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Test
          </Button>
        </Card>
      ) : (
        <>
          {tests.map((test: any) => (
            <Card key={test._id || test.testId || test.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{test.name}</h3>
                    <Badge variant="outline">{test.category}</Badge>
                    <Badge
                      variant={
                        test.priority === 'critical' || test.priority === 'high'
                          ? 'destructive'
                          : test.priority === 'medium'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {test.priority}
                    </Badge>
                    {test.tags && test.tags.length > 0 && (
                      <div className="flex gap-1">
                        {test.tags.slice(0, 3).map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{test.description}</p>
                  <div className="text-xs text-muted-foreground">
                    Expected: {test.test?.expectedOutcome?.type || test.expectedOutcome?.type || 'success'}
                    {test.test?.expectedOutcome?.maxDuration && (
                      <> in {test.test.expectedOutcome.maxDuration}ms</>
                    )}
                  </div>
                  {test.createdAt && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Created: {new Date(test.createdAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRunTest(test.testId || test.id)}
                    disabled={runTest.isPending}
                  >
                    {runTest.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Run
                      </>
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleView(test)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {pagination && pagination.hasMore && (
            <div className="pt-4">
              <PaginationControls
                {...pagination}
                onLoadMore={handleLoadMore}
                showLoadMore={true}
              />
            </div>
          )}
        </>
      )}

      <BenchmarkTestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        test={selectedTest}
      />
    </div>
  )
}


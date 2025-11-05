'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useBenchmarkRuns } from '@/lib/queries-intelligence/benchmarks'
import { BenchmarkRunFilters } from './BenchmarkRunFilters'
import { PaginationControls } from '@/components/v2/shared/PaginationControls'
import { Loader2, AlertCircle, Eye, RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

export function BenchmarkRunList() {
  const [filters, setFilters] = useState<{
    testId?: string
    status?: 'passed' | 'failed' | 'timeout' | 'error'
    agentConfigId?: string
    startDate?: string
    endDate?: string
    limit?: number
    skip?: number
  }>({ limit: 50, skip: 0 })
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [localStorageRuns, setLocalStorageRuns] = useState<any[]>([])
  const [cacheVersion, setCacheVersion] = useState(0)

  const queryClient = useQueryClient()
  const { data: runsData, isLoading, error, refetch } = useBenchmarkRuns(filters)
  
  // Subscribe to localStorage changes and cache updates
  useEffect(() => {
    const loadLocalStorageRuns = () => {
      try {
        const stored = localStorage.getItem('benchmark_runs_immediate')
        if (stored) {
          const parsed = JSON.parse(stored)
          setLocalStorageRuns(Array.isArray(parsed) ? parsed : [])
        } else {
          setLocalStorageRuns([])
        }
      } catch (e) {
        console.warn('Failed to read runs from localStorage:', e)
        setLocalStorageRuns([])
      }
    }
    
    // Load initially
    loadLocalStorageRuns()
    
    // Listen for storage events (from other tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'benchmark_runs_immediate') {
        loadLocalStorageRuns()
      }
    }
    window.addEventListener('storage', handleStorageChange)
    
    // Poll for changes (in case same-tab updates don't trigger storage events)
    const interval = setInterval(() => {
      loadLocalStorageRuns()
    }, 1000)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])
  
  // Subscribe to cache changes
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      setCacheVersion(v => v + 1)
    })
    return unsubscribe
  }, [queryClient])

  // Debug: log what we're getting
  if (runsData && process.env.NODE_ENV === 'development') {
    console.log('BenchmarkRunList - runsData:', runsData)
  }

  // Get immediate results from cache (for runs created by run_benchmark_test)
  // Use useMemo to recompute when cache or localStorage changes
  const mergedRuns = useMemo(() => {
    // Try to get from default filters cache first
    const defaultFilters = { limit: 50, skip: 0 }
    const cachedData = queryClient.getQueryData(['v2', 'intelligence', 'benchmarks', 'runs', defaultFilters]) as any
    const cachedRuns = cachedData?.runs || []
    
    // Also check if there's a cache entry for current filters
    const currentCacheData = queryClient.getQueryData(['v2', 'intelligence', 'benchmarks', 'runs', filters]) as any
    const currentCachedRuns = currentCacheData?.runs || []
    
    // Merge cached runs (immediate results) with API runs
    const apiRuns = runsData?.runs || []
    const allCachedRuns = [...cachedRuns, ...currentCachedRuns, ...localStorageRuns]
    const allRuns = [...allCachedRuns, ...apiRuns]
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('[BenchmarkRunList] Cache check:', {
        defaultCache: cachedRuns.length,
        currentCache: currentCachedRuns.length,
        localStorage: localStorageRuns.length,
        apiRuns: apiRuns.length,
        totalMerged: allRuns.length,
        cacheVersion,
      })
    }
    
    return allRuns
  }, [runsData, localStorageRuns, filters, queryClient, cacheVersion])
  
  // Remove duplicates by runId
  const uniqueRuns = mergedRuns.reduce((acc: any[], run: any) => {
    const runId = run.runId || run._id
    if (!acc.find(r => (r.runId || r._id) === runId)) {
      acc.push(run)
    }
    return acc
  }, [])
  
  // Apply filters to the merged list
  let runs = uniqueRuns
  if (filters.testId) {
    runs = runs.filter(r => (r.testId || r.test?.testId) === filters.testId)
  }
  if (filters.status) {
    runs = runs.filter(r => (r.result?.status || r.status) === filters.status)
  }
  if (filters.agentConfigId) {
    runs = runs.filter(r => (r.execution?.agentConfigId || r.agentConfigId) === filters.agentConfigId)
  }
  if (filters.startDate) {
    const startDate = new Date(filters.startDate)
    runs = runs.filter(r => {
      const runDate = new Date(r.execution?.startedAt || r.createdAt || r.timestamp)
      return runDate >= startDate
    })
  }
  if (filters.endDate) {
    const endDate = new Date(filters.endDate)
    runs = runs.filter(r => {
      const runDate = new Date(r.execution?.startedAt || r.createdAt || r.timestamp)
      return runDate <= endDate
    })
  }
  
  // Sort by most recent first
  runs.sort((a, b) => {
    const dateA = new Date(a.execution?.startedAt || a.createdAt || a.timestamp || 0).getTime()
    const dateB = new Date(b.execution?.startedAt || b.createdAt || b.timestamp || 0).getTime()
    return dateB - dateA
  })
  // Update pagination to reflect merged results
  const pagination = {
    total: runs.length,
    limit: filters.limit || 50,
    skip: filters.skip || 0,
    hasMore: runs.length > (filters.skip || 0) + (filters.limit || 50),
  }
  
  // Apply pagination
  const paginatedRuns = runs.slice(filters.skip || 0, (filters.skip || 0) + (filters.limit || 50))

  const handleLoadMore = () => {
    setFilters({
      ...filters,
      skip: (filters.skip || 0) + (filters.limit || 50),
    })
  }

  const handleRefresh = async () => {
    await refetch()
    setLastRefresh(new Date())
    queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'benchmarks', 'runs'] })
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'passed':
        return 'default'
      case 'failed':
        return 'destructive'
      case 'timeout':
        return 'destructive'
      case 'error':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  if (isLoading) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin opacity-50" />
        <p className="text-muted-foreground">Loading benchmark runs...</p>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive opacity-50" />
        <p className="text-muted-foreground mb-2">Failed to load benchmark runs</p>
        <p className="text-sm text-muted-foreground mb-2">
          {error instanceof Error ? error.message : 'Unknown error occurred'}
        </p>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-muted-foreground">Debug Info</summary>
            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
              {JSON.stringify({ error, runsData, filters }, null, 2)}
            </pre>
          </details>
        )}
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <BenchmarkRunFilters filters={filters} onFiltersChange={setFilters} />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {lastRefresh && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Last refreshed: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {paginatedRuns.length === 0 ? (
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground mb-2">No benchmark runs found</p>
          <p className="text-sm text-muted-foreground mb-4">
            {filters.testId || filters.status || filters.startDate
              ? 'Try adjusting your filters or run a new test.'
              : 'Run a benchmark test to see results here. Run records may take a moment to appear after execution.'}
          </p>
          <Button onClick={handleRefresh} variant="outline" disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {process.env.NODE_ENV === 'development' && runsData && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-muted-foreground">Debug Info</summary>
              <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                {JSON.stringify({ runsData, filters, total: runsData.total }, null, 2)}
              </pre>
            </details>
          )}
        </Card>
      ) : (
        <>
          {paginatedRuns.map((run: any) => (
            <Card key={run._id || run.runId} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{run.testName || run.testId}</h3>
                    <Badge variant={getStatusBadgeVariant(run.result?.status)}>
                      {run.result?.status}
                    </Badge>
                    {run.result?.matchesExpected !== undefined && (
                      <Badge variant={run.result.matchesExpected ? 'default' : 'destructive'}>
                        {run.result.matchesExpected ? 'Matches Expected' : 'Does Not Match'}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground mb-2">
                    <div>
                      <span className="font-medium">Duration:</span> {run.metrics?.executionTime || run.execution?.duration || 'N/A'}ms
                    </div>
                    <div>
                      <span className="font-medium">Steps:</span> {run.metrics?.stepsCompleted || 0}/{run.metrics?.stepsExpected || 0}
                    </div>
                    <div>
                      <span className="font-medium">Retries:</span> {run.metrics?.retries || 0}
                    </div>
                    {run.metrics?.tokenUsage && (
                      <div>
                        <span className="font-medium">Tokens:</span> {run.metrics.tokenUsage}
                      </div>
                    )}
                  </div>
                  {run.execution?.startedAt && (
                    <div className="text-xs text-muted-foreground">
                      Started: {new Date(run.execution.startedAt).toLocaleString()}
                    </div>
                  )}
                  {run.result?.error && (
                    <div className="text-sm text-destructive mt-2">
                      Error: {run.result.error}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
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
    </div>
  )
}


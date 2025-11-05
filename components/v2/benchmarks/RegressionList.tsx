'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRegressions } from '@/lib/queries-intelligence/benchmarks'
import { RegressionFilters } from './RegressionFilters'
import { PaginationControls } from '@/components/v2/shared/PaginationControls'
import { Loader2, AlertCircle, Eye, AlertTriangle, RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

export function RegressionList() {
  const [filters, setFilters] = useState<{
    testId?: string
    severity?: 'critical' | 'high' | 'medium' | 'low'
    resolved?: boolean
    startDate?: string
    endDate?: string
    limit?: number
    skip?: number
  }>({ limit: 50, skip: 0, resolved: false })
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const queryClient = useQueryClient()
  const { data: regressionsData, isLoading, error, refetch } = useRegressions(filters)

  // Debug: log what we're getting
  if (regressionsData && process.env.NODE_ENV === 'development') {
    console.log('RegressionList - regressionsData:', regressionsData)
  }

  const regressions = regressionsData?.regressions || []
  const pagination = regressionsData
    ? {
        total: regressionsData.total || 0,
        limit: regressionsData.limit || filters.limit || 50,
        skip: regressionsData.skip || filters.skip || 0,
        hasMore: regressionsData.hasMore || false,
      }
    : null

  const handleLoadMore = () => {
    setFilters({
      ...filters,
      skip: (filters.skip || 0) + (filters.limit || 50),
    })
  }

  const handleRefresh = async () => {
    await refetch()
    setLastRefresh(new Date())
    queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'benchmarks', 'regressions'] })
  }

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive'
      case 'high':
        return 'destructive'
      case 'medium':
        return 'default'
      case 'low':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  if (isLoading) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin opacity-50" />
        <p className="text-muted-foreground">Loading regressions...</p>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive opacity-50" />
        <p className="text-muted-foreground mb-2">Failed to load regressions</p>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'Unknown error occurred'}
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <RegressionFilters filters={filters} onFiltersChange={setFilters} />
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

      {regressions.length === 0 ? (
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground mb-2">No regressions detected</p>
          <p className="text-sm text-muted-foreground mb-4">
            {filters.testId || filters.severity || filters.resolved !== undefined
              ? 'Try adjusting your filters or run more tests to detect regressions.'
              : 'Regressions will appear here when detected. Run multiple benchmark tests to compare performance over time.'}
          </p>
          <Button onClick={handleRefresh} variant="outline" disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {process.env.NODE_ENV === 'development' && regressionsData && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-muted-foreground">Debug Info</summary>
              <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                {JSON.stringify({ regressionsData, filters, total: regressionsData.total }, null, 2)}
              </pre>
            </details>
          )}
        </Card>
      ) : (
        <>
          {regressions.map((regression: any) => (
            <Card
              key={regression._id || regression.regressionId}
              className={`p-4 ${!regression.resolved ? 'border-l-4 border-l-destructive' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {!regression.resolved && (
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                    )}
                    <h3 className="font-semibold">{regression.testName || regression.testId}</h3>
                    <Badge variant={getSeverityVariant(regression.severity)}>
                      {regression.severity}
                    </Badge>
                    {regression.resolved && (
                      <Badge variant="outline">Resolved</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-2">
                    <div>
                      <span className="font-medium">Baseline Duration:</span>{' '}
                      {regression.baseline?.duration || 'N/A'}ms
                    </div>
                    <div>
                      <span className="font-medium">Current Duration:</span>{' '}
                      {regression.current?.duration || 'N/A'}ms
                    </div>
                    <div className={regression.delta?.durationDelta > 0 ? 'text-destructive' : 'text-muted-foreground'}>
                      <span className="font-medium">Delta:</span>{' '}
                      {regression.delta?.durationDelta > 0 ? '+' : ''}
                      {regression.delta?.durationDelta || 0}ms
                    </div>
                  </div>
                  {regression.delta?.statusChanged && (
                    <div className="text-sm text-destructive mb-2">
                      Status changed from {regression.baseline?.status} to {regression.current?.status}
                    </div>
                  )}
                  {regression.detectedAt && (
                    <div className="text-xs text-muted-foreground">
                      Detected: {new Date(regression.detectedAt).toLocaleString()}
                    </div>
                  )}
                  {regression.resolved && regression.resolvedAt && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Resolved: {new Date(regression.resolvedAt).toLocaleString()}
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


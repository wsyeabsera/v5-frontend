'use client'

import { useState, useMemo } from 'react'
import { usePerformanceMetrics } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { PerformanceDashboard } from './PerformanceDashboard'

type SortField = 'timestamp' | 'latency' | 'confidence' | 'quality' | 'tokens' | 'cost'
type SortDirection = 'asc' | 'desc'

export function PerformanceMetricsList() {
  const [orchestratorId, setOrchestratorId] = useState('')
  const [executionId, setExecutionId] = useState('')
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const filters: any = {}
  if (orchestratorId.trim()) filters.orchestratorId = orchestratorId.trim()
  if (executionId.trim()) filters.executionId = executionId.trim()

  const { data: metrics, isLoading, error } = usePerformanceMetrics(
    Object.keys(filters).length > 0 ? filters : undefined
  )

  const metricsArray = Array.isArray(metrics) ? metrics : []

  const sortedMetrics = useMemo(() => {
    if (!sortField) return metricsArray

    return [...metricsArray].sort((a: any, b: any) => {
      let aValue: number | string | Date = 0
      let bValue: number | string | Date = 0

      switch (sortField) {
        case 'timestamp':
          aValue = a.timestamp ? new Date(a.timestamp).getTime() : 0
          bValue = b.timestamp ? new Date(b.timestamp).getTime() : 0
          break
        case 'latency':
          aValue = a.execution?.latency?.total || 0
          bValue = b.execution?.latency?.total || 0
          break
        case 'confidence':
          aValue = a.confidence?.overall || 0
          bValue = b.confidence?.overall || 0
          break
        case 'quality':
          const aQuality = a.quality
          const aAvg = aQuality ? (
            [aQuality.outputCompleteness, aQuality.outputRelevance, aQuality.outputAccuracy]
              .filter((s: any) => typeof s === 'number')
              .reduce((sum: number, s: number) => sum + s, 0) / 
            [aQuality.outputCompleteness, aQuality.outputRelevance, aQuality.outputAccuracy]
              .filter((s: any) => typeof s === 'number').length || 1
          ) : 0
          const bQuality = b.quality
          const bAvg = bQuality ? (
            [bQuality.outputCompleteness, bQuality.outputRelevance, bQuality.outputAccuracy]
              .filter((s: any) => typeof s === 'number')
              .reduce((sum: number, s: number) => sum + s, 0) / 
            [bQuality.outputCompleteness, bQuality.outputRelevance, bQuality.outputAccuracy]
              .filter((s: any) => typeof s === 'number').length || 1
          ) : 0
          aValue = aAvg
          bValue = bAvg
          break
        case 'tokens':
          aValue = a.resources?.tokenUsage?.total || 0
          bValue = b.resources?.tokenUsage?.total || 0
          break
        case 'cost':
          aValue = a.resources?.cost || 0
          bValue = b.resources?.cost || 0
          break
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [metricsArray, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1" />
      : <ArrowDown className="w-3 h-3 ml-1" />
  }

  const formatDuration = (ms: number | undefined) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return '-'
    return num.toLocaleString()
  }

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleString()
  }

  const getStatusBadge = (status: string | undefined) => {
    if (!status) return <Badge variant="outline">-</Badge>
    const colors: Record<string, string> = {
      success: 'bg-green-500',
      failure: 'bg-red-500',
      timeout: 'bg-yellow-500',
      error: 'bg-red-500',
    }
    return (
      <Badge variant="outline" className={colors[status] || ''}>
        {status}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Loading metrics...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
        <div>
          <div className="font-semibold text-red-900 dark:text-red-100">Failed to load metrics</div>
          <div className="text-sm text-red-700 dark:text-red-300 mt-1">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Performance Metrics</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {metricsArray.length} metric{metricsArray.length !== 1 ? 's' : ''} found
          </p>
        </div>
      </div>

      {/* Dashboard Statistics */}
      <PerformanceDashboard metrics={metricsArray} />

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-xs">
          <Label htmlFor="orchestrator-id">Orchestrator ID</Label>
          <Input
            id="orchestrator-id"
            placeholder="Filter by orchestrator ID..."
            value={orchestratorId}
            onChange={(e) => setOrchestratorId(e.target.value)}
          />
        </div>
        <div className="flex-1 max-w-xs">
          <Label htmlFor="execution-id">Execution ID</Label>
          <Input
            id="execution-id"
            placeholder="Filter by execution ID..."
            value={executionId}
            onChange={(e) => setExecutionId(e.target.value)}
          />
        </div>
      </div>

      {/* Metrics Table */}
      {metricsArray.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-lg bg-muted/30 border border-dashed border-border">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-muted-foreground" />
            <div className="text-center">
              <div className="font-semibold text-lg mb-1">No metrics found</div>
              <div className="text-sm text-muted-foreground">
                {orchestratorId || executionId
                  ? 'Try adjusting your filters'
                  : 'Metrics will appear here after orchestrations are executed'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Card className="overflow-hidden w-full">
          <div className="overflow-x-auto w-full max-w-full">
            <Table className="min-w-[2000px] w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 -ml-3"
                      onClick={() => handleSort('timestamp')}
                    >
                      Timestamp
                      {getSortIcon('timestamp')}
                    </Button>
                  </TableHead>
                  <TableHead className="w-[100px]">Execution ID</TableHead>
                  <TableHead className="w-[100px]">Orchestrator ID</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[100px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 -ml-3"
                      onClick={() => handleSort('latency')}
                    >
                      Total Latency
                      {getSortIcon('latency')}
                    </Button>
                  </TableHead>
                  <TableHead className="w-[90px]">Thought</TableHead>
                  <TableHead className="w-[90px]">Plan</TableHead>
                  <TableHead className="w-[90px]">Execute</TableHead>
                  <TableHead className="w-[90px]">Summary</TableHead>
                  <TableHead className="w-[100px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 -ml-3"
                      onClick={() => handleSort('tokens')}
                    >
                      Input Tokens
                      {getSortIcon('tokens')}
                    </Button>
                  </TableHead>
                  <TableHead className="w-[100px]">Output Tokens</TableHead>
                  <TableHead className="w-[100px]">Total Tokens</TableHead>
                  <TableHead className="w-[80px]">API Calls</TableHead>
                  <TableHead className="w-[80px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 -ml-3"
                      onClick={() => handleSort('cost')}
                    >
                      Cost
                      {getSortIcon('cost')}
                    </Button>
                  </TableHead>
                  <TableHead className="w-[90px]">Completeness</TableHead>
                  <TableHead className="w-[90px]">Relevance</TableHead>
                  <TableHead className="w-[90px]">Accuracy</TableHead>
                  <TableHead className="w-[100px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 -ml-3"
                      onClick={() => handleSort('confidence')}
                    >
                      Confidence
                      {getSortIcon('confidence')}
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedMetrics.map((metric: any, index: number) => (
                  <TableRow key={metric._id || index} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-xs">
                      {formatDate(metric.timestamp)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {metric.executionId?.toString().substring(0, 8) || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {metric.orchestratorId?.toString().substring(0, 8) || '-'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(metric.execution?.status)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatDuration(metric.execution?.latency?.total)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDuration(metric.execution?.latency?.thought)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDuration(metric.execution?.latency?.plan)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDuration(metric.execution?.latency?.execution)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDuration(metric.execution?.latency?.summary)}
                    </TableCell>
                    <TableCell>
                      {formatNumber(metric.resources?.tokenUsage?.input)}
                    </TableCell>
                    <TableCell>
                      {formatNumber(metric.resources?.tokenUsage?.output)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatNumber(metric.resources?.tokenUsage?.total)}
                    </TableCell>
                    <TableCell>
                      {formatNumber(metric.resources?.apiCalls)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {metric.resources?.cost ? `$${metric.resources.cost.toFixed(4)}` : '-'}
                    </TableCell>
                    <TableCell>
                      {metric.quality?.outputCompleteness !== undefined
                        ? `${metric.quality.outputCompleteness}%`
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {metric.quality?.outputRelevance !== undefined
                        ? `${metric.quality.outputRelevance}%`
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {metric.quality?.outputAccuracy !== undefined
                        ? `${metric.quality.outputAccuracy}%`
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="font-medium">
                      {metric.confidence?.overall !== undefined
                        ? `${metric.confidence.overall}%`
                        : '-'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  )
}


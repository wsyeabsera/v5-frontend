'use client'

import { useState, useMemo } from 'react'
import { useOrchestrationExecutions, useOrchestrators } from '@/lib/queries-v2'
import { OrchestrationCard } from './OrchestrationCard'
import { OrchestrationDashboard } from './OrchestrationDashboard'
import { OrchestrationExecuteDialog } from './OrchestrationExecuteDialog'
import { OrchestrationViewDialog } from './OrchestrationViewDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Loader2, AlertCircle, Play, Eye, ArrowUpDown, ArrowUp, ArrowDown, Grid3x3, Table2, CheckCircle2, Circle } from 'lucide-react'

type SortField = 'timestamp' | 'status' | 'duration'
type SortDirection = 'asc' | 'desc'

export function OrchestrationList() {
  const [orchestratorFilter, setOrchestratorFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table')
  const [sortField, setSortField] = useState<SortField | null>('timestamp')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedOrchestration, setSelectedOrchestration] = useState<any>(null)
  const [selectedOrchestratorId, setSelectedOrchestratorId] = useState<string>('')
  const [selectedOrchestratorName, setSelectedOrchestratorName] = useState<string>('')

  const [querySearch, setQuerySearch] = useState<string>('')
  const [executionIdSearch, setExecutionIdSearch] = useState<string>('')

  const filters: any = {}
  if (orchestratorFilter && orchestratorFilter !== 'all') filters.orchestratorId = orchestratorFilter
  if (statusFilter && statusFilter !== 'all') filters.status = statusFilter

  // Always pass filters (even if empty) so the query runs
  const { data: orchestrations, isLoading, error } = useOrchestrationExecutions(
    Object.keys(filters).length > 0 ? filters : {}
  )
  const { data: orchestrators } = useOrchestrators()

  const filteredOrchestrations = Array.isArray(orchestrations) ? orchestrations : []
  const orchestratorList = Array.isArray(orchestrators) ? orchestrators : []

  // Apply client-side filtering for search
  const searchFilteredOrchestrations = useMemo(() => {
    if (!querySearch && !executionIdSearch) return filteredOrchestrations
    
    return filteredOrchestrations.filter((orch: any) => {
      const matchesQuery = !querySearch || 
        (orch.userQuery && orch.userQuery.toLowerCase().includes(querySearch.toLowerCase()))
      const matchesExecutionId = !executionIdSearch ||
        (orch._id && orch._id.toString().toLowerCase().includes(executionIdSearch.toLowerCase()))
      
      return matchesQuery && matchesExecutionId
    })
  }, [filteredOrchestrations, querySearch, executionIdSearch])

  // Enrich orchestrations with orchestrator names and calculate durations
  const enrichedOrchestrations = useMemo(() => {
    return searchFilteredOrchestrations.map((orch: any) => {
      const orchestrator = orchestratorList.find((o: any) => o._id === orch.orchestratorId)
      let duration = null
      
      if (orch.timestamps?.started && orch.timestamps?.completed) {
        const start = new Date(orch.timestamps.started).getTime()
        const completed = new Date(orch.timestamps.completed).getTime()
        duration = completed - start
      } else if (orch.startedAt && orch.completedAt) {
        const start = new Date(orch.startedAt).getTime()
        const completed = new Date(orch.completedAt).getTime()
        duration = completed - start
      }
      
      return {
        ...orch,
        orchestratorName: orchestrator?.name || 'Unknown',
        duration,
      }
    })
  }, [searchFilteredOrchestrations, orchestratorList])

  const sortedOrchestrations = useMemo(() => {
    if (!sortField) return enrichedOrchestrations

    return [...enrichedOrchestrations].sort((a: any, b: any) => {
      let aValue: number | string | Date = 0
      let bValue: number | string | Date = 0

      switch (sortField) {
        case 'timestamp':
          aValue = a.startedAt ? new Date(a.startedAt).getTime() : 
                   a.timestamps?.started ? new Date(a.timestamps.started).getTime() : 0
          bValue = b.startedAt ? new Date(b.startedAt).getTime() : 
                   b.timestamps?.started ? new Date(b.timestamps.started).getTime() : 0
          break
        case 'duration':
          aValue = a.duration || 0
          bValue = b.duration || 0
          break
        case 'status':
          aValue = a.status || ''
          bValue = b.status || ''
          break
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [enrichedOrchestrations, sortField, sortDirection])

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

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleString()
  }

  const getStatusBadge = (status: string | undefined) => {
    if (!status) return <Badge variant="outline">-</Badge>
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', className: string }> = {
      completed: { variant: 'default', className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' },
      failed: { variant: 'destructive', className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20' },
      pending: { variant: 'secondary', className: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20' },
      thought: { variant: 'secondary', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' },
      planning: { variant: 'secondary', className: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20' },
      executing: { variant: 'secondary', className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' },
      paused: { variant: 'outline', className: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20' },
    }
    const config = statusConfig[status] || { variant: 'outline' as const, className: '' }
    return (
      <Badge variant={config.variant} className={config.className}>
        {status}
      </Badge>
    )
  }

  const getPhaseIndicators = (orchestration: any) => {
    const phases = ['thought', 'plan', 'execution', 'summary']
    const timestamps = orchestration.timestamps || {}
    
    return phases.map((phase) => {
      const started = phase === 'thought' ? timestamps.thoughtStarted :
                     phase === 'plan' ? timestamps.planStarted :
                     phase === 'execution' ? timestamps.executionStarted :
                     timestamps.summaryStarted
      
      const completed = phase === 'thought' ? timestamps.thoughtCompleted :
                       phase === 'plan' ? timestamps.planCompleted :
                       phase === 'execution' ? timestamps.executionCompleted :
                       timestamps.summaryCompleted
      
      return {
        phase,
        started: !!started,
        completed: !!completed,
      }
    })
  }

  const handleView = (orchestration: any) => {
    setSelectedOrchestration(orchestration)
    setViewDialogOpen(true)
  }

  const handleExecute = (orchestratorId: string) => {
    const orchestrator = orchestratorList.find((o: any) => o._id === orchestratorId)
    setSelectedOrchestratorId(orchestratorId)
    setSelectedOrchestratorName(orchestrator?.name || '')
    setExecuteDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Loading orchestrations...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
        <div>
          <div className="font-semibold text-red-900 dark:text-red-100">
            Failed to load orchestrations
          </div>
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
          <h2 className="text-2xl font-semibold">Orchestrations</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {searchFilteredOrchestrations.length} execution{searchFilteredOrchestrations.length !== 1 ? 's' : ''}{' '}
            found
            {searchFilteredOrchestrations.length !== filteredOrchestrations.length && 
              ` (filtered from ${filteredOrchestrations.length})`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="gap-2"
          >
            <Table2 className="w-4 h-4" />
            Table
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('cards')}
            className="gap-2"
          >
            <Grid3x3 className="w-4 h-4" />
            Cards
          </Button>
          <Button
            onClick={() => {
              if (orchestratorList.length > 0) {
                const firstOrchestrator = orchestratorList[0]
                handleExecute(firstOrchestrator._id)
              }
            }}
            className="gap-2"
            disabled={orchestratorList.length === 0}
          >
            <Play className="w-4 h-4" />
            New Execution
          </Button>
        </div>
      </div>

      {/* Dashboard Statistics */}
      <OrchestrationDashboard 
        orchestrations={filteredOrchestrations} 
        orchestrators={orchestratorList}
      />

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="orchestrator-filter">Filter by Orchestrator</Label>
          <Select value={orchestratorFilter} onValueChange={setOrchestratorFilter}>
            <SelectTrigger id="orchestrator-filter">
              <SelectValue placeholder="All orchestrators" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {orchestratorList.map((orchestrator: any) => (
                <SelectItem key={orchestrator._id} value={orchestrator._id}>
                  {orchestrator.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="status-filter">Filter by Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger id="status-filter">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="thought">Thought</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="executing">Executing</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="query-search">Search User Query</Label>
          <Input
            id="query-search"
            placeholder="Search by query..."
            value={querySearch}
            onChange={(e) => setQuerySearch(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="execution-id-search">Search Execution ID</Label>
          <Input
            id="execution-id-search"
            placeholder="Search by ID..."
            value={executionIdSearch}
            onChange={(e) => setExecutionIdSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Orchestrations View */}
      {searchFilteredOrchestrations.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-lg bg-muted/30 border border-dashed border-border">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-muted-foreground" />
            <div className="text-center">
              <div className="font-semibold text-lg mb-1">No orchestrations found</div>
              <div className="text-sm text-muted-foreground">
                {(orchestratorFilter && orchestratorFilter !== 'all') || (statusFilter && statusFilter !== 'all') || querySearch || executionIdSearch
                  ? 'Try adjusting your filters or search terms'
                  : 'Execute an orchestrator to see execution history'}
              </div>
            </div>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        <Card className="overflow-hidden w-full">
          <div className="overflow-x-auto w-full max-w-full">
            <Table className="min-w-[1200px] w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 -ml-3"
                      onClick={() => handleSort('timestamp')}
                    >
                      Started
                      {getSortIcon('timestamp')}
                    </Button>
                  </TableHead>
                  <TableHead className="w-[100px]">Execution ID</TableHead>
                  <TableHead className="w-[200px]">User Query</TableHead>
                  <TableHead className="w-[150px]">Orchestrator</TableHead>
                  <TableHead className="w-[100px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 -ml-3"
                      onClick={() => handleSort('status')}
                    >
                      Status
                      {getSortIcon('status')}
                    </Button>
                  </TableHead>
                  <TableHead className="w-[100px]">Completed</TableHead>
                  <TableHead className="w-[100px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 -ml-3"
                      onClick={() => handleSort('duration')}
                    >
                      Duration
                      {getSortIcon('duration')}
                    </Button>
                  </TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedOrchestrations.map((orchestration: any, index: number) => (
                  <TableRow key={orchestration._id || index} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-xs">
                      {formatDate(orchestration.startedAt || orchestration.timestamps?.started)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {orchestration._id?.toString().substring(0, 8) || '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="truncate" title={orchestration.userQuery}>
                        {orchestration.userQuery || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {orchestration.orchestratorName}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1" title={getPhaseIndicators(orchestration).map(p => 
                        `${p.phase}: ${p.completed ? 'completed' : p.started ? 'in progress' : 'pending'}`
                      ).join(', ')}>
                        {getPhaseIndicators(orchestration).map((phaseInfo, idx) => (
                          <div key={idx} className="flex items-center">
                            {phaseInfo.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : phaseInfo.started ? (
                              <Circle className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-300" />
                            )}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(orchestration.status)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatDate(orchestration.completedAt || orchestration.timestamps?.completed)}
                    </TableCell>
                    <TableCell>
                      {formatDuration(orchestration.duration)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(orchestration)}
                          className="gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleExecute(orchestration.orchestratorId)}
                          className="gap-1"
                        >
                          <Play className="w-3 h-3" />
                          Run
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedOrchestrations.map((orchestration: any, index: number) => (
            <div
              key={orchestration._id || index}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <OrchestrationCard
                orchestration={orchestration}
                onView={handleView}
                onExecute={() => handleExecute(orchestration.orchestratorId)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Execute Dialog */}
      {selectedOrchestratorId && (
        <OrchestrationExecuteDialog
          open={executeDialogOpen}
          onOpenChange={(open) => {
            setExecuteDialogOpen(open)
            if (!open) {
              setSelectedOrchestratorId('')
              setSelectedOrchestratorName('')
            }
          }}
          orchestratorId={selectedOrchestratorId}
          orchestratorName={selectedOrchestratorName}
        />
      )}

      {/* View Dialog */}
      <OrchestrationViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        orchestration={selectedOrchestration}
      />
    </div>
  )
}


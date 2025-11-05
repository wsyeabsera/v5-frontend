'use client'

import { useState, useMemo } from 'react'
import { useTasks } from '@/lib/queries-v2'
import { TaskSummaryCard } from './TaskSummaryCard'
import { TaskSummaryFilters } from './TaskSummaryFilters'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertCircle, RefreshCw, FileText, CheckCircle2, XCircle, TrendingUp } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { getSummaryStats, hasSummary } from '@/lib/utils/summary-storage'

export function TaskSummaryList() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<{
    status?: 'completed' | 'failed'
    search?: string
  }>({
    status: 'completed',
  })

  const { data: tasksData, isLoading, error } = useTasks({
    status: filters.status,
    limit: 100,
  })

  const tasks = Array.isArray(tasksData) ? tasksData : tasksData?.tasks || []

  // Filter by search if provided
  const filteredTasks = useMemo(() => {
    if (!filters.search) return tasks
    
    const searchLower = filters.search.toLowerCase()
    return tasks.filter((task: any) => {
      const taskId = task._id || task.id || ''
      return taskId.toLowerCase().includes(searchLower)
    })
  }, [tasks, filters.search])

  // Calculate statistics
  const stats = useMemo(() => {
    const totalTasks = filteredTasks.length
    const tasksWithSummaries = filteredTasks.filter((task: any) => {
      const taskId = task._id || task.id || ''
      return hasSummary(taskId)
    }).length
    const completedTasks = filteredTasks.filter((t: any) => t.status === 'completed').length
    const failedTasks = filteredTasks.filter((t: any) => t.status === 'failed').length

    return {
      totalTasks,
      tasksWithSummaries,
      completedTasks,
      failedTasks,
      summaryCoverage: totalTasks > 0 ? Math.round((tasksWithSummaries / totalTasks) * 100) : 0,
    }
  }, [filteredTasks])

  const summaryStats = useMemo(() => getSummaryStats(), [])

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['v2', 'tasks'] })
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border-2 rounded-lg bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50">
        <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error loading tasks</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          {error instanceof Error ? error.message : 'Unknown error occurred'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Panel */}
      {!isLoading && filteredTasks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/50 dark:border-blue-900/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold mt-1">{stats.totalTasks}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-100/50 dark:from-green-950/30 dark:to-emerald-900/20 border-green-200/50 dark:border-green-900/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">With Summaries</p>
                <p className="text-2xl font-bold mt-1">{stats.tasksWithSummaries}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.summaryCoverage}% coverage
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200/50 dark:border-purple-900/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold mt-1">{stats.completedTasks}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <CheckCircle2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-red-50 to-rose-100/50 dark:from-red-950/30 dark:to-rose-900/20 border-red-200/50 dark:border-red-900/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold mt-1">{stats.failedTasks}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <TaskSummaryFilters filters={filters} onFiltersChange={setFilters} />
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center p-12 border-2 rounded-lg bg-muted/30">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-3 text-sm text-muted-foreground">Loading tasks...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredTasks.length === 0 && (
        <Card className="flex flex-col items-center justify-center p-12 border-2 border-dashed">
          <div className="p-4 rounded-full bg-muted/50 mb-4">
            <FileText className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No tasks found</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {filters.search
              ? 'No tasks match your search criteria. Try adjusting your filters.'
              : 'No completed or failed tasks available for summarization.'}
          </p>
        </Card>
      )}

      {/* Task Summary Cards */}
      {!isLoading && filteredTasks.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTasks.map((task: any) => {
            const taskId = task._id || task.id || ''
            return <TaskSummaryCard key={taskId} task={task} />
          })}
        </div>
      )}
    </div>
  )
}

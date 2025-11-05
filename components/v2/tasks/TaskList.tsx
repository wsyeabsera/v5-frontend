'use client'

import { useState, useMemo } from 'react'
import { useTasks } from '@/lib/queries-v2'
import { TaskCard } from './TaskCard'
import { TaskViewDialog } from './TaskViewDialog'
import { TaskFilters } from './TaskFilters'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

export function TaskList() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<{
    planId?: string
    status?: 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled'
    agentConfigId?: string
    startDate?: string
    endDate?: string
    limit?: number
    skip?: number
  }>({ limit: 50, skip: 0 })
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const { data: tasksData, isLoading, error } = useTasks(
    Object.keys(filters).length > 0 ? filters : undefined
  )

  // Extract tasks array and pagination info from response
  const tasks = Array.isArray(tasksData) 
    ? tasksData 
    : tasksData?.tasks || []

  // Check if there are any in-progress tasks
  const hasInProgressTasks = useMemo(() => {
    return tasks.some((task: any) => task.status === 'in_progress')
  }, [tasks])

  // Auto-refresh every 3 seconds if there are in-progress tasks
  useEffect(() => {
    if (!hasInProgressTasks) return

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'tasks'] })
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(interval)
  }, [hasInProgressTasks, queryClient])

  const pagination = tasksData && typeof tasksData === 'object' && !Array.isArray(tasksData)
    ? {
        total: tasksData.total || tasks.length,
        limit: tasksData.limit || filters.limit || 50,
        skip: tasksData.skip || filters.skip || 0,
        hasMore: tasksData.hasMore || false,
      }
    : null

  const handleView = (taskId: string) => {
    setSelectedTaskId(taskId)
    setViewDialogOpen(true)
  }

  const handleViewDialogClose = (open: boolean) => {
    setViewDialogOpen(open)
    if (!open) {
      setSelectedTaskId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Loading tasks...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <div className="font-semibold text-red-900 dark:text-red-100">
            Failed to load tasks
          </div>
        </div>
        <div className="text-sm text-red-700 dark:text-red-300 mt-2">
          {error instanceof Error ? error.message : 'Unknown error occurred'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <TaskFilters filters={filters} onFiltersChange={setFilters} />

      {/* Tasks Grid */}
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-muted/30">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            There are no tasks matching your filters. Try adjusting your filters or check back later.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((task: any, index: number) => (
            <div
              key={task._id || task.id || index}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <TaskCard task={task} onView={handleView} />
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => {
              setFilters({
                ...filters,
                skip: (filters.skip || 0) + (filters.limit || 50),
              })
            }}
          >
            Load More
          </Button>
        </div>
      )}

      <TaskViewDialog
        open={viewDialogOpen}
        onOpenChange={handleViewDialogClose}
        taskId={selectedTaskId}
      />
    </div>
  )
}


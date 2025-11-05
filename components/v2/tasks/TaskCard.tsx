'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Progress } from '@/components/ui/progress'
import { useDeleteTask } from '@/lib/queries-v2'
import { TaskExecutionControls } from './TaskExecutionControls'
import { TaskSummaryButton } from './TaskSummaryButton'
import { hasSummary } from '@/lib/utils/summary-storage'
import { Eye, Trash2, Loader2, Calendar, CheckSquare, AlertCircle, Copy, Check, FileText } from 'lucide-react'

interface TaskCardProps {
  task: {
    _id?: string
    id?: string
    planId?: string
    status?: 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled'
    currentStepIndex?: number
    pendingUserInputs?: Array<{
      stepId: string
      field: string
      description?: string
    }>
    stepOutputs?: Record<string, any>
    executionHistory?: Array<{
      stepId: string
      timestamp: string | Date
      status: string
      error?: string
      duration?: number
    }>
    agentConfigId?: string
    error?: string
    createdAt?: string
    updatedAt?: string
  }
  onView: (taskId: string) => void
}

export function TaskCard({ task, onView }: TaskCardProps) {
  const deleteMutation = useDeleteTask()
  const taskId = task._id || task.id || ''
  const [copied, setCopied] = useState(false)

  const handleDelete = async () => {
    if (!taskId) return
    try {
      await deleteMutation.mutateAsync(taskId)
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  const handleCopyTask = async () => {
    try {
      const text = JSON.stringify(task, null, 2)
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy task:', err)
    }
  }

  const pendingInputsCount = Array.isArray(task.pendingUserInputs) ? task.pendingUserInputs.length : 0
  const completedStepsCount = task.stepOutputs ? Object.keys(task.stepOutputs).length : 0
  const currentStep = task.currentStepIndex !== undefined ? task.currentStepIndex : 0

  // Calculate progress based on execution history or current step
  const executionHistoryLength = Array.isArray(task.executionHistory) ? task.executionHistory.length : 0
  const progressPercentage = executionHistoryLength > 0 
    ? Math.round((completedStepsCount / executionHistoryLength) * 100)
    : 0

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'default'
      case 'in_progress':
        return 'secondary'
      case 'paused':
        return 'outline' // Will add custom color
      case 'failed':
        return 'destructive'
      case 'cancelled':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'paused':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'cancelled':
        return 'text-gray-600 dark:text-gray-400'
      default:
        return ''
    }
  }

  return (
    <Card className="p-6 hover:border-primary/30 transition-all duration-200">
      <div className="space-y-4">
        {/* Pending Inputs Alert */}
        {pendingInputsCount > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30">
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-900 dark:text-yellow-100">
              {pendingInputsCount} pending user input{pendingInputsCount !== 1 ? 's' : ''} required
            </div>
          </div>
        )}

        {/* Error Alert */}
        {task.error && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-900 dark:text-red-100">
              {task.error}
            </div>
          </div>
        )}

        {/* Plan Reference */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckSquare className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-lg">Task</h3>
          </div>
          {task.planId && (
            <p className="text-sm text-muted-foreground">
              Plan: <span className="font-mono">{task.planId.substring(0, 16)}...</span>
            </p>
          )}
        </div>

        {/* Progress */}
        {task.status === 'in_progress' || task.status === 'paused' ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Step {currentStep + 1}</span>
              <span>{completedStepsCount} completed</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        ) : null}

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status */}
          {task.status && (
            <Badge variant={getStatusBadgeVariant(task.status)} className={getStatusColor(task.status)}>
              {task.status.replace('_', ' ')}
            </Badge>
          )}

          {/* Summary Indicator */}
          {(task.status === 'completed' || task.status === 'failed') && taskId && hasSummary(taskId) && (
            <Badge variant="outline" className="gap-1 bg-primary/10 border-primary/30">
              <FileText className="w-3 h-3 text-primary" />
              Summary Available
            </Badge>
          )}

          {/* Completed Steps */}
          {completedStepsCount > 0 && (
            <Badge variant="secondary">
              {completedStepsCount} step{completedStepsCount !== 1 ? 's' : ''} completed
            </Badge>
          )}

          {/* Agent Config ID */}
          {task.agentConfigId && (
            <Badge variant="outline" className="font-mono text-xs">
              Agent: {task.agentConfigId.substring(0, 8)}...
            </Badge>
          )}
        </div>

        {/* Timestamps */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          {task.createdAt && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
            </div>
          )}
          {task.updatedAt && task.updatedAt !== task.createdAt && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Updated: {new Date(task.updatedAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Execution Controls */}
        {(task.status === 'pending' || task.status === 'paused' || task.status === 'in_progress') && (
          <div className="pt-2 border-t">
            <TaskExecutionControls task={task} />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => taskId && onView(taskId)}
            disabled={deleteMutation.isPending || !taskId}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>
          {(task.status === 'completed' || task.status === 'failed') && taskId && (
            <TaskSummaryButton taskId={taskId} />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyTask}
            disabled={deleteMutation.isPending}
            title="Copy task JSON"
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteMutation.isPending || !taskId}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Task?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this task? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </Card>
  )
}


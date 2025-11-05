'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useTask } from '@/lib/queries-v2'
import { TaskExecutionControls } from './TaskExecutionControls'
import { TaskSummaryButton } from './TaskSummaryButton'
import { hasSummary, getLatestSummary } from '@/lib/utils/summary-storage'
import { Loader2, Calendar, CheckSquare, CheckCircle2, XCircle, Clock, AlertCircle, Copy, Check, Pause, Play, FileText } from 'lucide-react'
import { JsonViewer } from '@/components/ui/json-viewer'
import { useQueryClient } from '@tanstack/react-query'

interface TaskViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId: string | null
}

export function TaskViewDialog({ open, onOpenChange, taskId }: TaskViewDialogProps) {
  const queryClient = useQueryClient()
  const { data: task, isLoading, error } = useTask(taskId || '')
  const [copied, setCopied] = useState(false)

  // Auto-refresh every 3 seconds if task is in progress
  useEffect(() => {
    if (!open || !taskId || task?.status !== 'in_progress') return

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'task', taskId] })
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(interval)
  }, [open, taskId, task?.status, queryClient])

  const handleCopyTask = async () => {
    if (!task) return
    try {
      const text = JSON.stringify(task, null, 2)
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy task:', err)
    }
  }

  if (!open) return null

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
      case 'in_progress':
        return <Play className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'default'
      case 'in_progress':
        return 'secondary'
      case 'paused':
        return 'outline'
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

  const getExecutionStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400" />
      case 'failed':
        return <XCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
      case 'skipped':
        return <AlertCircle className="w-3 h-3 text-gray-600 dark:text-gray-400" />
      default:
        return <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
    }
  }

  const pendingInputsCount = Array.isArray(task?.pendingUserInputs) ? task.pendingUserInputs.length : 0
  const completedStepsCount = task?.stepOutputs ? Object.keys(task.stepOutputs).length : 0
  const currentStep = task?.currentStepIndex !== undefined ? task.currentStepIndex : 0
  const executionHistoryLength = Array.isArray(task?.executionHistory) ? task.executionHistory.length : 0
  const progressPercentage = executionHistoryLength > 0 
    ? Math.round((completedStepsCount / executionHistoryLength) * 100)
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Task Details</DialogTitle>
          <DialogDescription>
            View the complete task execution details including progress, execution history, step outputs, and pending inputs.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Loading task...</span>
          </div>
        )}

        {error && (
          <div className="p-6 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
            <div className="font-semibold text-red-900 dark:text-red-100">
              Failed to load task
            </div>
            <div className="text-sm text-red-700 dark:text-red-300 mt-1">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </div>
          </div>
        )}

        {task && !isLoading && (
          <div className="space-y-6">
            {/* Execution Controls */}
            {(task.status === 'pending' || task.status === 'paused' || task.status === 'in_progress') && (
              <div className="p-4 rounded-lg bg-muted/30 border">
                <TaskExecutionControls 
                  task={task} 
                  onTaskUpdate={() => {
                    // Refresh task data
                    window.location.reload()
                  }}
                />
              </div>
            )}

            {/* Summary Section for Completed/Failed Tasks */}
            {(task.status === 'completed' || task.status === 'failed') && taskId && (
              <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Task Summary</h3>
                      <p className="text-sm text-muted-foreground">
                        {hasSummary(taskId)
                          ? 'View or regenerate intelligent summaries of this task execution'
                          : 'Generate an intelligent summary with insights and recommendations'}
                      </p>
                      {hasSummary(taskId) && (
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {getLatestSummary(taskId)?.format || 'detailed'} format available
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Last generated: {getLatestSummary(taskId)?.generatedAt ? new Date(getLatestSummary(taskId)!.generatedAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <TaskSummaryButton taskId={taskId} variant="default" size="default" />
                </div>
              </Card>
            )}

            {/* Pending Inputs Alert */}
            {pendingInputsCount > 0 && task.status !== 'paused' && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-yellow-900 dark:text-yellow-100">
                  <div className="font-semibold mb-2">
                    {pendingInputsCount} pending user input{pendingInputsCount !== 1 ? 's' : ''} required
                  </div>
                  <div className="space-y-2">
                    {task.pendingUserInputs?.map((input, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium">Step {input.stepId}:</span> {input.field}
                        {input.description && (
                          <span className="text-muted-foreground"> - {input.description}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Error Alert */}
            {task.error && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-red-900 dark:text-red-100">
                  <div className="font-semibold mb-1">Task Error</div>
                  <div>{task.error}</div>
                </div>
              </div>
            )}

            {/* Basic Info */}
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" />
                  Task Information
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Status */}
                  {task.status && (
                    <Badge variant={getStatusBadgeVariant(task.status)} className={`gap-1 ${getStatusColor(task.status)}`}>
                      {getStatusIcon(task.status)}
                      {task.status.replace('_', ' ')}
                    </Badge>
                  )}

                  {/* Plan ID */}
                  {task.planId && (
                    <div>
                      <span className="text-xs text-muted-foreground mr-2">Plan ID:</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {task.planId}
                      </Badge>
                    </div>
                  )}

                  {/* Agent Config ID */}
                  {task.agentConfigId && (
                    <div>
                      <span className="text-xs text-muted-foreground mr-2">Agent Config:</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {task.agentConfigId}
                      </Badge>
                    </div>
                  )}

                  {/* Current Step */}
                  {task.currentStepIndex !== undefined && (
                    <Badge variant="secondary">
                      Current Step: {task.currentStepIndex + 1}
                    </Badge>
                  )}

                  {/* Completed Steps */}
                  {completedStepsCount > 0 && (
                    <Badge variant="secondary">
                      {completedStepsCount} step{completedStepsCount !== 1 ? 's' : ''} completed
                    </Badge>
                  )}

                  {/* Timestamps */}
                  {task.createdAt && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>Created: {new Date(task.createdAt).toLocaleString()}</span>
                    </div>
                  )}
                  {task.updatedAt && task.updatedAt !== task.createdAt && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>Updated: {new Date(task.updatedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress */}
              {(task.status === 'in_progress' || task.status === 'paused') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Progress</span>
                    <span className="text-muted-foreground">
                      Step {currentStep + 1} of {executionHistoryLength || '?'}
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                  <div className="text-xs text-muted-foreground text-right">
                    {progressPercentage}% complete
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Execution History */}
            {Array.isArray(task.executionHistory) && task.executionHistory.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">
                  Execution History ({task.executionHistory.length})
                </h3>
                <div className="space-y-3">
                  {task.executionHistory.map((entry: any, index: number) => (
                    <div
                      key={entry.stepId || index}
                      className="border rounded-lg p-4 space-y-2 bg-muted/30"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getExecutionStatusIcon(entry.status)}
                          <Badge variant="outline">Step: {entry.stepId}</Badge>
                          <Badge variant={getStatusBadgeVariant(entry.status)}>
                            {entry.status}
                          </Badge>
                        </div>
                        {entry.timestamp && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(entry.timestamp).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                      {entry.duration !== undefined && (
                        <div className="text-xs text-muted-foreground">
                          Duration: {entry.duration}ms
                        </div>
                      )}
                      {entry.error && (
                        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                          Error: {entry.error}
                        </div>
                      )}
                      {entry.output && (
                        <div>
                          <h4 className="font-medium text-xs mb-1">Output</h4>
                          <JsonViewer data={entry.output} collapsible defaultExpanded={false} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Step Outputs */}
            {task.stepOutputs && Object.keys(task.stepOutputs).length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">
                  Step Outputs ({Object.keys(task.stepOutputs).length})
                </h3>
                <div className="space-y-3">
                  {Object.entries(task.stepOutputs).map(([stepId, output], index) => (
                    <div
                      key={stepId || index}
                      className="border rounded-lg p-4 space-y-2 bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Step: {stepId}</Badge>
                      </div>
                      <JsonViewer data={output} collapsible defaultExpanded={false} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User Inputs */}
            {task.userInputs && Object.keys(task.userInputs).length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">
                    User Inputs ({Object.keys(task.userInputs).length})
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(task.userInputs).map(([stepId, inputs], index) => (
                      <div
                        key={stepId || index}
                        className="border rounded-lg p-4 space-y-2 bg-muted/30"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Step: {stepId}</Badge>
                        </div>
                        <JsonViewer data={inputs} collapsible defaultExpanded={false} />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Retry Count */}
            {task.retryCount && Object.keys(task.retryCount).length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">
                    Retry Count ({Object.keys(task.retryCount).length})
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(task.retryCount).map(([stepId, count], index) => (
                      <div
                        key={stepId || index}
                        className="flex items-center justify-between p-2 border rounded bg-muted/30"
                      >
                        <span className="text-sm font-mono">{stepId}</span>
                        <Badge variant="outline">{count} retr{count !== 1 ? 'ies' : 'y'}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Raw Data */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Raw Data</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyTask}
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy JSON
                    </>
                  )}
                </Button>
              </div>
              <JsonViewer data={task} collapsible defaultExpanded={false} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}


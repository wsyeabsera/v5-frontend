'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CheckSquare, Calendar, ExternalLink, Copy, Check, CheckCircle2, Clock, XCircle, Pause, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { TaskExecutionControls } from '@/components/v2/tasks/TaskExecutionControls'

interface TaskNodeProps {
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
    executionHistory?: Array<any>
    agentConfigId?: string
    error?: string
    createdAt?: string
  }
  onView?: (taskId: string) => void
  onViewPlan?: (planId: string) => void
}

export function TaskNode({ task, onView, onViewPlan }: TaskNodeProps) {
  const [copied, setCopied] = useState(false)
  const taskId = task._id || task.id || ''
  const pendingInputsCount = Array.isArray(task.pendingUserInputs) ? task.pendingUserInputs.length : 0
  const completedStepsCount = task.stepOutputs ? Object.keys(task.stepOutputs).length : 0
  const currentStep = task.currentStepIndex !== undefined ? task.currentStepIndex : 0
  const executionHistoryLength = Array.isArray(task.executionHistory) ? task.executionHistory.length : 0
  const progressPercentage = executionHistoryLength > 0 
    ? Math.round((completedStepsCount / executionHistoryLength) * 100)
    : 0

  const handleCopyId = async () => {
    if (!taskId) return
    try {
      await navigator.clipboard.writeText(taskId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy ID:', err)
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400" />
      case 'in_progress':
        return <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
      case 'paused':
        return <Pause className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
      case 'failed':
        return <XCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
      case 'cancelled':
        return <XCircle className="w-3 h-3 text-gray-600 dark:text-gray-400" />
      default:
        return <Clock className="w-3 h-3 text-muted-foreground" />
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

  return (
    <Card className="p-4 border-l-4 border-l-purple-500 hover:border-l-purple-600 transition-all duration-200 hover:shadow-md">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950/30">
              <CheckSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Task</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="font-mono text-xs">
                  {taskId.substring(0, 8)}...
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={handleCopyId}
                  title="Copy ID"
                >
                  {copied ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Inputs Alert */}
        {pendingInputsCount > 0 && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30">
            <AlertCircle className="h-3 w-3 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-900 dark:text-yellow-100">
              {pendingInputsCount} pending input{pendingInputsCount !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {task.error && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
            <AlertCircle className="h-3 w-3 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-red-900 dark:text-red-100 line-clamp-2">
              {task.error}
            </div>
          </div>
        )}

        {/* Progress */}
        {(task.status === 'in_progress' || task.status === 'paused') && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="text-muted-foreground">
                Step {currentStep + 1} / {executionHistoryLength || '?'}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-1.5" />
          </div>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {task.status && (
            <Badge variant={getStatusBadgeVariant(task.status)} className={`gap-1 text-xs ${getStatusColor(task.status)}`}>
              {getStatusIcon(task.status)}
              {task.status.replace('_', ' ')}
            </Badge>
          )}
          {completedStepsCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {completedStepsCount} completed
            </Badge>
          )}
          {task.planId && (
            <Badge
              variant="outline"
              className="font-mono text-xs cursor-pointer hover:bg-muted"
              onClick={() => task.planId && onViewPlan?.(task.planId)}
              title="Click to view plan"
            >
              Plan: {task.planId.substring(0, 8)}...
            </Badge>
          )}
          {task.agentConfigId && (
            <Badge variant="outline" className="font-mono text-xs">
              Agent: {task.agentConfigId.substring(0, 8)}...
            </Badge>
          )}
          {task.createdAt && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{new Date(task.createdAt).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="pt-2 border-t">
          <TaskExecutionControls task={task} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          {onView && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => taskId && onView(taskId)}
              className="flex-1"
            >
              View Details
            </Button>
          )}
          <Link href={`/v2/tasks`} target="_blank">
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="w-3 h-3" />
              Open
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}


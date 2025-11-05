'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TaskSummaryDialog } from '@/components/v2/tasks/TaskSummaryDialog'
import { getLatestSummary, hasSummary } from '@/lib/utils/summary-storage'
import { CheckSquare, Calendar, Eye, FileText, Sparkles, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'

interface TaskSummaryCardProps {
  task: {
    _id?: string
    id?: string
    planId?: string
    status?: 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled'
    createdAt?: string
    updatedAt?: string
  }
  onView?: (taskId: string) => void
}

export function TaskSummaryCard({ task, onView }: TaskSummaryCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const taskId = task._id || task.id || ''

  const hasCachedSummary = hasSummary(taskId)
  const latestSummary = hasCachedSummary ? getLatestSummary(taskId) : null
  const summaryPreview = latestSummary?.summary
    ? latestSummary.summary.substring(0, 200).replace(/\n/g, ' ').trim() + '...'
    : null

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'default'
      case 'failed':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400'
      case 'failed':
        return 'text-red-600 dark:text-red-400'
      default:
        return ''
    }
  }

  const getStatusBg = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-900/50'
      case 'failed':
        return 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-red-200 dark:border-red-900/50'
      default:
        return 'bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-950/30 dark:to-slate-950/30'
    }
  }

  return (
    <>
      <Card
        className={`p-6 hover:shadow-xl transition-all duration-300 border-2 ${
          hasCachedSummary ? 'border-primary/30' : ''
        } ${getStatusBg(task.status)}`}
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${
                  task.status === 'completed'
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : task.status === 'failed'
                    ? 'bg-red-100 dark:bg-red-900/30'
                    : 'bg-gray-100 dark:bg-gray-900/30'
                }`}>
                  <CheckSquare className={`w-5 h-5 ${
                    task.status === 'completed'
                      ? 'text-green-600 dark:text-green-400'
                      : task.status === 'failed'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Task Execution</h3>
                  <p className="text-sm text-muted-foreground font-mono">
                    {taskId.substring(0, 16)}...
                  </p>
                </div>
              </div>

              {/* Status and Metadata */}
              <div className="flex flex-wrap items-center gap-2">
                {task.status && (
                  <Badge
                    variant={getStatusBadgeVariant(task.status)}
                    className={`gap-1.5 font-semibold ${getStatusColor(task.status)}`}
                  >
                    {task.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                    {task.status.replace('_', ' ')}
                  </Badge>
                )}
                {hasCachedSummary && (
                  <Badge variant="outline" className="gap-1.5 bg-primary/10 border-primary/30">
                    <FileText className="w-3 h-3 text-primary" />
                    Summary Available
                  </Badge>
                )}
                {latestSummary && (
                  <Badge variant="secondary" className="text-xs">
                    {latestSummary.format}
                  </Badge>
                )}
                {task.createdAt && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onView && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => taskId && onView(taskId)}
                  className="gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View
                </Button>
              )}
              <Button
                variant={hasCachedSummary ? 'default' : 'default'}
                size="sm"
                onClick={() => setDialogOpen(true)}
                className="gap-2 shadow-md"
              >
                {hasCachedSummary ? (
                  <>
                    <FileText className="w-4 h-4" />
                    View Summary
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Summary Preview */}
          {summaryPreview && (
            <div className="pt-3 border-t border-border/50">
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Latest Summary Preview
                    </span>
                    {latestSummary && (
                      <Badge variant="outline" className="text-xs">
                        {latestSummary.format}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {summaryPreview}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      <TaskSummaryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        taskId={taskId}
      />
    </>
  )
}

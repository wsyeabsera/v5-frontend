'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Eye, Play } from 'lucide-react'

interface OrchestrationCardProps {
  orchestration: {
    _id: string
    orchestratorId: string
    orchestratorName?: string
    userQuery?: string
    status?: string
    executionCode?: string
    duration?: number | null
    timestamps?: {
      started?: string
      completed?: string
    }
    startedAt?: string | Date
    completedAt?: string | Date
  }
  onView: (orchestration: any) => void
  onExecute?: (orchestratorId: string) => void
}

const statusColors: Record<string, string> = {
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  pending: 'bg-yellow-500',
  thought: 'bg-blue-500',
  planning: 'bg-purple-500',
  executing: 'bg-green-500',
  paused: 'bg-yellow-500',
}

export function OrchestrationCard({ orchestration, onView, onExecute }: OrchestrationCardProps) {
  const status = orchestration.status || 'pending'
  const statusColor = statusColors[status] || 'bg-gray-500'

  const startedAt = orchestration.startedAt || orchestration.timestamps?.started
  const completedAt = orchestration.completedAt || orchestration.timestamps?.completed
  
  const formatDuration = (ms: number | null | undefined) => {
    if (!ms) return null
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }

  const duration = orchestration.duration !== undefined 
    ? orchestration.duration 
    : (startedAt && completedAt 
        ? new Date(completedAt).getTime() - new Date(startedAt).getTime()
        : null)

  const isActive = ['pending', 'thought', 'planning', 'executing'].includes(status)

  return (
    <Card className="p-6 hover:border-primary/30 transition-all duration-200">
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-semibold text-lg">Execution</h3>
              {orchestration.orchestratorName && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {orchestration.orchestratorName}
                </p>
              )}
            </div>
            <Badge variant="outline" className={statusColor}>
              {status}
            </Badge>
          </div>
          {orchestration.userQuery && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
              {orchestration.userQuery}
            </p>
          )}
          {orchestration.executionCode && (
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              {orchestration.executionCode}
            </p>
          )}
        </div>

        <div className="space-y-2 text-xs text-muted-foreground">
          {startedAt && (
            <div className="flex items-center justify-between">
              <span>Started:</span>
              <span className="font-mono">{new Date(startedAt).toLocaleString()}</span>
            </div>
          )}
          {completedAt && (
            <div className="flex items-center justify-between">
              <span>Completed:</span>
              <span className="font-mono">{new Date(completedAt).toLocaleString()}</span>
            </div>
          )}
          {duration !== null && formatDuration(duration) && (
            <div className="flex items-center justify-between pt-1 border-t">
              <span className="font-medium">Duration:</span>
              <span className="font-mono font-semibold">{formatDuration(duration)}</span>
            </div>
          )}
          {isActive && (
            <div className="flex items-center gap-2 pt-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs">In progress...</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(orchestration)}
            className="flex-1 gap-2"
          >
            <Eye className="w-4 h-4" />
            View
          </Button>
          {onExecute && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onExecute(orchestration.orchestratorId)}
              className="flex-1 gap-2"
            >
              <Play className="w-4 h-4" />
              Execute Again
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}


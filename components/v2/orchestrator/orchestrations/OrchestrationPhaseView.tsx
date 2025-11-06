'use client'

import { Badge } from '@/components/ui/badge'
import { Brain, ListChecks, Play, FileText, Loader2, CheckCircle2 } from 'lucide-react'

interface OrchestrationPhaseViewProps {
  phase: 'thought' | 'plan' | 'executing' | 'summary'
  events: Array<{
    type: string
    data: any
    timestamp: Date
  }>
  isActive: boolean
  isComplete: boolean
}

const phaseConfig = {
  thought: { label: 'Thought', icon: Brain, color: 'bg-blue-500' },
  plan: { label: 'Plan', icon: ListChecks, color: 'bg-purple-500' },
  executing: { label: 'Executing', icon: Play, color: 'bg-green-500' },
  summary: { label: 'Summary', icon: FileText, color: 'bg-orange-500' },
}

export function OrchestrationPhaseView({
  phase,
  events,
  isActive,
  isComplete,
}: OrchestrationPhaseViewProps) {
  const config = phaseConfig[phase]
  const Icon = config.icon
  const latestEvent = events[events.length - 1]

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {isActive ? (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        ) : isComplete ? (
          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
        ) : (
          <Icon className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">{config.label}</span>
        {isActive && <Badge variant="outline" className="text-xs">Active</Badge>}
        {isComplete && <Badge variant="default" className="text-xs">Complete</Badge>}
      </div>

      {latestEvent && (
        <div className="pl-6 space-y-1 text-xs text-muted-foreground">
          {phase === 'thought' && latestEvent.data?.reasoning && (
            <div className="line-clamp-2">{latestEvent.data.reasoning}</div>
          )}
          {phase === 'plan' && latestEvent.data?.steps && (
            <div>{Array.isArray(latestEvent.data.steps) ? latestEvent.data.steps.length : 0} steps</div>
          )}
          {phase === 'executing' && latestEvent.data?.stepName && (
            <div>Step: {latestEvent.data.stepName}</div>
          )}
          {phase === 'summary' && latestEvent.data?.summary && (
            <div className="line-clamp-2">{latestEvent.data.summary}</div>
          )}
        </div>
      )}
    </div>
  )
}


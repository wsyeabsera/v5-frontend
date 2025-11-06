'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Brain, ListChecks, Play, FileText, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { OrchestrationPhaseView } from './OrchestrationPhaseView'

interface OrchestrationStreamViewProps {
  events: Array<{
    type: string
    data: any
    timestamp: Date
  }>
  currentPhase: string | null
  executionId: string | null
}

const phaseIcons = {
  thought: Brain,
  plan: ListChecks,
  executing: Play,
  summary: FileText,
  paused: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
}

const phaseColors = {
  thought: 'bg-blue-500',
  plan: 'bg-purple-500',
  executing: 'bg-green-500',
  summary: 'bg-orange-500',
  paused: 'bg-yellow-500',
  completed: 'bg-green-600',
  failed: 'bg-red-500',
}

export function OrchestrationStreamView({
  events,
  currentPhase,
  executionId,
}: OrchestrationStreamViewProps) {
  const groupedEvents = events.reduce((acc, event) => {
    const phase = event.type === 'step' ? 'executing' : event.type
    if (!acc[phase]) {
      acc[phase] = []
    }
    acc[phase].push(event)
    return acc
  }, {} as Record<string, typeof events>)

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Execution Progress</h3>
          {executionId && (
            <Badge variant="outline" className="font-mono text-xs">
              {executionId.substring(0, 8)}...
            </Badge>
          )}
        </div>

        <div className="space-y-3">
          {/* Thought Phase */}
          {groupedEvents.thought && (
            <OrchestrationPhaseView
              phase="thought"
              events={groupedEvents.thought}
              isActive={currentPhase === 'thought'}
              isComplete={!!currentPhase && ['plan', 'executing', 'summary', 'completed'].includes(currentPhase)}
            />
          )}

          {/* Plan Phase */}
          {groupedEvents.plan && (
            <OrchestrationPhaseView
              phase="plan"
              events={groupedEvents.plan}
              isActive={currentPhase === 'plan'}
              isComplete={!!currentPhase && ['executing', 'summary', 'completed'].includes(currentPhase)}
            />
          )}

          {/* Execute Phase */}
          {groupedEvents.step && (
            <OrchestrationPhaseView
              phase="executing"
              events={groupedEvents.step}
              isActive={currentPhase === 'executing'}
              isComplete={!!currentPhase && ['summary', 'completed'].includes(currentPhase)}
            />
          )}

          {/* Summary Phase */}
          {groupedEvents.summary && (
            <OrchestrationPhaseView
              phase="summary"
              events={groupedEvents.summary}
              isActive={currentPhase === 'summary'}
              isComplete={currentPhase === 'completed'}
            />
          )}

          {/* Errors */}
          {groupedEvents.error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="font-medium text-sm text-red-900 dark:text-red-100">Error</span>
              </div>
              {groupedEvents.error.map((event, idx) => (
                <div key={idx} className="text-xs text-red-700 dark:text-red-300">
                  {event.data?.error || JSON.stringify(event.data)}
                </div>
              ))}
            </div>
          )}

          {/* Complete */}
          {groupedEvents.complete && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="font-medium text-sm text-green-900 dark:text-green-100">
                  Execution Completed
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}


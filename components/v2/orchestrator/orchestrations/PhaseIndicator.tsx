'use client'

import React from 'react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Brain, ListChecks, Play, FileText, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Phase = 'thought' | 'plan' | 'executing' | 'summary' | 'completed' | 'failed'

interface PhaseIndicatorProps {
  currentPhase: Phase | null
  isLoading?: boolean
  className?: string
}

const phases: Array<{ key: Phase; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'thought', label: 'Thinking', icon: Brain },
  { key: 'plan', label: 'Planning', icon: ListChecks },
  { key: 'executing', label: 'Executing', icon: Play },
  { key: 'summary', label: 'Summary', icon: FileText },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
  { key: 'failed', label: 'Failed', icon: XCircle },
]

export function PhaseIndicator({ currentPhase, isLoading, className }: PhaseIndicatorProps) {
  if (!currentPhase) return null

  const currentPhaseIndex = phases.findIndex((p) => p.key === currentPhase)
  const progressPercentage = currentPhase === 'completed' ? 100 : currentPhase === 'failed' ? 0 : ((currentPhaseIndex + 1) / phases.length) * 100

  return (
    <div className={cn('space-y-3', className)}>
      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Execution Progress</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* Phase Timeline */}
      <div className="flex items-center justify-between">
        {phases.slice(0, 4).map((phase, index) => {
          const Icon = phase.icon
          const isActive = currentPhase === phase.key
          const isCompleted = currentPhaseIndex > index || currentPhase === 'completed'
          const isPending = currentPhaseIndex < index

          return (
            <div key={phase.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all',
                    isCompleted && 'bg-primary border-primary text-primary-foreground',
                    isActive && !isCompleted && 'bg-primary/20 border-primary text-primary animate-pulse',
                    isPending && 'bg-muted border-muted-foreground/20 text-muted-foreground'
                  )}
                >
                  {isActive && isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium transition-colors',
                    isActive && 'text-foreground',
                    isCompleted && 'text-muted-foreground',
                    isPending && 'text-muted-foreground/50'
                  )}
                >
                  {phase.label}
                </span>
              </div>
              {index < phases.slice(0, 4).length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 mx-1 transition-colors',
                    isCompleted || (isActive && index < currentPhaseIndex) ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


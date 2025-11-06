'use client'

import React from 'react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { PhaseIndicator, Phase } from './PhaseIndicator'
import { cn } from '@/lib/utils'

interface ExecutionProgressProps {
  currentPhase: Phase | null
  progressPercentage?: number
  isLoading?: boolean
  className?: string
  compact?: boolean
}

export function ExecutionProgress({ currentPhase, progressPercentage, isLoading, className, compact = false }: ExecutionProgressProps) {
  if (!currentPhase) return null

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <PhaseIndicator currentPhase={currentPhase} isLoading={isLoading} />
      </div>
    )
  }

  return (
    <div className={cn('space-y-3 p-4 bg-muted/30 rounded-lg border', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Execution Progress</span>
        {progressPercentage !== undefined && (
          <Badge variant="secondary" className="gap-1.5">
            {Math.round(progressPercentage)}%
          </Badge>
        )}
      </div>
      {progressPercentage !== undefined && (
        <Progress value={progressPercentage} className="h-2" />
      )}
      <PhaseIndicator currentPhase={currentPhase} isLoading={isLoading} />
    </div>
  )
}


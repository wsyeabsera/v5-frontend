'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, XCircle, Circle, Brain, FileText, Play, FileCheck, AlertTriangle } from 'lucide-react'
import { PhaseContent } from './PhaseContent'
import { extractPhaseErrors, extractExecutionError, formatError, type ExtractedError } from './errorUtils'
import { Alert, AlertDescription } from '@/components/ui/alert'

type PhaseStatus = 'pending' | 'active' | 'completed' | 'failed'

interface Phase {
  id: string
  name: string
  icon: React.ReactNode
  status: PhaseStatus
  startedAt?: Date
  completedAt?: Date
  content?: any
  error?: ExtractedError | null
}

interface PhaseTimelineProps {
  execution: any
  testRun?: any
}

export function PhaseTimeline({ execution, testRun }: PhaseTimelineProps) {
  if (!execution) {
    return null
  }

  const exec = execution?.data || execution
  const status = exec?.status || 'pending'
  const timestamps = exec?.timestamps || {}
  const results = exec?.results || {}

  // Extract errors from execution
  const executionError = extractExecutionError(execution)
  const phaseErrors = extractPhaseErrors(execution)
  
  // Check test run for phase-specific error information
  const run = testRun?.data || testRun
  const firstResult = run?.results?.[0]
  const testErrorPhase = firstResult?.error?.phase

  // Map execution status to phase states
  const getPhaseStatus = (phaseName: string): PhaseStatus => {
    // Check if this phase has an error
    const phaseError = phaseErrors[phaseName]
    if (phaseError) return 'failed'
    
    // Check if test error indicates this phase failed
    if (testErrorPhase === phaseName) return 'failed'
    
    if (status === 'failed') {
      // Determine which phase failed based on execution state
      // If execution failed, check which phase was active
      if (phaseName === 'thought' && status === 'thought') return 'failed'
      if (phaseName === 'plan' && (status === 'planning' || status === 'failed')) {
        // If plan phase was active or execution failed during planning
        if (!timestamps.planCompleted && timestamps.planStarted) return 'failed'
      }
      if (phaseName === 'execution' && (status === 'executing' || status === 'failed')) {
        // If execution phase was active or failed
        if (!timestamps.executionCompleted && timestamps.executionStarted) return 'failed'
      }
      if (phaseName === 'summary' && status === 'failed') {
        // If summary phase failed
        if (timestamps.summaryStarted && !timestamps.summaryCompleted) return 'failed'
      }
    }

    if (phaseName === 'thought') {
      if (timestamps.thoughtCompleted) return 'completed'
      if (status === 'thought' || timestamps.thoughtStarted) return 'active'
      return 'pending'
    }
    if (phaseName === 'plan') {
      if (timestamps.planCompleted) return 'completed'
      if (status === 'planning' || timestamps.planStarted) return 'active'
      if (timestamps.thoughtCompleted) return 'pending'
      return 'pending'
    }
    if (phaseName === 'execution') {
      if (timestamps.executionCompleted) return 'completed'
      if (status === 'executing' || timestamps.executionStarted) return 'active'
      if (timestamps.planCompleted) return 'pending'
      return 'pending'
    }
    if (phaseName === 'summary') {
      if (timestamps.summaryCompleted || status === 'completed') return 'completed'
      if (status === 'completed' || timestamps.summaryStarted) return 'active'
      if (timestamps.executionCompleted) return 'pending'
      return 'pending'
    }
    return 'pending'
  }

  const phases: Phase[] = [
    {
      id: 'thought',
      name: 'Thought Phase',
      icon: <Brain className="w-5 h-5" />,
      status: getPhaseStatus('thought'),
      startedAt: timestamps.thoughtStarted ? new Date(timestamps.thoughtStarted) : undefined,
      completedAt: timestamps.thoughtCompleted ? new Date(timestamps.thoughtCompleted) : undefined,
      content: results.thought,
      error: phaseErrors.thought,
    },
    {
      id: 'plan',
      name: 'Plan Phase',
      icon: <FileText className="w-5 h-5" />,
      status: getPhaseStatus('plan'),
      startedAt: timestamps.planStarted ? new Date(timestamps.planStarted) : undefined,
      completedAt: timestamps.planCompleted ? new Date(timestamps.planCompleted) : undefined,
      content: results.plan,
      error: phaseErrors.plan,
    },
    {
      id: 'execution',
      name: 'Execution Phase',
      icon: <Play className="w-5 h-5" />,
      status: getPhaseStatus('execution'),
      startedAt: timestamps.executionStarted ? new Date(timestamps.executionStarted) : undefined,
      completedAt: timestamps.executionCompleted ? new Date(timestamps.executionCompleted) : undefined,
      content: results.execution,
      error: phaseErrors.execution,
    },
    {
      id: 'summary',
      name: 'Summary Phase',
      icon: <FileCheck className="w-5 h-5" />,
      status: getPhaseStatus('summary'),
      startedAt: timestamps.summaryStarted ? new Date(timestamps.summaryStarted) : undefined,
      completedAt: timestamps.summaryCompleted ? new Date(timestamps.summaryCompleted) : undefined,
      content: results.summary,
      error: phaseErrors.summary,
    },
  ]

  const getStatusIcon = (phaseStatus: PhaseStatus) => {
    switch (phaseStatus) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'active':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <Circle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusBadge = (phaseStatus: PhaseStatus) => {
    switch (phaseStatus) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600">Completed</Badge>
      case 'active':
        return <Badge variant="default" className="bg-blue-600">In Progress</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Pending</Badge>
    }
  }

  const calculateDuration = (startedAt?: Date, completedAt?: Date) => {
    if (!startedAt) return null
    const end = completedAt || new Date()
    const duration = end.getTime() - startedAt.getTime()
    return `${Math.round(duration / 1000)}s`
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">Execution Phases</h3>
        {executionError && (
          <Alert variant="destructive" className="flex-1 ml-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              <strong>Execution Error:</strong> {formatError(executionError)}
            </AlertDescription>
          </Alert>
        )}
      </div>
      <div className="space-y-6">
        {phases.map((phase, index) => (
          <div key={phase.id} className="relative">
            {/* Timeline connector */}
            {index < phases.length - 1 && (
              <div
                className={`absolute left-[22px] top-[40px] w-0.5 h-full ${
                  phase.status === 'completed' ? 'bg-green-600' : phase.status === 'failed' ? 'bg-red-600' : 'bg-gray-300'
                }`}
                style={{ height: 'calc(100% + 1.5rem)' }}
              />
            )}

            <div className="flex gap-4">
              {/* Status icon */}
              <div className="flex-shrink-0 mt-1">{getStatusIcon(phase.status)}</div>

              {/* Phase content */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {phase.icon}
                    <h4 className="text-lg font-semibold">{phase.name}</h4>
                    {phase.error && (
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  {getStatusBadge(phase.status)}
                </div>

                {/* Error summary in header */}
                {phase.error && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-3 w-3" />
                    <AlertDescription className="text-xs">
                      <strong>Error:</strong> {phase.error.message}
                      {phase.error.code && ` [${phase.error.code}]`}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Timestamps */}
                {(phase.startedAt || phase.completedAt) && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    {phase.startedAt && (
                      <div>Started: {phase.startedAt.toLocaleString()}</div>
                    )}
                    {phase.completedAt && (
                      <div>Completed: {phase.completedAt.toLocaleString()}</div>
                    )}
                    {phase.startedAt && (
                      <div>
                        Duration:{' '}
                        {calculateDuration(phase.startedAt, phase.completedAt) || 'In progress...'}
                      </div>
                    )}
                  </div>
                )}

                {/* Phase content */}
                {(phase.content || phase.error) && (
                  <div className="mt-4">
                    <PhaseContent phaseId={phase.id} content={phase.content} error={phase.error} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}


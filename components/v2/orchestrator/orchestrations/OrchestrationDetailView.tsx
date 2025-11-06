'use client'

import { useState } from 'react'
import { useOrchestration, useOrchestrators } from '@/lib/queries-v2'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { JsonViewer } from '@/components/ui/json-viewer'
import {
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Brain,
  ListChecks,
  Play,
  FileText,
  Copy,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface OrchestrationDetailViewProps {
  executionId: string
}

export function OrchestrationDetailView({ executionId }: OrchestrationDetailViewProps) {
  const { data: orchestration, isLoading, error } = useOrchestration(executionId)
  const { data: orchestrators } = useOrchestrators()
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(['thought', 'plan', 'execution', 'summary']))
  const [copiedId, setCopiedId] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Loading orchestration details...</span>
      </div>
    )
  }

  if (error || !orchestration) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 text-destructive">
          <AlertCircle className="w-5 h-5" />
          <div>
            <div className="font-semibold">Failed to load orchestration</div>
            <div className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : 'Orchestration not found'}
            </div>
          </div>
        </div>
      </Card>
    )
  }

  const orchestrator = Array.isArray(orchestrators)
    ? orchestrators.find((o: any) => o._id === orchestration.orchestratorId)
    : null

  const getStatusBadge = (status: string | undefined) => {
    if (!status) return <Badge variant="outline">-</Badge>
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', className: string }> = {
      completed: { variant: 'default', className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' },
      failed: { variant: 'destructive', className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20' },
      pending: { variant: 'secondary', className: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20' },
      thought: { variant: 'secondary', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' },
      planning: { variant: 'secondary', className: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20' },
      executing: { variant: 'secondary', className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' },
      paused: { variant: 'outline', className: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20' },
    }
    const config = statusConfig[status] || { variant: 'outline' as const, className: '' }
    return (
      <Badge variant={config.variant} className={config.className}>
        {status}
      </Badge>
    )
  }

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const formatDuration = (start: Date | string | undefined, end: Date | string | undefined) => {
    if (!start || !end) return '-'
    const startTime = new Date(start).getTime()
    const endTime = new Date(end).getTime()
    const duration = endTime - startTime
    if (duration < 1000) return `${duration}ms`
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`
    const minutes = Math.floor(duration / 60000)
    const seconds = Math.floor((duration % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }

  const getPhaseStatus = (phase: string, timestamps: any) => {
    const phaseMap: Record<string, { started: string; completed: string }> = {
      thought: { started: 'thoughtStarted', completed: 'thoughtCompleted' },
      plan: { started: 'planStarted', completed: 'planCompleted' },
      execution: { started: 'executionStarted', completed: 'executionCompleted' },
      summary: { started: 'summaryStarted', completed: 'summaryCompleted' },
    }
    const keys = phaseMap[phase]
    if (!keys) return { started: false, completed: false, startedAt: null, completedAt: null }
    
    return {
      started: !!timestamps[keys.started],
      completed: !!timestamps[keys.completed],
      startedAt: timestamps[keys.started] || null,
      completedAt: timestamps[keys.completed] || null,
    }
  }

  const togglePhase = (phase: string) => {
    const newExpanded = new Set(expandedPhases)
    if (newExpanded.has(phase)) {
      newExpanded.delete(phase)
    } else {
      newExpanded.add(phase)
    }
    setExpandedPhases(newExpanded)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const phases = [
    { key: 'thought', label: 'Thought', icon: Brain, color: 'text-blue-600 dark:text-blue-400' },
    { key: 'plan', label: 'Plan', icon: ListChecks, color: 'text-purple-600 dark:text-purple-400' },
    { key: 'execution', label: 'Execution', icon: Play, color: 'text-green-600 dark:text-green-400' },
    { key: 'summary', label: 'Summary', icon: FileText, color: 'text-orange-600 dark:text-orange-400' },
  ]

  const timestamps = orchestration.timestamps || {}

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">Execution Details</h2>
                {getStatusBadge(orchestration.status)}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Execution ID:</span>
                <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
                  {orchestration._id?.toString() || '-'}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => copyToClipboard(orchestration._id?.toString() || '')}
                >
                  {copiedId ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Orchestrator</div>
              <div className="text-sm">{orchestrator?.name || 'Unknown'}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Started</div>
              <div className="text-sm">{formatDate(orchestration.startedAt || timestamps.started)}</div>
            </div>
            {orchestration.completedAt || timestamps.completed ? (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Completed</div>
                <div className="text-sm">{formatDate(orchestration.completedAt || timestamps.completed)}</div>
              </div>
            ) : null}
            {(orchestration.startedAt || timestamps.started) && (orchestration.completedAt || timestamps.completed) ? (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Total Duration</div>
                <div className="text-sm">
                  {formatDuration(
                    orchestration.startedAt || timestamps.started,
                    orchestration.completedAt || timestamps.completed
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {orchestration.userQuery && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">User Query</div>
                <Card className="p-4 bg-muted/30">
                  <div className="text-sm whitespace-pre-wrap">{orchestration.userQuery}</div>
                </Card>
              </div>
            </>
          )}

          {(orchestration.executionCode || orchestration.executionMessage) && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Execution Info</div>
                {orchestration.executionCode && (
                  <div className="text-sm font-mono">{orchestration.executionCode}</div>
                )}
                {orchestration.executionMessage && (
                  <div className="text-sm text-muted-foreground">{orchestration.executionMessage}</div>
                )}
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Phase Timeline */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Execution Phases</h3>
        <div className="space-y-3">
          {phases.map((phase) => {
            const phaseStatus = getPhaseStatus(phase.key, timestamps)
            const isExpanded = expandedPhases.has(phase.key)
            const Icon = phase.icon
            const phaseResult = orchestration.results?.[phase.key as keyof typeof orchestration.results]

            return (
              <Collapsible
                key={phase.key}
                open={isExpanded}
                onOpenChange={() => togglePhase(phase.key)}
              >
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                          <Icon className={cn('w-5 h-5', phase.color)} />
                          <span className="font-medium capitalize">{phase.label}</span>
                          {phaseStatus.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : phaseStatus.started ? (
                            <Clock className="w-4 h-4 text-yellow-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-gray-400" />
                          )}
                          <Badge
                            variant={phaseStatus.completed ? 'default' : phaseStatus.started ? 'secondary' : 'outline'}
                            className="text-xs"
                          >
                            {phaseStatus.completed ? 'Completed' : phaseStatus.started ? 'In Progress' : 'Pending'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {phaseStatus.startedAt && (
                            <span>Started: {formatDate(phaseStatus.startedAt)}</span>
                          )}
                          {phaseStatus.completedAt && phaseStatus.startedAt && (
                            <span className="ml-2">
                              Duration: {formatDuration(phaseStatus.startedAt, phaseStatus.completedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-4 border-t">
                      {/* Phase Timestamps */}
                      <div className="grid grid-cols-2 gap-4 pt-4 text-sm">
                        <div>
                          <div className="text-muted-foreground mb-1">Started</div>
                          <div>{formatDate(phaseStatus.startedAt)}</div>
                        </div>
                        {phaseStatus.completedAt && (
                          <div>
                            <div className="text-muted-foreground mb-1">Completed</div>
                            <div>{formatDate(phaseStatus.completedAt)}</div>
                          </div>
                        )}
                        {phaseStatus.startedAt && phaseStatus.completedAt && (
                          <div className="col-span-2">
                            <div className="text-muted-foreground mb-1">Duration</div>
                            <div>{formatDuration(phaseStatus.startedAt, phaseStatus.completedAt)}</div>
                          </div>
                        )}
                      </div>

                      {/* Phase Results */}
                      {phaseResult && (
                        <>
                          <Separator />
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-muted-foreground">
                              {phase.key === 'summary' ? 'Summary Content' : `${phase.label} Results`}
                            </div>
                            {phase.key === 'summary' ? (
                              <Card className="p-4 bg-muted/30">
                                <div className="text-sm whitespace-pre-wrap">
                                  {typeof phaseResult === 'string' ? phaseResult : JSON.stringify(phaseResult, null, 2)}
                                </div>
                              </Card>
                            ) : (
                              <JsonViewer
                                data={phaseResult}
                                collapsible={true}
                                defaultExpanded={false}
                                showCopyButton={true}
                                maxHeight="400px"
                              />
                            )}
                          </div>
                        </>
                      )}

                      {!phaseResult && phaseStatus.completed && (
                        <div className="text-sm text-muted-foreground py-4">
                          No results available for this phase
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )
          })}
        </div>
      </Card>

      {/* Conversation History */}
      {orchestration.conversationHistory && orchestration.conversationHistory.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Conversation History</h3>
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-3">
              {orchestration.conversationHistory.map((msg: any, idx: number) => (
                <Card key={idx} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {msg.role}
                    </Badge>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}

      {/* Pending Inputs */}
      {orchestration.pendingInputs && orchestration.pendingInputs.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Pending Inputs</h3>
          <div className="space-y-3">
            {orchestration.pendingInputs.map((input: any, idx: number) => (
              <Card key={idx} className="p-4">
                <div className="text-sm">
                  <div className="font-medium mb-1">{input.field}</div>
                  {input.description && (
                    <div className="text-muted-foreground text-xs mb-1">{input.description}</div>
                  )}
                  {input.stepId && (
                    <div className="text-xs text-muted-foreground">Step: {input.stepId}</div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Error Details */}
      {orchestration.results?.error && (
        <Card className="p-6 border-destructive">
          <h3 className="text-lg font-semibold mb-4 text-destructive">Error Details</h3>
          <JsonViewer
            data={orchestration.results.error}
            collapsible={true}
            defaultExpanded={true}
            showCopyButton={true}
            maxHeight="400px"
          />
        </Card>
      )}

      {/* Raw Data (Collapsible) */}
      <Collapsible>
        <Card className="p-6">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <h3 className="text-lg font-semibold">Raw Data</h3>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-4">
              <JsonViewer
                data={orchestration}
                collapsible={true}
                defaultExpanded={false}
                showCopyButton={true}
                maxHeight="600px"
              />
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  )
}


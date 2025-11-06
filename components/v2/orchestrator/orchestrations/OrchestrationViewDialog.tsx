'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useOrchestration } from '@/lib/queries-v2'
import { Loader2, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

interface OrchestrationViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orchestration?: any
}

export function OrchestrationViewDialog({
  open,
  onOpenChange,
  orchestration,
}: OrchestrationViewDialogProps) {
  const { data: fullOrchestration, isLoading } = useOrchestration(
    orchestration?._id || ''
  )

  const displayOrchestration = fullOrchestration || orchestration
  if (!displayOrchestration) return null

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-3">Loading orchestration details...</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

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

  const phases = ['thought', 'plan', 'execution', 'summary']
  const timestamps = displayOrchestration.timestamps || {}

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Orchestration Details</DialogTitle>
          <DialogDescription>Execution details and results</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="phases">Phases</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4 py-4">
                {/* Status and Execution ID */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Status</div>
                    {getStatusBadge(displayOrchestration.status)}
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Execution ID</div>
                    <div className="text-xs font-mono text-muted-foreground break-all">
                      {displayOrchestration._id}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* User Query */}
                {displayOrchestration.userQuery && (
                  <>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">User Query</div>
                      <Card className="p-3">
                        <div className="text-sm">{displayOrchestration.userQuery}</div>
                      </Card>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Execution Code and Message */}
                {(displayOrchestration.executionCode || displayOrchestration.executionMessage) && (
                  <>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">Execution Info</div>
                      {displayOrchestration.executionCode && (
                        <div className="text-sm font-mono">{displayOrchestration.executionCode}</div>
                      )}
                      {displayOrchestration.executionMessage && (
                        <div className="text-sm text-muted-foreground">{displayOrchestration.executionMessage}</div>
                      )}
                    </div>
                    <Separator />
                  </>
                )}

                {/* Timestamps */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Timestamps</div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="text-muted-foreground">Started</div>
                      <div>{formatDate(displayOrchestration.startedAt || timestamps.started)}</div>
                    </div>
                    {(displayOrchestration.completedAt || timestamps.completed) && (
                      <div>
                        <div className="text-muted-foreground">Completed</div>
                        <div>{formatDate(displayOrchestration.completedAt || timestamps.completed)}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="phases" className="space-y-4">
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4 py-4">
                {phases.map((phase) => {
                  const phaseStatus = getPhaseStatus(phase, timestamps)
                  return (
                    <Card key={phase} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{phase}</span>
                          {phaseStatus.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : phaseStatus.started ? (
                            <Clock className="w-4 h-4 text-yellow-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <Badge variant={phaseStatus.completed ? 'default' : phaseStatus.started ? 'secondary' : 'outline'}>
                          {phaseStatus.completed ? 'Completed' : phaseStatus.started ? 'In Progress' : 'Pending'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                        <div>
                          <div>Started:</div>
                          <div>{formatDate(phaseStatus.startedAt)}</div>
                        </div>
                        {phaseStatus.completedAt && (
                          <div>
                            <div>Completed:</div>
                            <div>{formatDate(phaseStatus.completedAt)}</div>
                          </div>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4 py-4">
                {displayOrchestration.results && (
                  <>
                    {displayOrchestration.results.thought && (
                      <>
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Thought Results</div>
                          <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-[200px]">
                            {JSON.stringify(displayOrchestration.results.thought, null, 2)}
                          </pre>
                        </div>
                        <Separator />
                      </>
                    )}
                    {displayOrchestration.results.plan && (
                      <>
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Plan Results</div>
                          <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-[200px]">
                            {JSON.stringify(displayOrchestration.results.plan, null, 2)}
                          </pre>
                        </div>
                        <Separator />
                      </>
                    )}
                    {displayOrchestration.results.execution && (
                      <>
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Execution Results</div>
                          <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-[200px]">
                            {JSON.stringify(displayOrchestration.results.execution, null, 2)}
                          </pre>
                        </div>
                        <Separator />
                      </>
                    )}
                    {displayOrchestration.results.summary && (
                      <>
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Summary</div>
                          <Card className="p-3">
                            <div className="text-sm whitespace-pre-wrap">{displayOrchestration.results.summary}</div>
                          </Card>
                        </div>
                        <Separator />
                      </>
                    )}
                    {displayOrchestration.results.error && (
                      <>
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-destructive">Error Details</div>
                          <Card className="p-3 border-destructive">
                            <pre className="text-xs text-destructive overflow-auto max-h-[200px]">
                              {typeof displayOrchestration.results.error === 'string'
                                ? displayOrchestration.results.error
                                : JSON.stringify(displayOrchestration.results.error, null, 2)}
                            </pre>
                          </Card>
                        </div>
                      </>
                    )}
                  </>
                )}
                {!displayOrchestration.results && (
                  <div className="text-center text-muted-foreground py-8">No results available</div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4 py-4">
                {/* Conversation History */}
                {displayOrchestration.conversationHistory && displayOrchestration.conversationHistory.length > 0 && (
                  <>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">Conversation History</div>
                      <div className="space-y-2">
                        {displayOrchestration.conversationHistory.map((msg: any, idx: number) => (
                          <Card key={idx} className="p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {msg.role}
                              </Badge>
                            </div>
                            <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                          </Card>
                        ))}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Pending Inputs */}
                {displayOrchestration.pendingInputs && displayOrchestration.pendingInputs.length > 0 && (
                  <>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">Pending Inputs</div>
                      <div className="space-y-2">
                        {displayOrchestration.pendingInputs.map((input: any, idx: number) => (
                          <Card key={idx} className="p-3">
                            <div className="text-sm">
                              <div className="font-medium">{input.field}</div>
                              {input.description && (
                                <div className="text-muted-foreground text-xs mt-1">{input.description}</div>
                              )}
                              {input.stepId && (
                                <div className="text-xs text-muted-foreground mt-1">Step: {input.stepId}</div>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* All Timestamps */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">All Timestamps</div>
                  <div className="space-y-1 text-xs font-mono">
                    {Object.entries(timestamps).map(([key, value]) => (
                      value && (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground">{key}:</span>
                          <span>{formatDate(value as string)}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>

                {/* Raw Data */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Raw Data</div>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-[300px]">
                    {JSON.stringify(displayOrchestration, null, 2)}
                  </pre>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}


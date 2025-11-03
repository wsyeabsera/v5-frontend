'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Plan, ExecutorAgentOutput, RequestContext, AgentConfig } from '@/types'
import { 
  Target, 
  Play, 
  Settings, 
  ChevronRight, 
  ChevronDown, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  RefreshCw,
  Sparkles
} from 'lucide-react'
import { useState } from 'react'

interface PlanTreeViewProps {
  plan: Plan | null
  executionResult?: ExecutorAgentOutput | null
  requests: (RequestContext & { executionOutputExists?: boolean })[]
  selectedRequestId: string | null
  onRequestSelect: (request: RequestContext) => void
  agentConfigs: AgentConfig[]
  selectedAgentId: string
  onAgentSelect: (agentId: string) => void
  onExecute: () => void
  loading: boolean
  critique?: any
}

export function PlanTreeView({
  plan,
  executionResult,
  requests,
  selectedRequestId,
  onRequestSelect,
  agentConfigs,
  selectedAgentId,
  onAgentSelect,
  onExecute,
  loading,
  critique,
}: PlanTreeViewProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())
  const [configOpen, setConfigOpen] = useState(false)

  const toggleStep = (stepId: string) => {
    const newExpanded = new Set(expandedSteps)
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId)
    } else {
      newExpanded.add(stepId)
    }
    setExpandedSteps(newExpanded)
  }

  const getStepStatus = (stepId: string) => {
    if (!executionResult) return 'pending'
    const stepResult = executionResult.executionResult.steps.find(s => s.stepId === stepId)
    if (!stepResult) return 'pending'
    if (stepResult.success) return 'completed'
    return 'failed'
  }

  const getStepUpdate = (stepId: string) => {
    if (!executionResult?.executionResult.planUpdates) return null
    return executionResult.executionResult.planUpdates.find(u => u.stepId === stepId)
  }

  const selectedConfig = agentConfigs.find(c => c.agentId === selectedAgentId)

  return (
    <div className="space-y-4 h-full">
      {/* Request Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4" />
            Select Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Select
            value={selectedRequestId || ''}
            onValueChange={(value) => {
              const request = requests.find(r => r.requestId === value)
              if (request) onRequestSelect(request)
            }}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a request..." />
            </SelectTrigger>
            <SelectContent>
              {requests.map((request) => (
                <SelectItem key={request.requestId} value={request.requestId}>
                  <div className="flex items-center gap-2">
                    <code className="text-xs">{request.requestId.substring(0, 8)}...</code>
                    {request.executionOutputExists && (
                      <Badge variant="outline" className="text-xs">Executed</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Agent Configuration */}
      <Card>
        <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Agent Config
                </CardTitle>
                <ChevronDown className={`w-4 h-4 transition-transform ${configOpen ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <Select value={selectedAgentId} onValueChange={onAgentSelect} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {agentConfigs.map((config) => (
                    <SelectItem key={config.agentId} value={config.agentId}>
                      {config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedConfig && (
                <p className="text-xs text-muted-foreground mt-2">{selectedConfig.description}</p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Plan Tree */}
      {plan ? (
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4" />
                Plan Structure
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {plan.steps.length} steps
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{plan.goal}</p>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-2">
            {plan.steps.map((step) => {
              const status = getStepStatus(step.id)
              const update = getStepUpdate(step.id)
              const isExpanded = expandedSteps.has(step.id)

              return (
                <div
                  key={step.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    status === 'completed'
                      ? 'border-green-500/30 bg-green-500/5'
                      : status === 'failed'
                      ? 'border-red-500/30 bg-red-500/5'
                      : 'border-border bg-muted/30'
                  }`}
                >
                  <div
                    className="flex items-start gap-2 cursor-pointer"
                    onClick={() => toggleStep(step.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-semibold">Step {step.order}</span>
                        {status === 'completed' && (
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        )}
                        {status === 'failed' && (
                          <XCircle className="w-3 h-3 text-red-600" />
                        )}
                        {status === 'pending' && (
                          <Clock className="w-3 h-3 text-muted-foreground" />
                        )}
                        {update && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 text-xs">
                            <Sparkles className="w-2.5 h-2.5 mr-1" />
                            Updated
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-foreground line-clamp-2">{step.description}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">{step.action}</p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border/50 space-y-2 pl-6">
                      {step.parameters && Object.keys(step.parameters).length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Parameters</p>
                          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                            {JSON.stringify(step.parameters, null, 2)}
                          </pre>
                        </div>
                      )}
                      {update && (
                        <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                            LLM-Coordinated Update
                          </p>
                          <p className="text-xs text-muted-foreground mb-2">{update.reason}</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Before: </span>
                              <span className="font-mono">{JSON.stringify(update.originalParameters)}</span>
                            </div>
                            <div>
                              <span className="text-blue-600 dark:text-blue-400">After: </span>
                              <span className="font-mono text-blue-600 dark:text-blue-400">
                                {JSON.stringify(update.updatedParameters)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Target className="w-8 h-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No plan selected</p>
              <p className="text-xs text-muted-foreground mt-1">Select a request to load plan</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Execute Button */}
      {plan && (
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={onExecute}
              disabled={loading || !selectedAgentId}
              className="w-full gap-2"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Execute Plan
                </>
              )}
            </Button>
            {critique && (
              <div className="mt-3 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-1">
                  Critique: {critique.critique?.recommendation || 'Unknown'}
                </p>
                {critique.critique?.warnings && critique.critique.warnings.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {critique.critique.warnings.length} warning(s)
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}


'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plan, ExecutorAgentOutput } from '@/types'
import { Target, CheckCircle, XCircle, Clock, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Play } from 'lucide-react'

interface PlanPreviewProps {
  plan: Plan | null
  executionResult?: ExecutorAgentOutput | null
  onExecute?: () => void
  loading?: boolean
  executeDisabled?: boolean
}

export function PlanPreview({ 
  plan, 
  executionResult, 
  onExecute,
  loading = false,
  executeDisabled = false 
}: PlanPreviewProps) {
  if (!plan) {
    return (
      <Card className="sticky top-6">
        <CardHeader>
          <CardTitle className="text-sm">Plan Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Target className="w-12 h-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-muted-foreground mb-1">No Plan Selected</p>
            <p className="text-xs text-muted-foreground">Select a request to view the plan</p>
          </div>
        </CardContent>
      </Card>
    )
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

  const isStepCurrentlyExecuting = (stepId: string) => {
    if (!executionResult || loading) return false
    const stepResult = executionResult.executionResult.steps.find(s => s.stepId === stepId)
    // If step doesn't exist in results yet but we're loading, and it's the next step to execute
    if (loading && !stepResult) {
      const executedStepIds = executionResult.executionResult.steps.map(s => s.stepId)
      const stepIndex = plan.steps.findIndex(s => s.id === stepId)
      const previousStep = stepIndex > 0 ? plan.steps[stepIndex - 1] : null
      if (!previousStep || executedStepIds.includes(previousStep.id)) {
        return true
      }
    }
    return false
  }

  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Target className="w-4 h-4" />
          Plan Preview
          {executionResult && (
            <Badge variant="outline" className="ml-auto">
              {executionResult.executionResult.steps.filter(s => s.success).length} / {plan.steps.length} completed
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Plan Goal */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-3 h-3 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">Goal</p>
          </div>
          <p className="text-sm">{plan.goal}</p>
        </div>

        {/* Execute Button (shown when plan is selected but not executed) */}
        {!executionResult && onExecute && (
          <Button
            onClick={onExecute}
            disabled={executeDisabled || loading}
            className="w-full gap-2"
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Review & Execute
              </>
            )}
          </Button>
        )}

        {/* Steps */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs font-medium text-muted-foreground">Steps ({plan.steps.length})</p>
            {executionResult && executionResult.executionResult.planUpdates && executionResult.executionResult.planUpdates.length > 0 && (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900">
                <Sparkles className="w-3 h-3 mr-1" />
                {executionResult.executionResult.planUpdates.length} {executionResult.executionResult.planUpdates.length === 1 ? 'update' : 'updates'}
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            {plan.steps.map((step, index) => {
              const status = getStepStatus(step.id)
              const update = getStepUpdate(step.id)
              const isExecuting = isStepCurrentlyExecuting(step.id)
              
              return (
                <div
                  key={step.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    status === 'completed'
                      ? 'border-green-500/30 bg-green-500/5'
                      : status === 'failed'
                      ? 'border-red-500/30 bg-red-500/5'
                      : isExecuting
                      ? 'border-primary/50 bg-primary/5 animate-pulse'
                      : 'border-border bg-muted/30'
                  }`}
                >
                  <div className="flex items-start gap-2 mb-1">
                    {/* Status Icon */}
                    <div className="mt-0.5">
                      {status === 'completed' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : status === 'failed' ? (
                        <XCircle className="w-4 h-4 text-red-600" />
                      ) : isExecuting ? (
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      ) : (
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    
                    {/* Step Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold">Step {step.order}</span>
                        {update && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 text-xs">
                            <RefreshCw className="w-2.5 h-2.5 mr-1" />
                            Updated
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-foreground mb-1">{step.description}</p>
                      <p className="text-xs text-muted-foreground font-mono">{step.action}</p>
                      
                      {/* Parameters (if any) */}
                      {step.parameters && Object.keys(step.parameters).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Parameters</p>
                          <div className="space-y-1">
                            {Object.entries(step.parameters).map(([key, value]) => {
                              const wasUpdated = update?.updatedParameters[key] !== undefined && 
                                                update?.updatedParameters[key] !== update?.originalParameters[key]
                              
                              return (
                                <div key={key} className={`text-xs ${wasUpdated ? 'bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20' : ''}`}>
                                  <span className="font-medium text-muted-foreground">{key}:</span>{' '}
                                  <span className={wasUpdated ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}>
                                    {typeof value === 'string' ? value : JSON.stringify(value)}
                                  </span>
                                  {wasUpdated && (
                                    <span className="ml-1 text-blue-500">✓</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Show what was updated if there's a plan update */}
                      {update && (
                        <div className="mt-2 pt-2 border-t border-blue-500/20">
                          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            LLM-Coordinated Update
                          </p>
                          <p className="text-xs text-muted-foreground mb-2">{update.reason}</p>
                          <div className="text-xs space-y-1">
                            <div>
                              <span className="text-muted-foreground">Before: </span>
                              <span className="font-mono">{JSON.stringify(update.originalParameters)}</span>
                            </div>
                            <div>
                              <span className="text-blue-600 dark:text-blue-400">After: </span>
                              <span className="font-mono text-blue-600 dark:text-blue-400">{JSON.stringify(update.updatedParameters)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Summary Stats (when execution is complete) */}
        {executionResult && (
          <div className="pt-3 border-t">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground mb-1">Success Rate</p>
                <p className="font-semibold">
                  {Math.round((executionResult.executionResult.steps.filter(s => s.success).length / plan.steps.length) * 100)}%
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Duration</p>
                <p className="font-semibold">{executionResult.executionResult.totalDuration}ms</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


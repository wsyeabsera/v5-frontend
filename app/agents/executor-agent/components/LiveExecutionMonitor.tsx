'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plan, ExecutorAgentOutput } from '@/types'
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2, 
  AlertTriangle,
  Zap,
  Wrench
} from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useState } from 'react'
import { StepOutputStream } from './StepOutputStream'

interface LiveExecutionMonitorProps {
  plan: Plan | null
  executionResult?: ExecutorAgentOutput | null
  loading: boolean
}

export function LiveExecutionMonitor({
  plan,
  executionResult,
  loading,
}: LiveExecutionMonitorProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())

  const toggleStep = (stepId: string) => {
    const newExpanded = new Set(expandedSteps)
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId)
    } else {
      newExpanded.add(stepId)
    }
    setExpandedSteps(newExpanded)
  }

  if (!plan) {
    return (
      <Card className="h-full">
        <CardContent className="pt-6 h-full flex items-center justify-center">
          <div className="text-center">
            <Play className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No execution in progress</p>
            <p className="text-xs text-muted-foreground mt-1">Select a plan and click Execute</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const executedCount = executionResult?.executionResult.steps.filter(s => s.success).length || 0
  const totalSteps = plan.steps.length
  const progress = totalSteps > 0 ? (executedCount / totalSteps) * 100 : 0
  const hasErrors = executionResult?.executionResult.errors.length || 0 > 0
  const isComplete = executionResult && executedCount === totalSteps

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            ) : isComplete ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : hasErrors ? (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            ) : (
              <Play className="w-5 h-5" />
            )}
            Live Execution Monitor
          </CardTitle>
          <Badge variant={isComplete ? 'default' : loading ? 'secondary' : 'outline'}>
            {executedCount} / {totalSteps}
          </Badge>
        </div>
        {plan && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-3">
        {plan.steps.map((step) => {
          const stepResult = executionResult?.executionResult.steps.find(s => s.stepId === step.id)
          const isExecuting = loading && !stepResult && executedCount === step.order - 1
          const status = stepResult?.success ? 'completed' : stepResult ? 'failed' : isExecuting ? 'executing' : 'pending'
          const isExpanded = expandedSteps.has(step.id)

          return (
            <Collapsible key={step.id} open={isExpanded} onOpenChange={() => toggleStep(step.id)}>
              <div
                className={`p-4 rounded-lg border transition-all ${
                  status === 'completed'
                    ? 'border-green-500/30 bg-green-500/5'
                    : status === 'failed'
                    ? 'border-red-500/30 bg-red-500/5'
                    : status === 'executing'
                    ? 'border-primary/50 bg-primary/5 animate-pulse'
                    : 'border-border bg-muted/30'
                }`}
              >
                <CollapsibleTrigger asChild>
                  <div className="cursor-pointer">
                    <div className="flex items-start gap-3">
                      {/* Status Icon */}
                      <div className="mt-0.5">
                        {status === 'completed' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : status === 'failed' ? (
                          <XCircle className="w-5 h-5 text-red-600" />
                        ) : status === 'executing' ? (
                          <Loader2 className="w-5 h-5 text-primary animate-spin" />
                        ) : (
                          <Clock className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>

                      {/* Step Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-sm">Step {step.order}</span>
                          <Badge
                            variant={
                              status === 'completed' ? 'default' :
                              status === 'failed' ? 'destructive' :
                              status === 'executing' ? 'secondary' : 'outline'
                            }
                            className="text-xs"
                          >
                            {status === 'executing' ? 'Executing...' :
                             status === 'completed' ? 'Completed' :
                             status === 'failed' ? 'Failed' : 'Pending'}
                          </Badge>
                          {stepResult?.errorType && (
                            <Badge variant="outline" className="text-xs">
                              {stepResult.errorType}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-foreground mb-1">{step.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {stepResult?.toolCalled && (
                            <code className="bg-muted px-2 py-1 rounded font-mono text-xs">
                              {stepResult.toolCalled}
                            </code>
                          )}
                          {stepResult?.duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {stepResult.duration}ms
                            </span>
                          )}
                          {stepResult && (stepResult.retries ?? 0) > 0 && (
                            <span>Retries: {stepResult.retries}</span>
                          )}
                        </div>
                        {stepResult?.error && (
                          <div className="mt-2 flex items-start gap-2 text-sm text-destructive">
                            <AlertTriangle className="w-4 h-4 mt-0.5" />
                            <span className="line-clamp-2">{stepResult.error}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
                    {stepResult && (
                      <StepOutputStream step={stepResult} />
                    )}

                    {/* Parameters Used */}
                    {stepResult?.parametersUsed && Object.keys(stepResult.parametersUsed).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <Wrench className="w-3 h-3" />
                          Parameters Used
                        </p>
                        <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                          {JSON.stringify(stepResult.parametersUsed, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Result Output */}
                    {stepResult?.success && stepResult.result && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          Result
                        </p>
                        <div className="bg-muted p-3 rounded-lg">
                          <pre className="text-xs overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto">
                            {typeof stepResult.result === 'string' 
                              ? stepResult.result
                              : JSON.stringify(stepResult.result, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )
        })}

        {/* No steps executed yet */}
        {!executionResult && !loading && (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Execution not started. Click "Execute Plan" to begin.
          </div>
        )}
      </CardContent>
    </Card>
  )
}


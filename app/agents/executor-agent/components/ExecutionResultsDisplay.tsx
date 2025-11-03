'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ExecutorAgentOutput, ExecutionResult } from '@/types'
import { CheckCircle, XCircle, Clock, AlertTriangle, Loader2, MessageSquare, RefreshCw, Play, Wrench, Sparkles, Brain, Zap } from 'lucide-react'
import { ExecutionStepCard } from './ExecutionStepCard'
import { ExecutionQuestions } from './ExecutionQuestions'
import { AdaptationsDisplay } from './AdaptationsDisplay'
import { ExecutionTimeline } from './ExecutionTimeline'

interface ExecutionResultsDisplayProps {
  result: ExecutorAgentOutput
  userFeedback: { questionId: string; answer: string }[]
  updateFeedback: (questionId: string, answer: string) => void
  onSubmitFeedback: () => void
  submittingFeedback: boolean
}

export function ExecutionResultsDisplay({
  result,
  userFeedback,
  updateFeedback,
  onSubmitFeedback,
  submittingFeedback,
}: ExecutionResultsDisplayProps) {
  const { executionResult } = result

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {executionResult.overallSuccess ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            Execution Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <Badge variant={executionResult.overallSuccess ? 'default' : 'destructive'}>
                {executionResult.overallSuccess ? 'Success' : 'Failed'}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Steps Executed</p>
              <p className="text-lg font-semibold">
                {executionResult.steps.filter(s => s.success).length} / {executionResult.steps.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Duration</p>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <p className="text-sm font-medium">{executionResult.totalDuration}ms</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Version</p>
              <Badge variant="outline">
                v{result.executionVersion || 1}
              </Badge>
            </div>
          </div>

          {result.critiqueAvailable && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Critique Recommendation:</p>
                <Badge variant={
                  result.critiqueRecommendation === 'approve' ? 'default' :
                  result.critiqueRecommendation === 'revise' ? 'secondary' : 'destructive'
                }>
                  {result.critiqueRecommendation}
                </Badge>
              </div>
            </div>
          )}

          {executionResult.errors.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">Errors</p>
              <div className="space-y-1">
                {executionResult.errors.map((error, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm text-destructive">
                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                    <span>{error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* LLM-Driven Features Summary */}
      {(executionResult.planUpdates && executionResult.planUpdates.length > 0) || 
       executionResult.adaptations.length > 0 ||
       result.critiqueRecommendation === 'approve-with-dynamic-fix' ? (
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              LLM-Driven Intelligence
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 ml-auto">
                <Sparkles className="w-3 h-3 mr-1" />
                Adaptive Execution
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.critiqueRecommendation === 'approve-with-dynamic-fix' && (
              <div className="flex items-start gap-2 p-2 rounded bg-blue-500/10 border border-blue-500/20">
                <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                    Dynamic Plan Fix Approved
                  </p>
                  <p className="text-xs text-muted-foreground">
                    The critic agent recognized that missing parameters could be dynamically resolved during execution.
                    The executor agent successfully extracted and updated parameters using LLM coordination.
                  </p>
                </div>
              </div>
            )}
            
            {executionResult.planUpdates && executionResult.planUpdates.length > 0 && (
              <div className="flex items-start gap-2 p-2 rounded bg-blue-500/10 border border-blue-500/20">
                <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                    {executionResult.planUpdates.length} Parameter {executionResult.planUpdates.length === 1 ? 'Update' : 'Updates'} via LLM Coordination
                  </p>
                  <p className="text-xs text-muted-foreground">
                    The executor agent analyzed previous step results and dynamically updated plan parameters using semantic LLM reasoning.
                  </p>
                </div>
              </div>
            )}

            {executionResult.adaptations.length > 0 && (
              <div className="flex items-start gap-2 p-2 rounded bg-blue-500/10 border border-blue-500/20">
                <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                    {executionResult.adaptations.length} Plan {executionResult.adaptations.length === 1 ? 'Adaptation' : 'Adaptations'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    The executor agent intelligently adapted plan steps based on execution context and LLM reasoning.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Execution Timeline */}
      {executionResult.steps.length > 1 && (
        <ExecutionTimeline steps={executionResult.steps} />
      )}

      {/* Step-by-Step Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Step-by-Step Execution
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {executionResult.steps.map((step) => {
            const planUpdate = executionResult.planUpdates?.find(u => u.stepId === step.stepId)
            return (
              <ExecutionStepCard key={step.stepId} step={step} planUpdate={planUpdate} />
            )
          })}
        </CardContent>
      </Card>

      {/* Adaptations */}
      {executionResult.adaptations.length > 0 && (
        <AdaptationsDisplay adaptations={executionResult.adaptations} />
      )}

      {/* Plan Updates - Detailed View */}
      {executionResult.planUpdates && executionResult.planUpdates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              LLM-Coordinated Parameter Updates
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900">
                {executionResult.planUpdates.length} {executionResult.planUpdates.length === 1 ? 'update' : 'updates'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground mb-4">
              The executor agent used LLM-driven semantic analysis to extract parameters from previous step results and dynamically update the plan.
              This enables execution of plans that initially appeared incomplete.
            </p>
            {executionResult.planUpdates.map((update, idx) => (
              <div key={idx} className="p-4 border rounded-lg bg-blue-500/5 border-blue-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-xs">
                    Step {update.stepOrder}
                  </Badge>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 text-xs">
                    <Brain className="w-3 h-3 mr-1" />
                    LLM-Coordinated
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(update.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-start gap-2 mb-3">
                  <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <p className="text-sm text-muted-foreground flex-1">{update.reason}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Original Parameters</p>
                    <pre className="bg-muted p-2 rounded overflow-x-auto">
                      {JSON.stringify(update.originalParameters, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="font-medium text-blue-600 dark:text-blue-400 mb-1">Updated Parameters</p>
                    <pre className="bg-blue-500/10 p-2 rounded overflow-x-auto border border-blue-500/20">
                      {JSON.stringify(update.updatedParameters, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Questions */}
      {executionResult.questionsAsked.length > 0 && (
        <ExecutionQuestions
          questions={executionResult.questionsAsked}
          userFeedback={userFeedback}
          updateFeedback={updateFeedback}
          onSubmitFeedback={onSubmitFeedback}
          submittingFeedback={submittingFeedback}
        />
      )}
    </div>
  )
}


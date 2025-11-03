'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExecutorAgentOutput, Plan } from '@/types'
import { Brain, Sparkles, AlertTriangle, CheckCircle, Zap, RefreshCw, Wrench } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useState } from 'react'
import { CoordinationDetails } from './CoordinationDetails'

interface LLMReasoningPanelProps {
  plan: Plan | null
  executionResult?: ExecutorAgentOutput | null
  loading: boolean
}

export function LLMReasoningPanel({
  plan,
  executionResult,
  loading,
}: LLMReasoningPanelProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const toggleItem = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  if (!plan) {
    return (
      <Card className="h-full">
        <CardContent className="pt-6 h-full flex items-center justify-center">
          <div className="text-center">
            <Brain className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No LLM reasoning available</p>
            <p className="text-xs text-muted-foreground mt-1">Execute a plan to see reasoning</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const planUpdates = executionResult?.executionResult.planUpdates || []
  const adaptations = executionResult?.executionResult.adaptations || []
  const hasDynamicFix = executionResult?.critiqueRecommendation === 'approve-with-dynamic-fix'
  const hasReasoning = planUpdates.length > 0 || adaptations.length > 0 || hasDynamicFix

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          LLM Reasoning & Decisions
          {hasReasoning && (
            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 ml-auto">
              <Sparkles className="w-3 h-3 mr-1" />
              Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-3">
        {/* Dynamic Fix Approval */}
        {hasDynamicFix && (
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                    Dynamic Plan Fix Approved
                  </p>
                  <p className="text-xs text-muted-foreground">
                    The critic recognized missing parameters could be dynamically resolved. 
                    Executor will extract parameters from earlier steps.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plan Updates (Parameter Coordination) */}
        {planUpdates.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-semibold">Parameter Coordination</span>
              <Badge variant="outline" className="text-xs">
                {planUpdates.length}
              </Badge>
            </div>
            {planUpdates.map((update, idx) => {
              const itemId = `update-${update.stepId}-${idx}`
              const isExpanded = expandedItems.has(itemId)
              return (
                <Collapsible key={itemId} open={isExpanded} onOpenChange={() => toggleItem(itemId)}>
                  <Card className="border-blue-500/20 bg-blue-500/5">
                    <CollapsibleTrigger asChild>
                      <CardContent className="cursor-pointer pt-4">
                        <div className="flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold">Step {update.stepOrder}</span>
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 text-xs">
                                LLM-Coordinated
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {update.reason}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <CoordinationDetails update={update} />
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )
            })}
          </div>
        )}

        {/* Plan Adaptations */}
        {adaptations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span className="text-xs font-semibold">Plan Adaptations</span>
              <Badge variant="outline" className="text-xs">
                {adaptations.length}
              </Badge>
            </div>
            {adaptations.map((adaptation, idx) => {
              const itemId = `adaptation-${adaptation.stepId}-${idx}`
              const isExpanded = expandedItems.has(itemId)
              return (
                <Collapsible key={itemId} open={isExpanded} onOpenChange={() => toggleItem(itemId)}>
                  <Card className="border-orange-500/20 bg-orange-500/5">
                    <CollapsibleTrigger asChild>
                      <CardContent className="cursor-pointer pt-4">
                        <div className="flex items-start gap-2">
                          <Wrench className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold">Step Adaptation</span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {adaptation.reason}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 space-y-2">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Original Action</p>
                          <code className="text-xs bg-muted px-2 py-1 rounded block">
                            {adaptation.originalAction}
                          </code>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">Adapted Action</p>
                          <code className="text-xs bg-orange-500/10 px-2 py-1 rounded block border border-orange-500/20">
                            {adaptation.adaptedAction}
                          </code>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )
            })}
          </div>
        )}

        {/* No reasoning yet */}
        {!hasReasoning && !loading && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Brain className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
            <p>No LLM reasoning events yet</p>
            <p className="text-xs mt-1">Reasoning will appear during execution</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Brain className="w-8 h-8 mx-auto mb-2 animate-pulse text-blue-600 dark:text-blue-400" />
            <p>LLM reasoning in progress...</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


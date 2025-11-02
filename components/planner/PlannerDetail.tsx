'use client'

import { PlannerAgentOutput } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Target, ListChecks, FileText, ArrowRight } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface PlannerDetailProps {
  result: PlannerAgentOutput
}

export function PlannerDetail({ result }: PlannerDetailProps) {
  return (
    <div className="space-y-4">
      {/* Request Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm">
            <span className="text-muted-foreground">Request ID:</span>
            <code className="ml-2 px-2 py-1 bg-muted rounded text-xs">
              {result.requestId}
            </code>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Agent Chain:</span>
            <span className="ml-2">{result.requestContext.agentChain.join(' → ')}</span>
          </div>
          {result.basedOnThoughts && result.basedOnThoughts.length > 0 && (
            <div className="text-sm">
              <span className="text-muted-foreground">Based on Thoughts:</span>
              <span className="ml-2">{result.basedOnThoughts.length} thought(s)</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Goal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-5 h-5" />
            Plan Goal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted rounded-lg">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {result.plan.goal}
              </ReactMarkdown>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Confidence</span>
                <span className="text-sm font-semibold">
                  {(result.plan.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${result.plan.confidence * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Complexity</span>
                <span className="text-sm font-semibold">
                  {(result.plan.estimatedComplexity * 100).toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${result.plan.estimatedComplexity * 100}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Steps */}
      {result.plan.steps && result.plan.steps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="w-5 h-5" />
              Plan Steps ({result.plan.steps.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {result.plan.steps.map((step) => (
                <div key={step.id} className="border-l-4 border-primary pl-4 py-2">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm">
                      {step.order}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{step.description}</span>
                        <Badge variant="secondary" className="text-xs">
                          {step.action}
                        </Badge>
                      </div>
                      {step.parameters && Object.keys(step.parameters).length > 0 && (
                        <div className="mt-2 p-2 bg-muted rounded text-xs font-mono">
                          {JSON.stringify(step.parameters, null, 2)}
                        </div>
                      )}
                      <div className="mt-2 text-xs text-muted-foreground">
                        <span className="font-medium">Expected:</span> {step.expectedOutcome}
                      </div>
                      {step.dependencies && step.dependencies.length > 0 && (
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Depends on:</span>
                          <div className="flex gap-1">
                            {step.dependencies.map((dep) => {
                              const depNum = dep.replace('step-', '')
                              return (
                                <Badge key={dep} variant="outline" className="text-xs">
                                  Step {depNum}
                                </Badge>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      <div className="mt-2">
                        <Badge 
                          variant={step.status === 'completed' ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {step.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rationale */}
      {result.rationale && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Rationale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {result.rationale}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


'use client'

import { ThoughtAgentOutput } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, Target, AlertCircle, Wrench, Lightbulb } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ThoughtDetailProps {
  result: ThoughtAgentOutput
}

export function ThoughtDetail({ result }: ThoughtDetailProps) {
  const primaryThought = result.thoughts && result.thoughts.length > 0 ? result.thoughts[0] : null

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
          {result.complexityScore !== undefined && (
            <div className="text-sm">
              <span className="text-muted-foreground">Complexity Score:</span>
              <span className="ml-2">{(result.complexityScore * 100).toFixed(0)}%</span>
            </div>
          )}
          {result.reasoningPass !== undefined && (
            <div className="text-sm">
              <span className="text-muted-foreground">Reasoning Pass:</span>
              <span className="ml-2">{result.reasoningPass} / {result.totalPasses || 1}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Primary Thought */}
      {primaryThought && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Reasoning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {primaryThought.reasoning}
                </ReactMarkdown>
              </div>
              {primaryThought.confidence !== undefined && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Confidence</span>
                    <span className="text-sm font-semibold">
                      {(primaryThought.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${primaryThought.confidence * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Approaches */}
          {primaryThought.approaches && primaryThought.approaches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Approaches
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {primaryThought.approaches.map((approach, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5">{i + 1}</Badge>
                      <div className="flex-1 prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {approach}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
                {result.primaryApproach && (
                  <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-xs text-muted-foreground mb-1">Primary Approach:</p>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {result.primaryApproach}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Constraints & Assumptions */}
          {(primaryThought.constraints?.length > 0 || primaryThought.assumptions?.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Constraints & Assumptions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {primaryThought.constraints && primaryThought.constraints.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-2 text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Constraints
                      </h3>
                      <ul className="space-y-1 text-sm">
                        {primaryThought.constraints.map((c, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-muted-foreground">•</span>
                            <div className="prose prose-sm dark:prose-invert max-w-none flex-1">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {c}
                              </ReactMarkdown>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {primaryThought.assumptions && primaryThought.assumptions.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-2 text-sm flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        Assumptions
                      </h3>
                      <ul className="space-y-1 text-sm">
                        {primaryThought.assumptions.map((a, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-muted-foreground">•</span>
                            <div className="prose prose-sm dark:prose-invert max-w-none flex-1">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {a}
                              </ReactMarkdown>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Uncertainties */}
          {primaryThought.uncertainties && primaryThought.uncertainties.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Uncertainties</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {primaryThought.uncertainties.map((u, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      <div className="prose prose-sm dark:prose-invert max-w-none flex-1">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {u}
                        </ReactMarkdown>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Key Insights */}
      {result.keyInsights && result.keyInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.keyInsights.map((insight, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">•</Badge>
                  <div className="prose prose-sm dark:prose-invert max-w-none flex-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {insight}
                    </ReactMarkdown>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommended Tools */}
      {result.recommendedTools && result.recommendedTools.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Recommended Tools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {result.recommendedTools.map((tool, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {tool}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


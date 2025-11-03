'use client'

import { useState, useEffect } from 'react'
import { ThoughtAgentOutput } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { PipelineBanner } from '@/components/agents/PipelineBanner'
import { History, Loader2, Brain, Target, AlertCircle, Wrench, Lightbulb } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function ThoughtAgentRequestPage() {
  const params = useParams()
  const requestId = params.id as string
  
  const [result, setResult] = useState<ThoughtAgentOutput | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (requestId) {
      loadThoughts()
    }
  }, [requestId])

  const loadThoughts = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/agents/thought-agent?requestId=${requestId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Thought output not found for this request')
        }
        throw new Error('Failed to load thought output')
      }
      
      const data = await response.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Breadcrumbs items={[
          { label: 'Agent Pipeline', href: '/agents/pipeline' },
          { label: 'Thought Agent', href: '/agents/thought-agent' },
          { label: requestId || 'Loading...' },
        ]} />
        <PipelineBanner currentAgent="thought-agent" requestId={requestId} />
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Thought Generation Result</h1>
            <p className="text-[13px] text-muted-foreground">
              View detailed reasoning for request {requestId}
            </p>
          </div>
          <Link href="/agents/thought-agent/history">
            <Button variant="outline" size="sm" className="gap-2">
              <History className="w-4 h-4" />
              View History
            </Button>
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading thought output...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && !loading && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Results Display */}
        {result && !loading && (
          <div className="space-y-6">
            {/* Request Info */}
            <Card>
              <CardHeader>
                <CardTitle>Request Info</CardTitle>
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
            {result.thoughts && result.thoughts.length > 0 && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="w-5 h-5" />
                      Reasoning
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {result.thoughts[0].reasoning}
                        </ReactMarkdown>
                      </div>
                    </div>
                    {result.thoughts[0].confidence !== undefined && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">Confidence</span>
                          <span className="text-sm font-semibold">
                            {(result.thoughts[0].confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${result.thoughts[0].confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Approaches */}
                {result.thoughts[0].approaches && result.thoughts[0].approaches.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        Approaches
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {result.thoughts[0].approaches.map((approach, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Badge variant="outline" className="mt-0.5">{i + 1}</Badge>
                            <div className="flex-1 prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {approach}
                              </ReactMarkdown>
                            </div>
                          </li>
                        ))}
                      </ul>
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
                {(result.thoughts[0].constraints?.length > 0 || result.thoughts[0].assumptions?.length > 0) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Constraints & Assumptions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {result.thoughts[0].constraints && result.thoughts[0].constraints.length > 0 && (
                          <div>
                            <h3 className="font-medium mb-2 text-sm flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" />
                              Constraints
                            </h3>
                            <ul className="text-sm space-y-1">
                              {result.thoughts[0].constraints.map((c, i) => (
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
                        {result.thoughts[0].assumptions && result.thoughts[0].assumptions.length > 0 && (
                          <div>
                            <h3 className="font-medium mb-2 text-sm flex items-center gap-2">
                              <Lightbulb className="w-4 h-4" />
                              Assumptions
                            </h3>
                            <ul className="text-sm space-y-1">
                              {result.thoughts[0].assumptions.map((a, i) => (
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
                {result.thoughts[0].uncertainties && result.thoughts[0].uncertainties.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Uncertainties</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm">
                        {result.thoughts[0].uncertainties.map((u, i) => (
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
                  <CardTitle className="flex items-center gap-2">
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
                  <CardTitle className="flex items-center gap-2">
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
        )}
      </div>
    </div>
  )
}


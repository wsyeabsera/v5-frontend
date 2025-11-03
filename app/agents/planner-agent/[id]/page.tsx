'use client'

import { useState, useEffect } from 'react'
import { PlannerAgentOutput } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { PipelineBanner } from '@/components/agents/PipelineBanner'
import { Loader2, History, Target, ListChecks, FileText, ArrowRight } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function PlannerAgentRequestPage() {
  const params = useParams()
  const requestId = params.id as string
  
  const [result, setResult] = useState<PlannerAgentOutput | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (requestId) {
      loadPlan()
    }
  }, [requestId])

  const loadPlan = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/agents/planner-agent/history/${requestId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Plan output not found for this request')
        }
        throw new Error('Failed to load plan output')
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
          { label: 'Planner Agent', href: '/agents/planner-agent' },
          { label: requestId || 'Loading...' },
        ]} />
        <PipelineBanner currentAgent="planner-agent" requestId={requestId} />
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Action Plan Result</h1>
            <p className="text-[13px] text-muted-foreground">
              View structured plan for request {requestId}
            </p>
          </div>
          <Link href="/agents/planner-agent/history">
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
                <span className="ml-2 text-sm text-muted-foreground">Loading plan...</span>
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
                <div className="text-sm">
                  <span className="text-muted-foreground">Based on Thoughts:</span>
                  <span className="ml-2">{result.basedOnThoughts.length} thought(s)</span>
                </div>
              </CardContent>
            </Card>

            {/* Plan Goal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
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
                  <CardTitle className="flex items-center gap-2">
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
                  <CardTitle className="flex items-center gap-2">
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
        )}
      </div>
    </div>
  )
}


'use client'

import { useState, useEffect } from 'react'
import { SummaryAgentOutput } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { PipelineBanner } from '@/components/agents/PipelineBanner'
import { History, Loader2, FileText, Clock, ExternalLink, ArrowLeft } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function SummaryAgentRequestPage() {
  const params = useParams()
  const requestId = params.id as string
  
  const [result, setResult] = useState<SummaryAgentOutput | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (requestId) {
      loadSummary()
    }
  }, [requestId])

  const loadSummary = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/agents/summary-agent?requestId=${requestId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Summary not found for this request')
        }
        throw new Error('Failed to load summary')
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
          { label: 'Summary Agent', href: '/agents/summary-agent' },
          { label: requestId || 'Loading...' },
        ]} />
        <PipelineBanner currentAgent="summary-agent" requestId={requestId} />
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Summary Result</h1>
            <p className="text-[13px] text-muted-foreground">
              View detailed summary for request {requestId}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/agents/summary-agent">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <Link href="/agents/summary-agent/history">
              <Button variant="outline" size="sm" className="gap-2">
                <History className="w-4 h-4" />
                View History
              </Button>
            </Link>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading summary...</span>
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
                {result.summaryVersion && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Summary Version:</span>
                    <span className="ml-2">{result.summaryVersion}</span>
                  </div>
                )}
                <div className="text-sm">
                  <span className="text-muted-foreground">Generated:</span>
                  <span className="ml-2">{new Date(result.timestamp).toLocaleString()}</span>
                </div>
                {result.requestContext.userQuery && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Original Query:</span>
                    <p className="mt-1 text-foreground">{result.requestContext.userQuery}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Related Links */}
            <Card>
              <CardHeader>
                <CardTitle>Related Outputs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Link href={`/agents/thought-agent/${requestId}`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <ExternalLink className="w-4 h-4" />
                      View Thoughts
                    </Button>
                  </Link>
                  <Link href={`/agents/executor-agent/${requestId}`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <ExternalLink className="w-4 h-4" />
                      View Execution
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {result.summary}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>

            {/* Key Takeaways */}
            {result.keyTakeaways && result.keyTakeaways.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Key Takeaways</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.keyTakeaways.map((takeaway, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Thoughts Summary */}
            {result.thoughtsSummary && (
              <Card>
                <CardHeader>
                  <CardTitle>Thoughts Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {result.thoughtsSummary}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Execution Summary */}
            {result.executionSummary && (
              <Card>
                <CardHeader>
                  <CardTitle>Execution Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {result.executionSummary}
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


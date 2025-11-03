'use client'

import { useState, useEffect } from 'react'
import { ComplexityDetectorOutput } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { PipelineBanner } from '@/components/agents/PipelineBanner'
import { ComplexityResult } from '@/components/complexity/ComplexityResult'
import { History, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function ComplexityDetectorRequestPage() {
  const params = useParams()
  const requestId = params.id as string
  
  const [result, setResult] = useState<ComplexityDetectorOutput | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (requestId) {
      loadDetection()
    }
  }, [requestId])

  const loadDetection = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/agents/complexity-detector/history/${requestId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Detection not found for this request')
        }
        throw new Error('Failed to load detection')
      }
      
      const data = await response.json()
      // Convert timestamp to Date object if needed
      if (data.timestamp && typeof data.timestamp === 'string') {
        data.timestamp = new Date(data.timestamp)
      }
      // Convert requestContext createdAt if present
      if (data.requestContext?.createdAt && typeof data.requestContext.createdAt === 'string') {
        data.requestContext.createdAt = new Date(data.requestContext.createdAt)
      }
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Breadcrumbs items={[
          { label: 'Agent Pipeline', href: '/agents/pipeline' },
          { label: 'Complexity Detector', href: '/agents/complexity-detector' },
          { label: requestId || 'Loading...' },
        ]} />
        <PipelineBanner currentAgent="complexity-detector" requestId={requestId} />
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Complexity Detection Result</h1>
            <p className="text-[13px] text-muted-foreground">
              View detailed analysis for request {requestId}
            </p>
          </div>
          <Link href="/agents/complexity-detector/history">
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
                <span className="ml-2 text-sm text-muted-foreground">Loading detection...</span>
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
          <>
            {/* Request Info */}
            <Card>
              <CardHeader>
                <CardTitle>Request Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Request ID:</span>
                  <code className="ml-2 px-2 py-1 bg-muted rounded text-xs">
                    {result.requestId}
                  </code>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Timestamp:</span>
                  <span className="ml-2">{new Date(result.timestamp).toLocaleString()}</span>
                </div>
                {result.requestContext?.userQuery && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">User Query:</span>
                    <div className="mt-1 p-3 bg-muted rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{result.requestContext.userQuery}</p>
                    </div>
                  </div>
                )}
                {result.requestContext?.agentChain && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Agent Chain:</span>
                    <span className="ml-2">{result.requestContext.agentChain.join(' → ')}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Complexity Result */}
            <ComplexityResult result={result} />
          </>
        )}
      </div>
    </div>
  )
}


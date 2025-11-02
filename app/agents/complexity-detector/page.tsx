'use client'

import { useState, useEffect } from 'react'
import { ComplexityDetectorOutput } from '@/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ComplexityResult } from '@/components/complexity/ComplexityResult'
import { getRequest } from '@/lib/api/requests-api'
import { Sparkles, Loader2, History } from 'lucide-react'
import Link from 'next/link'

export default function ComplexityDetectorPage() {
  const [userQuery, setUserQuery] = useState('')
  const [requestId, setRequestId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ComplexityDetectorOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [useRequestId, setUseRequestId] = useState(false)


  const handleDetect = async () => {
    if (!userQuery.trim() && !requestId.trim()) {
      setError('Please enter a query or request ID')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/agents/complexity-detector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userQuery: useRequestId ? undefined : userQuery,
          requestId: useRequestId ? requestId : undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to detect complexity')
      }

      const data = await response.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const loadFromRequestId = async () => {
    if (!requestId.trim()) return

    try {
      const request = await getRequest(requestId)
      if (request && request.userQuery) {
        setUserQuery(request.userQuery)
        setUseRequestId(false)
      } else {
        setError(`Request ${requestId} not found or has no user query`)
      }
    } catch (err: any) {
      setError(`Failed to load request: ${err.message}`)
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-1">Complexity Detector Agent</h1>
            <p className="text-[13px] text-muted-foreground">
              Analyze query complexity using semantic matching with Ollama embeddings
            </p>
          </div>
          <Link href="/agents/complexity-detector/history">
            <Button variant="outline" size="sm" className="gap-2">
              <History className="w-4 h-4" />
              View History
            </Button>
          </Link>
        </div>

        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Input</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useRequestId"
                checked={useRequestId}
                onChange={(e) => setUseRequestId(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="useRequestId" className="cursor-pointer">
                Use Request ID
              </Label>
            </div>

            {useRequestId ? (
              <div className="space-y-2">
                <Label htmlFor="requestId">Request ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="requestId"
                    value={requestId}
                    onChange={(e) => setRequestId(e.target.value)}
                    placeholder="Enter request ID..."
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={loadFromRequestId}
                    disabled={loading}
                  >
                    Load
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="userQuery">User Query</Label>
                <Textarea
                  id="userQuery"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Enter a user query to analyze..."
                  rows={4}
                  disabled={loading}
                />
              </div>
            )}

            <Button
              onClick={handleDetect}
              disabled={loading || (!userQuery.trim() && !requestId.trim())}
              className="w-full gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Detect Complexity
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Results Display */}
        {result && <ComplexityResult result={result} />}
      </div>
    </div>
  )
}


'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BaseAgentOutput } from '@/types'
import { Loader2, Sparkles } from 'lucide-react'

export default function BaseAgentPage() {
  const [userQuery, setUserQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BaseAgentOutput | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleTest = async () => {
    if (!userQuery.trim()) {
      setError('Please enter a query')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/agents/base-agent/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userQuery }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to call base agent')
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
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Base Agent Test</h1>
          <p className="text-[13px] text-muted-foreground">
            Test the Base Agent utilities for LLM calls and response parsing
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Input</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Enter a test query..."
              rows={4}
              disabled={loading}
            />
            <Button
              onClick={handleTest}
              disabled={loading || !userQuery.trim()}
              className="w-full gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Test Base Agent
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {result && (
          <div className="space-y-6">
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
                  <span className="text-muted-foreground">Agent:</span>
                  <span className="ml-2">{result.agentName}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Timestamp:</span>
                  <span className="ml-2">{new Date(result.timestamp).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>LLM Response</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="whitespace-pre-wrap text-sm">{result.content}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}


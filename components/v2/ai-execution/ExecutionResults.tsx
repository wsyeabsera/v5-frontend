'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, XCircle, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface ExecutionResultsProps {
  result: any
  isLoading: boolean
  error: string | null
}

export function ExecutionResults({ result, isLoading, error }: ExecutionResultsProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2)
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <div>
            <div className="font-semibold">Executing AI call...</div>
            <div className="text-sm text-muted-foreground">Please wait while we process your request</div>
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6 border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20">
        <div className="flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-red-900 dark:text-red-100 mb-1">Execution Error</div>
            <div className="text-sm text-red-700 dark:text-red-300 font-mono whitespace-pre-wrap">
              {error}
            </div>
          </div>
        </div>
      </Card>
    )
  }

  if (!result) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <p>No results yet. Execute an AI call to see results here.</p>
        </div>
      </Card>
    )
  }

  const formattedResult =
    typeof result === 'string'
      ? result
      : JSON.stringify(result, null, 2)

  const isJSON = typeof result === 'object' || (typeof result === 'string' && result.trim().startsWith('{'))

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
          <div className="font-semibold">Execution Result</div>
          {isJSON && <Badge variant="outline">JSON</Badge>}
        </div>
        <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </Button>
      </div>
      <div className="space-y-2">
        {isJSON ? (
          <pre className="p-4 rounded-lg bg-muted overflow-x-auto text-sm font-mono border">
            <code>{formattedResult}</code>
          </pre>
        ) : (
          <div className="p-4 rounded-lg bg-muted border whitespace-pre-wrap text-sm font-mono">
            {formattedResult}
          </div>
        )}
      </div>
    </Card>
  )
}

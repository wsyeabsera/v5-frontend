'use client'

import { ExecutionResult } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Terminal, Clock, CheckCircle, XCircle } from 'lucide-react'

interface StepOutputStreamProps {
  step: ExecutionResult
}

export function StepOutputStream({ step }: StepOutputStreamProps) {
  const formatOutput = (output: any): string => {
    if (typeof output === 'string') {
      return output
    }
    if (Array.isArray(output)) {
      if (output.length > 0 && output[0]?.type === 'text' && output[0]?.text) {
        return output.map((item: any) => item.text || '').join('')
      }
      return JSON.stringify(output, null, 2)
    }
    if (output?.type === 'text' && output?.text) {
      return output.text
    }
    try {
      return JSON.stringify(output, null, 2)
    } catch {
      return String(output)
    }
  }

  return (
    <Card className="bg-muted/50">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium">Step Output</span>
          </div>
          <div className="flex items-center gap-2">
            {step.success ? (
              <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                Success
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">
                <XCircle className="w-3 h-3 mr-1" />
                Failed
              </Badge>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {step.duration}ms
            </div>
          </div>
        </div>

        {step.result && (
          <div className="bg-background border border-border rounded-lg p-3">
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto font-mono">
              {formatOutput(step.result)}
            </pre>
          </div>
        )}

        {step.error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-xs font-medium text-destructive mb-1">Error Output</p>
            <pre className="text-xs text-destructive whitespace-pre-wrap">{step.error}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


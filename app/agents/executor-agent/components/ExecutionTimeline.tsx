'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExecutionResult } from '@/types'
import { CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react'

interface ExecutionTimelineProps {
  steps: ExecutionResult[]
}

export function ExecutionTimeline({ steps }: ExecutionTimelineProps) {
  const sortedSteps = [...steps].sort((a, b) => a.stepOrder - b.stepOrder)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Execution Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedSteps.map((step, idx) => {
            const isLast = idx === sortedSteps.length - 1

            return (
              <div key={step.stepId} className="flex items-start gap-4">
                {/* Timeline Line */}
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    step.success
                      ? 'border-green-500 bg-green-500/10 text-green-700'
                      : 'border-red-500 bg-red-500/10 text-red-700'
                  }`}>
                    {step.success ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                  </div>
                  {!isLast && (
                    <div className={`w-0.5 h-16 ${
                      sortedSteps[idx + 1]?.success
                        ? 'bg-green-500/20'
                        : sortedSteps[idx + 1]?.success === false
                        ? 'bg-red-500/20'
                        : 'bg-muted'
                    }`} />
                  )}
                </div>

                {/* Step Info */}
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">Step {step.stepOrder}</span>
                    <Badge variant={step.success ? 'default' : 'destructive'} className="text-xs">
                      {step.success ? 'Success' : 'Failed'}
                    </Badge>
                    {step.toolCalled && (
                      <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                        {step.toolCalled}
                      </code>
                    )}
                  </div>
                  {step.error && (
                    <p className="text-xs text-destructive line-clamp-1">{step.error}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{step.duration}ms</span>
                    {step.retries > 0 && (
                      <span>• {step.retries} retries</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}


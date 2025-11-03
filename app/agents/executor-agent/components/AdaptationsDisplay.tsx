'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlanExecutionResult } from '@/types'
import { RefreshCw, ArrowRight } from 'lucide-react'

interface AdaptationsDisplayProps {
  adaptations: PlanExecutionResult['adaptations']
}

export function AdaptationsDisplay({ adaptations }: AdaptationsDisplayProps) {
  if (adaptations.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Plan Adaptations
          <Badge variant="outline">
            {adaptations.length} {adaptations.length === 1 ? 'adaptation' : 'adaptations'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {adaptations.map((adaptation, idx) => (
          <div key={idx} className="p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">
                Step {adaptation.stepId}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                {adaptation.originalAction}
              </code>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <code className="text-xs bg-blue-500/10 text-blue-700 px-2 py-1 rounded font-mono border border-blue-500/20">
                {adaptation.adaptedAction}
              </code>
            </div>
            <div className="text-sm">
              <span className="font-medium text-muted-foreground">Reason:</span>
              <span className="ml-2">{adaptation.reason}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}


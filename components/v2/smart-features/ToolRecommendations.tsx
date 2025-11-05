'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useGetToolRecommendations } from '@/lib/queries-intelligence/smart-features'
import { Loader2, Wrench } from 'lucide-react'

export function ToolRecommendations() {
  const [requiredAction, setRequiredAction] = useState('')
  const [debouncedAction, setDebouncedAction] = useState('')
  const [context, setContext] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAction(requiredAction)
    }, 300)
    return () => clearTimeout(timer)
  }, [requiredAction])

  const { data: recommendations, isLoading, error } = useGetToolRecommendations(
    debouncedAction,
    context || undefined
  )

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="action-input">Required Action</Label>
          <Input
            id="action-input"
            placeholder="Enter the action you need to perform..."
            value={requiredAction}
            onChange={(e) => setRequiredAction(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="context-input">Context (Optional)</Label>
          <Input
            id="context-input"
            placeholder="Enter context (e.g., facility_management)..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
        </div>
      </div>

      {isLoading && debouncedAction && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">Getting recommendations...</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
          <p className="text-sm text-red-600 dark:text-red-400">
            {error instanceof Error ? error.message : 'Failed to get recommendations'}
          </p>
        </div>
      )}

      {!isLoading && debouncedAction && recommendations && (
        <div>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Found {Array.isArray(recommendations) ? recommendations.length : 0} recommendation
              {(Array.isArray(recommendations) ? recommendations.length : 0) !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="space-y-4">
            {Array.isArray(recommendations) && recommendations.length > 0 ? (
              recommendations.map((rec: any, idx: number) => (
                <Card key={idx} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Wrench className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold">{rec.toolName}</h3>
                        <Badge variant="outline">
                          {(rec.confidence * 100).toFixed(0)}% confidence
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                      <p className="text-sm mb-3">
                        <strong>Reason:</strong> {rec.reason}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        {rec.successRate !== undefined && (
                          <div>
                            Success Rate: {(rec.successRate * 100).toFixed(0)}%
                          </div>
                        )}
                        {rec.averageDuration !== undefined && (
                          <div>Avg Duration: {rec.averageDuration}ms</div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No recommendations found</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {!debouncedAction && (
        <div className="text-center py-12 text-muted-foreground">
          <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Enter an action to get tool recommendations</p>
        </div>
      )}
    </div>
  )
}


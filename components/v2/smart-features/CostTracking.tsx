'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTrackCost } from '@/lib/queries-intelligence/smart-features'
import { Loader2, DollarSign } from 'lucide-react'

export function CostTracking() {
  const [taskId, setTaskId] = useState('')

  const { data: costTracking, isLoading, error } = useTrackCost(taskId)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="task-id-input">Task ID</Label>
        <Input
          id="task-id-input"
          placeholder="Enter task ID to track costs..."
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
        />
      </div>

      {isLoading && taskId && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">Loading cost data...</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
          <p className="text-sm text-red-600 dark:text-red-400">
            {error instanceof Error ? error.message : 'Failed to load cost data'}
          </p>
        </div>
      )}

      {!isLoading && taskId && costTracking && (
        <Card className="p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-semibold">Cost Tracking</h3>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Total Cost</div>
                <div className="text-3xl font-bold">${costTracking.cost.toFixed(4)}</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Total Tokens</div>
                <div className="text-3xl font-bold">{costTracking.totalTokens.toLocaleString()}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Prompt Tokens</div>
                <div className="text-xl font-semibold">{costTracking.promptTokens.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Completion Tokens</div>
                <div className="text-xl font-semibold">{costTracking.completionTokens.toLocaleString()}</div>
              </div>
            </div>

            {costTracking.costBreakdown && costTracking.costBreakdown.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Cost Breakdown</h4>
                <div className="space-y-2">
                  {costTracking.costBreakdown.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div>
                        <span className="text-sm font-medium">{item.toolName || item.stepId}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {item.tokens.toLocaleString()} tokens
                        </span>
                      </div>
                      <Badge variant="outline">${item.cost.toFixed(4)}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {!taskId && (
        <div className="text-center py-12 text-muted-foreground">
          <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Enter a task ID to track costs</p>
        </div>
      )}
    </div>
  )
}


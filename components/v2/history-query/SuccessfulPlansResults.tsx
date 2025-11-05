'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useGetSuccessfulPlans } from '@/lib/queries-intelligence/history-query'
import { Loader2, Target, TrendingUp, Clock, Eye } from 'lucide-react'

export function SuccessfulPlansResults() {
  const [goal, setGoal] = useState('')
  const [debouncedGoal, setDebouncedGoal] = useState('')
  const [limit, setLimit] = useState(5)
  const [minSuccessRate, setMinSuccessRate] = useState(0.8)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedGoal(goal)
    }, 300)
    return () => clearTimeout(timer)
  }, [goal])

  const { data: plans, isLoading, error } = useGetSuccessfulPlans(debouncedGoal, {
    limit,
    minSuccessRate,
  })

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="goal-input">Goal</Label>
          <Input
            id="goal-input"
            placeholder="Enter a goal to find successful plans..."
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="limit-plans">Limit</Label>
            <Input
              id="limit-plans"
              type="number"
              min={1}
              max={20}
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Math.min(20, parseInt(e.target.value) || 5)))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="min-success-rate">Min Success Rate</Label>
            <Input
              id="min-success-rate"
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={minSuccessRate}
              onChange={(e) => setMinSuccessRate(Math.max(0, Math.min(1, parseFloat(e.target.value) || 0.8)))}
            />
            <p className="text-xs text-muted-foreground">
              Minimum success rate (0.0-1.0). Plans must meet this threshold to appear.
            </p>
          </div>
        </div>
      </div>

      {isLoading && debouncedGoal && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">Searching...</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
          <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
            Failed to search successful plans
          </p>
          <p className="text-xs text-red-500 dark:text-red-400/80">
            {error instanceof Error ? error.message : 'Please try again or check your connection'}
          </p>
        </div>
      )}

      {!isLoading && debouncedGoal && plans && (
        <div>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Found {Array.isArray(plans) ? plans.length : 0} successful plan
              {(Array.isArray(plans) ? plans.length : 0) !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="space-y-4">
            {Array.isArray(plans) && plans.length > 0 ? (
              plans.map((plan: any) => (
                <Card key={plan.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="default" className="bg-green-600">
                          {plan.successRate != null ? (plan.successRate * 100).toFixed(0) : '0'}% success
                        </Badge>
                        <Badge variant="outline">
                          Used {plan.usageCount || 0} times
                        </Badge>
                      </div>
                      <h3 className="font-semibold mb-1">{plan.goal || 'Unknown Goal'}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        {plan.averageExecutionTime != null && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Avg: {plan.averageExecutionTime}ms
                        </div>
                        )}
                        {plan.lastUsed && (
                          <div className="text-xs">
                            Last used: {new Date(plan.lastUsed).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      {plan.steps && plan.steps.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold mb-1">Steps ({plan.steps.length}):</p>
                          <div className="space-y-1">
                            {plan.steps.slice(0, 3).map((step: any, idx: number) => (
                              <div key={idx} className="text-xs text-muted-foreground">
                                {idx + 1}. {step.toolName || step.description}
                              </div>
                            ))}
                            {plan.steps.length > 3 && (
                              <div className="text-xs text-muted-foreground">
                                ... and {plan.steps.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-base font-medium mb-2">No successful plans found</p>
                <p className="text-sm text-muted-foreground">
                  Try a different goal or lower the minimum success rate threshold
                </p>
              </Card>
            )}
          </div>
        </div>
      )}

      {!debouncedGoal && (
        <div className="text-center py-12 text-muted-foreground">
          <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-base mb-2">Enter a goal to find successful plans</p>
          <p className="text-sm">Try searching for: "Get facility", "Create shipment", "List contaminants"</p>
        </div>
      )}
    </div>
  )
}


'use client'

import { PlannerAgentOutput } from '@/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Loader2, Frown, ListChecks } from 'lucide-react'
import Link from 'next/link'

interface PlannerHistoryListProps {
  plans: PlannerAgentOutput[]
  isLoading: boolean
  onViewDetails?: (plan: PlannerAgentOutput) => void
}

export function PlannerHistoryList({
  plans,
  isLoading,
  onViewDetails,
}: PlannerHistoryListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Loading planner history...</p>
      </div>
    )
  }

  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Frown className="h-8 w-8 mb-4" />
        <p>No planner history found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {plans.map((plan) => {
        return (
          <Card key={plan.requestId} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="default" className="gap-2">
                      <ListChecks className="w-3 h-3" />
                      Planner Agent
                    </Badge>
                    {plan.plan.confidence !== undefined && (
                      <Badge variant="outline">
                        Confidence: {(plan.plan.confidence * 100).toFixed(1)}%
                      </Badge>
                    )}
                    {plan.plan.estimatedComplexity !== undefined && (
                      <Badge variant="secondary">
                        Complexity: {(plan.plan.estimatedComplexity * 100).toFixed(1)}%
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {plan.plan.steps.length} Step{plan.plan.steps.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {plan.plan.goal}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/agents/planner-agent/${plan.requestId}`}>
                    <Button variant="default" size="sm" className="gap-2">
                      Open
                    </Button>
                  </Link>
                  {onViewDetails && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(plan)}
                      className="gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Quick View
                    </Button>
                  )}
                  <Link href={`/requests?search=${plan.requestId}`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      Request
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Request ID: <code className="font-mono">{plan.requestId.substring(0, 8)}...</code>
                </span>
                <span>
                  {new Date(plan.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {plan.plan.steps.length > 0 && (
                  <Badge variant="outline" className="text-[10px]">
                    {plan.plan.steps.length} Step{plan.plan.steps.length > 1 ? 's' : ''}
                  </Badge>
                )}
                {plan.plan.dependencies && plan.plan.dependencies.length > 0 && (
                  <Badge variant="outline" className="text-[10px]">
                    {plan.plan.dependencies.length} Dependenc{plan.plan.dependencies.length > 1 ? 'ies' : 'y'}
                  </Badge>
                )}
                {plan.basedOnThoughts && plan.basedOnThoughts.length > 0 && (
                  <Badge variant="outline" className="text-[10px]">
                    Based on {plan.basedOnThoughts.length} Thought{plan.basedOnThoughts.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}


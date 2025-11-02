'use client'

import { ThoughtAgentOutput } from '@/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Loader2, Frown, Brain } from 'lucide-react'
import Link from 'next/link'

interface ThoughtHistoryListProps {
  thoughts: ThoughtAgentOutput[]
  isLoading: boolean
  onViewDetails?: (thought: ThoughtAgentOutput) => void
}

export function ThoughtHistoryList({
  thoughts,
  isLoading,
  onViewDetails,
}: ThoughtHistoryListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Loading thought history...</p>
      </div>
    )
  }

  if (thoughts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Frown className="h-8 w-8 mb-4" />
        <p>No thought history found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {thoughts.map((thought) => {
        const primaryThought = thought.thoughts && thought.thoughts.length > 0 ? thought.thoughts[0] : null
        
        return (
          <Card key={thought.requestId} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="default" className="gap-2">
                      <Brain className="w-3 h-3" />
                      Thought Agent
                    </Badge>
                    {thought.complexityScore !== undefined && (
                      <Badge variant="outline">
                        Complexity: {(thought.complexityScore * 100).toFixed(1)}%
                      </Badge>
                    )}
                    {thought.reasoningPass !== undefined && (
                      <Badge variant="secondary">
                        Pass {thought.reasoningPass} of {thought.totalPasses || 1}
                      </Badge>
                    )}
                    {primaryThought?.confidence !== undefined && (
                      <Badge variant="outline" className="text-xs">
                        Confidence: {(primaryThought.confidence * 100).toFixed(0)}%
                      </Badge>
                    )}
                  </div>
                  {primaryThought && primaryThought.approaches && primaryThought.approaches.length > 0 && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {primaryThought.approaches[0]}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {onViewDetails && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(thought)}
                      className="gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Button>
                  )}
                  <Link href={`/requests?search=${thought.requestId}`}>
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
                  Request ID: <code className="font-mono">{thought.requestId.substring(0, 8)}...</code>
                </span>
                <span>
                  {new Date(thought.timestamp).toLocaleString()}
                </span>
              </div>
              {primaryThought && primaryThought.approaches && primaryThought.approaches.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px]">
                    {primaryThought.approaches.length} Approach{primaryThought.approaches.length > 1 ? 'es' : ''}
                  </Badge>
                  {primaryThought.constraints && primaryThought.constraints.length > 0 && (
                    <Badge variant="outline" className="text-[10px]">
                      {primaryThought.constraints.length} Constraint{primaryThought.constraints.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {primaryThought.uncertainties && primaryThought.uncertainties.length > 0 && (
                    <Badge variant="outline" className="text-[10px]">
                      {primaryThought.uncertainties.length} Uncertaint{primaryThought.uncertainties.length > 1 ? 'ies' : 'y'}
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}


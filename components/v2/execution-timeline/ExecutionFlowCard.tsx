'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ThoughtNode } from './ThoughtNode'
import { PlanNode } from './PlanNode'
import { TaskNode } from './TaskNode'
import { TimelineConnector } from './TimelineConnector'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface ExecutionFlowCardProps {
  thought?: any
  plan?: any
  tasks?: any[]
  onViewThought?: (thoughtId: string) => void
  onViewPlan?: (planId: string) => void
  onViewTask?: (taskId: string) => void
}

export function ExecutionFlowCard({
  thought,
  plan,
  tasks = [],
  onViewThought,
  onViewPlan,
  onViewTask,
}: ExecutionFlowCardProps) {
  const [expanded, setExpanded] = useState(true)

  const hasFlow = thought || plan || tasks.length > 0

  if (!hasFlow) {
    return null
  }

  return (
    <Card className="p-6 space-y-4">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Execution Flow</h3>
            <p className="text-sm text-muted-foreground">
              Complete pipeline from thought to execution
            </p>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="space-y-4">
          {/* Thought */}
          {thought && (
            <div className="space-y-2">
              <ThoughtNode thought={thought} onView={onViewThought} />
            </div>
          )}

          {/* Connector: Thought → Plan */}
          {thought && plan && (
            <TimelineConnector from="thought" to="plan" />
          )}

          {/* Plan */}
          {plan && (
            <div className="space-y-2">
              <PlanNode
                plan={plan}
                onView={onViewPlan}
                onViewThought={thought ? () => thought._id && onViewThought?.(thought._id) : undefined}
              />
            </div>
          )}

          {/* Connector: Plan → Task */}
          {plan && tasks.length > 0 && (
            <TimelineConnector from="plan" to="task" />
          )}

          {/* Tasks */}
          {tasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Tasks ({tasks.length})
                </h4>
              </div>
              <div className="space-y-2">
                {tasks.map((task, index) => (
                  <div key={task._id || task.id || index} className="space-y-2">
                    {index > 0 && <div className="h-2" />}
                    <TaskNode
                      task={task}
                      onView={onViewTask}
                      onViewPlan={plan ? () => plan._id && onViewPlan?.(plan._id) : undefined}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="pt-4 border-t">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">
                {thought ? '1 Thought' : 'No Thought'}
              </Badge>
              <Badge variant="outline">
                {plan ? '1 Plan' : 'No Plan'}
              </Badge>
              <Badge variant="outline">
                {tasks.length} Task{tasks.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}


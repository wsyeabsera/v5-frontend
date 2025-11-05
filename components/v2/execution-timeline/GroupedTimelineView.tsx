'use client'

import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ThoughtNode } from './ThoughtNode'
import { PlanNode } from './PlanNode'
import { TaskNode } from './TaskNode'
import { TimelineConnector } from './TimelineConnector'
import { ChevronDown, ChevronRight, Brain } from 'lucide-react'
import { useState } from 'react'

interface GroupedTimelineViewProps {
  thoughts: any[]
  plans: any[]
  tasks: any[]
  onViewThought?: (thoughtId: string) => void
  onViewPlan?: (planId: string) => void
  onViewTask?: (taskId: string) => void
}

export function GroupedTimelineView({
  thoughts,
  plans,
  tasks,
  onViewThought,
  onViewPlan,
  onViewTask,
}: GroupedTimelineViewProps) {
  const [expandedThoughts, setExpandedThoughts] = useState<Set<string>>(new Set())

  // Build grouped structure: Thought → Plans → Tasks
  const groupedData = useMemo(() => {
    const groups: Array<{
      thought: any
      plans: Array<{
        plan: any
        tasks: any[]
      }>
    }> = []

    // Group by thought
    thoughts.forEach((thought: any) => {
      const thoughtId = thought._id || thought.id
      const relatedPlans = plans.filter((p: any) => p.thoughtId === thoughtId)

      const planGroups = relatedPlans.map((plan: any) => {
        const planId = plan._id || plan.id
        const planTasks = tasks.filter((t: any) => t.planId === planId)
        return {
          plan,
          tasks: planTasks,
        }
      })

      groups.push({
        thought,
        plans: planGroups,
      })
    })

    // Add orphaned plans (plans without thoughts)
    const processedPlanIds = new Set<string>()
    groups.forEach((group) => {
      group.plans.forEach((pg) => {
        const planId = pg.plan._id || pg.plan.id
        processedPlanIds.add(planId)
      })
    })

    plans.forEach((plan: any) => {
      const planId = plan._id || plan.id
      if (!processedPlanIds.has(planId)) {
        const planTasks = tasks.filter((t: any) => t.planId === planId)
        groups.push({
          thought: null,
          plans: [
            {
              plan,
              tasks: planTasks,
            },
          ],
        })
      }
    })

    // Add orphaned tasks (tasks without plans)
    const processedTaskIds = new Set<string>()
    groups.forEach((group) => {
      group.plans.forEach((pg) => {
        pg.tasks.forEach((task: any) => {
          const taskId = task._id || task.id
          processedTaskIds.add(taskId)
        })
      })
    })

    tasks.forEach((task: any) => {
      const taskId = task._id || task.id
      if (!processedTaskIds.has(taskId)) {
        groups.push({
          thought: null,
          plans: [
            {
              plan: null,
              tasks: [task],
            },
          ],
        })
      }
    })

    return groups
  }, [thoughts, plans, tasks])

  const toggleThought = (thoughtId: string) => {
    setExpandedThoughts((prev) => {
      const next = new Set(prev)
      if (next.has(thoughtId)) {
        next.delete(thoughtId)
      } else {
        next.add(thoughtId)
      }
      return next
    })
  }

  const expandAll = () => {
    const allThoughtIds = new Set<string>()
    groupedData.forEach((group) => {
      if (group.thought) {
        const thoughtId = group.thought._id || group.thought.id
        allThoughtIds.add(thoughtId)
      }
    })
    setExpandedThoughts(allThoughtIds)
  }

  const collapseAll = () => {
    setExpandedThoughts(new Set())
  }

  if (groupedData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-muted/30">
        <Brain className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No execution flows found</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          No thoughts, plans, or tasks found. Create a thought to start a new execution flow.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">Execution Flows</h3>
          <Badge variant="outline">{groupedData.length} flow{groupedData.length !== 1 ? 's' : ''}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
        </div>
      </div>

      {/* Grouped Flows */}
      <div className="space-y-4">
        {groupedData.map((group, groupIndex) => {
          const thoughtId = group.thought?._id || group.thought?.id || `orphan-${groupIndex}`
          const isExpanded = expandedThoughts.has(thoughtId)

          return (
            <Card key={thoughtId} className="overflow-hidden">
              <div className="space-y-0">
                {/* Thought Header */}
                {group.thought && (
                  <Collapsible open={isExpanded} onOpenChange={() => toggleThought(thoughtId)}>
                    <CollapsibleTrigger asChild>
                      <div className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                          <ThoughtNode thought={group.thought} onView={onViewThought} />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="pl-7 pr-4 pb-4 space-y-4 border-t">
                        {/* Plans */}
                        {group.plans.length > 0 ? (
                          <div className="space-y-4 pt-4">
                            {group.plans.map((planGroup, planIndex) => {
                              const planId = planGroup.plan?._id || planGroup.plan?.id || `plan-${planIndex}`
                              return (
                                <div key={planId} className="space-y-3">
                                  {/* Connector: Thought → Plan */}
                                  {planIndex === 0 && <TimelineConnector from="thought" to="plan" />}

                                  {/* Plan */}
                                  {planGroup.plan && (
                                    <div className="ml-4">
                                      <PlanNode
                                        plan={planGroup.plan}
                                        onView={onViewPlan}
                                        onViewThought={group.thought ? () => thoughtId && onViewThought?.(thoughtId) : undefined}
                                      />
                                    </div>
                                  )}

                                  {/* Tasks */}
                                  {planGroup.tasks.length > 0 && (
                                    <div className="ml-8 space-y-3">
                                      {/* Connector: Plan → Task */}
                                      {planGroup.plan && <TimelineConnector from="plan" to="task" />}

                                      {/* Task List */}
                                      <div className="space-y-2">
                                        {planGroup.tasks.map((task, taskIndex) => {
                                          const taskId = task._id || task.id || `task-${taskIndex}`
                                          return (
                                            <div key={taskId} className="ml-4">
                                              <TaskNode
                                                task={task}
                                                onView={onViewTask}
                                                onViewPlan={planGroup.plan ? () => planId && onViewPlan?.(planId) : undefined}
                                              />
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Orphaned Tasks (no plan) */}
                                  {!planGroup.plan && planGroup.tasks.length > 0 && (
                                    <div className="ml-4 space-y-2">
                                      {planGroup.tasks.map((task, taskIndex) => {
                                        const taskId = task._id || task.id || `task-${taskIndex}`
                                        return (
                                          <div key={taskId}>
                                            <TaskNode task={task} onView={onViewTask} />
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="pl-7 pr-4 pt-4 text-sm text-muted-foreground">
                            No plans created yet
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Orphaned Plans/Tasks (no thought) */}
                {!group.thought && (
                  <div className="p-4 space-y-4">
                    {group.plans.map((planGroup, planIndex) => {
                      const planId = planGroup.plan?._id || planGroup.plan?.id || `plan-${planIndex}`
                      return (
                        <div key={planId} className="space-y-3">
                          {/* Plan */}
                          {planGroup.plan && (
                            <PlanNode plan={planGroup.plan} onView={onViewPlan} />
                          )}

                          {/* Tasks */}
                          {planGroup.tasks.length > 0 && (
                            <div className="ml-4 space-y-3">
                              {planGroup.plan && <TimelineConnector from="plan" to="task" />}
                              <div className="space-y-2">
                                {planGroup.tasks.map((task, taskIndex) => {
                                  const taskId = task._id || task.id || `task-${taskIndex}`
                                  return (
                                    <div key={taskId} className="ml-4">
                                      <TaskNode
                                        task={task}
                                        onView={onViewTask}
                                        onViewPlan={planGroup.plan ? () => planId && onViewPlan?.(planId) : undefined}
                                      />
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Orphaned Tasks */}
                          {!planGroup.plan && planGroup.tasks.length > 0 && (
                            <div className="space-y-2">
                              {planGroup.tasks.map((task, taskIndex) => {
                                const taskId = task._id || task.id || `task-${taskIndex}`
                                return (
                                  <div key={taskId}>
                                    <TaskNode task={task} onView={onViewTask} />
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}


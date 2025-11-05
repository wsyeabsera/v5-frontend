'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Brain, Target, CheckSquare, ChevronRight, Loader2 } from 'lucide-react'
import { usePlan, useThought } from '@/lib/queries-v2'

interface TaskRelationshipsProps {
  task: {
    _id?: string
    id?: string
    planId?: string
    status?: string
  }
  onViewThought?: (thoughtId: string) => void
  onViewPlan?: (planId: string) => void
  onViewTask?: (taskId: string) => void
}

export function TaskRelationships({
  task,
  onViewThought,
  onViewPlan,
  onViewTask,
}: TaskRelationshipsProps) {
  const taskId = task._id || task.id || ''
  const planId = task.planId

  // Fetch plan to get thoughtId
  const { data: plan, isLoading: isLoadingPlan } = usePlan(planId || '')
  const thoughtId = plan?.thoughtId

  // Fetch thought
  const { data: thought, isLoading: isLoadingThought } = useThought(thoughtId || '')

  const isLoading = isLoadingPlan || isLoadingThought

  if (!planId && !thoughtId) {
    return null
  }

  return (
    <Card className="p-4 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200/50 dark:border-blue-900/50">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">Workflow Chain:</span>
        
        {/* Thought */}
        {thought && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 h-auto py-2 px-3 bg-white/80 dark:bg-gray-900/80 hover:bg-white dark:hover:bg-gray-900"
              onClick={() => thoughtId && onViewThought?.(thoughtId)}
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-medium text-blue-900 dark:text-blue-100">Thought</div>
                  <div className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                    {thought.userQuery || 'No query'}
                  </div>
                </div>
              </div>
            </Button>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </>
        )}

        {/* Plan */}
        {plan && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 h-auto py-2 px-3 bg-white/80 dark:bg-gray-900/80 hover:bg-white dark:hover:bg-gray-900"
              onClick={() => planId && onViewPlan?.(planId)}
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-medium text-green-900 dark:text-green-100">Plan</div>
                  <div className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                    {plan.goal || 'No goal'}
                  </div>
                </div>
              </div>
            </Button>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </>
        )}

        {/* Task */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 h-auto py-2 px-3 bg-white/80 dark:bg-gray-900/80 hover:bg-white dark:hover:bg-gray-900"
          onClick={() => taskId && onViewTask?.(taskId)}
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <CheckSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-left">
              <div className="text-xs font-medium text-purple-900 dark:text-purple-100">Task</div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={task.status === 'completed' ? 'default' : task.status === 'failed' ? 'destructive' : 'outline'}
                  className="text-xs"
                >
                  {task.status || 'unknown'}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  {taskId.substring(0, 8)}...
                </span>
              </div>
            </div>
          </div>
        </Button>

        {isLoading && (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>
    </Card>
  )
}


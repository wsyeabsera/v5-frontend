'use client'

import { Badge } from '@/components/ui/badge'
import { ChevronRight, Brain, Target, CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RelationshipBreadcrumbProps {
  thought?: {
    _id?: string
    id?: string
    userQuery?: string
  }
  plan?: {
    _id?: string
    id?: string
    goal?: string
  }
  task?: {
    _id?: string
    id?: string
  }
  onViewThought?: (thoughtId: string) => void
  onViewPlan?: (planId: string) => void
  onViewTask?: (taskId: string) => void
}

export function RelationshipBreadcrumb({
  thought,
  plan,
  task,
  onViewThought,
  onViewPlan,
  onViewTask,
}: RelationshipBreadcrumbProps) {
  const items = []

  if (thought) {
    const thoughtId = thought._id || thought.id || ''
    items.push({
      type: 'thought',
      id: thoughtId,
      label: thought.userQuery || `Thought ${thoughtId.substring(0, 8)}...`,
      onClick: () => onViewThought?.(thoughtId),
    })
  }

  if (plan) {
    const planId = plan._id || plan.id || ''
    items.push({
      type: 'plan',
      id: planId,
      label: plan.goal || `Plan ${planId.substring(0, 8)}...`,
      onClick: () => onViewPlan?.(planId),
    })
  }

  if (task) {
    const taskId = task._id || task.id || ''
    items.push({
      type: 'task',
      id: taskId,
      label: `Task ${taskId.substring(0, 8)}...`,
      onClick: () => onViewTask?.(taskId),
    })
  }

  if (items.length === 0) {
    return null
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'thought':
        return <Brain className="w-3 h-3" />
      case 'plan':
        return <Target className="w-3 h-3" />
      case 'task':
        return <CheckSquare className="w-3 h-3" />
      default:
        return null
    }
  }

  const getColor = (type: string) => {
    switch (type) {
      case 'thought':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
      case 'plan':
        return 'border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300'
      case 'task':
        return 'border-purple-500 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300'
      default:
        return ''
    }
  }

  return (
    <div className="flex items-center gap-1 flex-wrap text-xs">
      {items.map((item, index) => (
        <div key={item.id} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
          <Badge
            variant="outline"
            className={`cursor-pointer hover:opacity-80 transition-opacity ${getColor(item.type)}`}
            onClick={item.onClick}
          >
            <span className="mr-1">{getIcon(item.type)}</span>
            <span className="line-clamp-1 max-w-[150px]">{item.label}</span>
          </Badge>
        </div>
      ))}
    </div>
  )
}


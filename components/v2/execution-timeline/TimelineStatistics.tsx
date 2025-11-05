'use client'

import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, Target, CheckSquare, Activity, TrendingUp, AlertCircle, Clock } from 'lucide-react'
import { useThoughts, usePlans, useTasks } from '@/lib/queries-v2'

interface TimelineStatisticsProps {
  filters?: {
    status?: string
    agentConfigId?: string
    startDate?: string
    endDate?: string
  }
}

export function TimelineStatistics({ filters }: TimelineStatisticsProps) {
  const { data: thoughtsData } = useThoughts({ limit: 1000 })
  const { data: plansData } = usePlans({ 
    limit: 1000, 
    ...(filters?.status && typeof filters.status === 'string' 
      ? { status: filters.status as 'pending' | 'in-progress' | 'completed' | 'failed' }
      : {}),
    ...(filters?.agentConfigId ? { agentConfigId: filters.agentConfigId } : {}),
    ...(filters?.startDate ? { startDate: filters.startDate } : {}),
    ...(filters?.endDate ? { endDate: filters.endDate } : {}),
  })
  const { data: tasksData } = useTasks({ 
    limit: 1000, 
    skip: 0,
    ...(filters?.status && typeof filters.status === 'string' 
      ? { status: filters.status as 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled' }
      : {}),
    ...(filters?.agentConfigId ? { agentConfigId: filters.agentConfigId } : {}),
    ...(filters?.startDate ? { startDate: filters.startDate } : {}),
    ...(filters?.endDate ? { endDate: filters.endDate } : {}),
  })

  const thoughts = useMemo(() => {
    if (Array.isArray(thoughtsData)) return thoughtsData
    return thoughtsData?.thoughts || []
  }, [thoughtsData])

  const plans = useMemo(() => {
    if (Array.isArray(plansData)) return plansData
    return plansData?.plans || []
  }, [plansData])

  const tasks = useMemo(() => {
    if (Array.isArray(tasksData)) return tasksData
    return tasksData?.tasks || []
  }, [tasksData])

  const stats = useMemo(() => {
    const totalThoughts = thoughts.length
    const totalPlans = plans.length
    const totalTasks = tasks.length

    // Plan status breakdown
    const planStatuses = {
      pending: plans.filter((p: any) => !p.status || p.status === 'pending').length,
      inProgress: plans.filter((p: any) => p.status === 'in-progress').length,
      completed: plans.filter((p: any) => p.status === 'completed').length,
      failed: plans.filter((p: any) => p.status === 'failed').length,
    }

    // Task status breakdown
    const taskStatuses = {
      pending: tasks.filter((t: any) => !t.status || t.status === 'pending').length,
      inProgress: tasks.filter((t: any) => t.status === 'in_progress').length,
      paused: tasks.filter((t: any) => t.status === 'paused').length,
      completed: tasks.filter((t: any) => t.status === 'completed').length,
      failed: tasks.filter((t: any) => t.status === 'failed').length,
      cancelled: tasks.filter((t: any) => t.status === 'cancelled').length,
    }

    // Active workflows (thoughts with plans or tasks)
    const thoughtsWithPlans = thoughts.filter((t: any) => {
      const thoughtId = t._id || t.id
      return plans.some((p: any) => p.thoughtId === thoughtId)
    }).length

    const thoughtsWithTasks = thoughts.filter((t: any) => {
      const thoughtId = t._id || t.id
      const relatedPlans = plans.filter((p: any) => p.thoughtId === thoughtId)
      const planIds = relatedPlans.map((p: any) => p._id || p.id)
      return tasks.some((task: any) => planIds.includes(task.planId))
    }).length

    const activeWorkflows = Math.max(thoughtsWithPlans, thoughtsWithTasks)

    // Completed workflows
    const completedWorkflows = tasks.filter((t: any) => t.status === 'completed').length

    // Needs attention (paused tasks or failed plans/tasks)
    const needsAttention =
      taskStatuses.paused +
      taskStatuses.failed +
      planStatuses.failed +
      tasks.filter((t: any) => t.pendingUserInputs && t.pendingUserInputs.length > 0).length

    return {
      totalThoughts,
      totalPlans,
      totalTasks,
      planStatuses,
      taskStatuses,
      activeWorkflows,
      completedWorkflows,
      needsAttention,
    }
  }, [thoughts, plans, tasks])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Thoughts */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Thoughts</p>
            <p className="text-2xl font-bold mt-1">{stats.totalThoughts}</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-950/30">
            <Brain className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </Card>

      {/* Total Plans */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Plans</p>
            <p className="text-2xl font-bold mt-1">{stats.totalPlans}</p>
            <div className="flex gap-1 mt-2">
              <Badge variant="outline" className="text-xs">
                {stats.planStatuses.completed} done
              </Badge>
              <Badge variant="outline" className="text-xs">
                {stats.planStatuses.inProgress} active
              </Badge>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-green-100 dark:bg-green-950/30">
            <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </Card>

      {/* Total Tasks */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
            <p className="text-2xl font-bold mt-1">{stats.totalTasks}</p>
            <div className="flex gap-1 mt-2">
              <Badge variant="outline" className="text-xs">
                {stats.taskStatuses.completed} done
              </Badge>
              <Badge variant="outline" className="text-xs">
                {stats.taskStatuses.inProgress} active
              </Badge>
              {stats.taskStatuses.paused > 0 && (
                <Badge variant="outline" className="text-xs text-yellow-600">
                  {stats.taskStatuses.paused} paused
                </Badge>
              )}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-950/30">
            <CheckSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </Card>

      {/* Active Workflows */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Active Workflows</p>
            <p className="text-2xl font-bold mt-1">{stats.activeWorkflows}</p>
            <div className="flex gap-1 mt-2">
              <Badge variant="default" className="text-xs">
                {stats.completedWorkflows} completed
              </Badge>
              {stats.needsAttention > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {stats.needsAttention} need attention
                </Badge>
              )}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-950/30">
            <Activity className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
      </Card>

      {/* Status Breakdown - Plans */}
      <Card className="p-4 lg:col-span-2">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
            <p className="text-sm font-semibold">Plan Status Breakdown</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              <Clock className="w-3 h-3" />
              Pending: {stats.planStatuses.pending}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Activity className="w-3 h-3" />
              In Progress: {stats.planStatuses.inProgress}
            </Badge>
            <Badge variant="default" className="gap-1">
              <TrendingUp className="w-3 h-3" />
              Completed: {stats.planStatuses.completed}
            </Badge>
            {stats.planStatuses.failed > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="w-3 h-3" />
                Failed: {stats.planStatuses.failed}
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Status Breakdown - Tasks */}
      <Card className="p-4 lg:col-span-2">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <p className="text-sm font-semibold">Task Status Breakdown</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              <Clock className="w-3 h-3" />
              Pending: {stats.taskStatuses.pending}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Activity className="w-3 h-3" />
              In Progress: {stats.taskStatuses.inProgress}
            </Badge>
            {stats.taskStatuses.paused > 0 && (
              <Badge variant="outline" className="gap-1 text-yellow-600">
                <Clock className="w-3 h-3" />
                Paused: {stats.taskStatuses.paused}
              </Badge>
            )}
            <Badge variant="default" className="gap-1">
              <TrendingUp className="w-3 h-3" />
              Completed: {stats.taskStatuses.completed}
            </Badge>
            {stats.taskStatuses.failed > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="w-3 h-3" />
                Failed: {stats.taskStatuses.failed}
              </Badge>
            )}
            {stats.taskStatuses.cancelled > 0 && (
              <Badge variant="outline" className="gap-1">
                <AlertCircle className="w-3 h-3" />
                Cancelled: {stats.taskStatuses.cancelled}
              </Badge>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}


'use client'

import { useState, useEffect, useMemo } from 'react'
import { useThoughts, usePlans, useTasks, useThought, usePlan, useTask } from '@/lib/queries-v2'
import { ExecutionFlowCard } from './ExecutionFlowCard'
import { TimelineSearch } from './TimelineSearch'
import { TimelineFilters } from './TimelineFilters'
import { ThoughtViewDialog } from '@/components/v2/thoughts/ThoughtViewDialog'
import { PlanViewDialog } from '@/components/v2/plans/PlanViewDialog'
import { TaskViewDialog } from '@/components/v2/tasks/TaskViewDialog'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

export function ExecutionTimelineView() {
  const queryClient = useQueryClient()
  const [searchType, setSearchType] = useState<'thoughtId' | 'planId' | 'taskId' | 'all' | null>('all')
  const [searchValue, setSearchValue] = useState('')
  const [filters, setFilters] = useState<{
    status?: string
    agentConfigId?: string
    startDate?: string
    endDate?: string
  }>({})

  // View dialog states
  const [viewThoughtDialogOpen, setViewThoughtDialogOpen] = useState(false)
  const [viewPlanDialogOpen, setViewPlanDialogOpen] = useState(false)
  const [viewTaskDialogOpen, setViewTaskDialogOpen] = useState(false)
  const [selectedThoughtId, setSelectedThoughtId] = useState<string | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  // Fetch data based on search
  const { data: thoughtData, isLoading: isLoadingThought } = useThought(
    searchType === 'thoughtId' && searchValue ? searchValue : ''
  )
  const { data: planData, isLoading: isLoadingPlan } = usePlan(
    searchType === 'planId' && searchValue ? searchValue : ''
  )
  const { data: taskData, isLoading: isLoadingTask } = useTask(
    searchType === 'taskId' && searchValue ? searchValue : ''
  )

  // Fetch lists for "all" view
  const { data: thoughtsData, isLoading: isLoadingThoughts } = useThoughts(
    searchType === 'all' ? { limit: 50 } : undefined
  )
  const { data: plansData, isLoading: isLoadingPlans } = usePlans(
    searchType === 'all' ? { limit: 50 } : undefined
  )
  const { data: tasksData, isLoading: isLoadingTasks } = useTasks(
    searchType === 'all' ? { limit: 50 } : undefined
  )

  // Extract arrays from responses
  const thoughts = useMemo(() => {
    if (searchType === 'thoughtId' && thoughtData) {
      return [thoughtData]
    }
    if (Array.isArray(thoughtsData)) return thoughtsData
    return thoughtsData?.thoughts || []
  }, [thoughtData, thoughtsData, searchType])

  const plans = useMemo(() => {
    if (searchType === 'planId' && planData) {
      return [planData]
    }
    if (Array.isArray(plansData)) return plansData
    return plansData?.plans || []
  }, [planData, plansData, searchType])

  const tasks = useMemo(() => {
    if (searchType === 'taskId' && taskData) {
      return [taskData]
    }
    if (Array.isArray(tasksData)) return tasksData
    return tasksData?.tasks || []
  }, [taskData, tasksData, searchType])

  // Build execution flows from fetched data
  const executionFlows = useMemo(() => {
    if (searchType === 'thoughtId' && thoughtData) {
      // Find related plans and tasks
      const relatedPlans = plans.filter((p: any) => p.thoughtId === thoughtData._id || p.thoughtId === thoughtData.id)
      const relatedTasks = tasks.filter((t: any) =>
        relatedPlans.some((p: any) => t.planId === (p._id || p.id))
      )
      return [{
        thought: thoughtData,
        plan: relatedPlans[0] || null,
        tasks: relatedTasks,
      }]
    }

    if (searchType === 'planId' && planData) {
      // Find related thought and tasks
      const relatedThought = thoughts.find((t: any) => t._id === planData.thoughtId || t.id === planData.thoughtId)
      const relatedTasks = tasks.filter((t: any) => t.planId === (planData._id || planData.id))
      return [{
        thought: relatedThought || null,
        plan: planData,
        tasks: relatedTasks,
      }]
    }

    if (searchType === 'taskId' && taskData) {
      // Find related plan and thought
      const relatedPlan = plans.find((p: any) => p._id === taskData.planId || p.id === taskData.planId)
      const relatedThought = relatedPlan
        ? thoughts.find((t: any) => t._id === relatedPlan.thoughtId || t.id === relatedPlan.thoughtId)
        : null
      return [{
        thought: relatedThought || null,
        plan: relatedPlan || null,
        tasks: [taskData],
      }]
    }

    // For "all" view, build flows from all data
    const flows: Array<{ thought?: any; plan?: any; tasks: any[] }> = []
    const processedPlans = new Set<string>()
    const processedTasks = new Set<string>()

    // Group by thought
    thoughts.forEach((thought: any) => {
      const thoughtId = thought._id || thought.id
      const relatedPlans = plans.filter((p: any) => p.thoughtId === thoughtId)
      const flowTasks: any[] = []

      relatedPlans.forEach((plan: any) => {
        const planId = plan._id || plan.id
        if (!processedPlans.has(planId)) {
          processedPlans.add(planId)
          const planTasks = tasks.filter((t: any) => t.planId === planId)
          planTasks.forEach((task: any) => {
            const taskId = task._id || task.id
            if (!processedTasks.has(taskId)) {
              processedTasks.add(taskId)
              flowTasks.push(task)
            }
          })
        }
      })

      if (relatedPlans.length > 0) {
        flows.push({
          thought,
          plan: relatedPlans[0],
          tasks: flowTasks,
        })
      } else {
        flows.push({ thought, tasks: [] })
      }
    })

    // Add plans without thoughts
    plans.forEach((plan: any) => {
      const planId = plan._id || plan.id
      if (!processedPlans.has(planId)) {
        processedPlans.add(planId)
        const planTasks = tasks.filter((t: any) => t.planId === planId)
        flows.push({
          plan,
          tasks: planTasks,
        })
      }
    })

    // Add tasks without plans
    tasks.forEach((task: any) => {
      const taskId = task._id || task.id
      if (!processedTasks.has(taskId)) {
        flows.push({
          tasks: [task],
        })
      }
    })

    return flows
  }, [thoughtData, planData, taskData, thoughts, plans, tasks, searchType])

  const isLoading =
    isLoadingThought ||
    isLoadingPlan ||
    isLoadingTask ||
    isLoadingThoughts ||
    isLoadingPlans ||
    isLoadingTasks

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['v2', 'thoughts'] })
    queryClient.invalidateQueries({ queryKey: ['v2', 'plans'] })
    queryClient.invalidateQueries({ queryKey: ['v2', 'tasks'] })
  }

  const handleViewThought = (thoughtId: string) => {
    setSelectedThoughtId(thoughtId)
    setViewThoughtDialogOpen(true)
  }

  const handleViewPlan = (planId: string) => {
    setSelectedPlanId(planId)
    setViewPlanDialogOpen(true)
  }

  const handleViewTask = (taskId: string) => {
    setSelectedTaskId(taskId)
    setViewTaskDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="space-y-4">
        <TimelineSearch
          searchType={searchType}
          searchValue={searchValue}
          onSearchTypeChange={setSearchType}
          onSearchValueChange={setSearchValue}
          onClear={() => {
            setSearchType('all')
            setSearchValue('')
          }}
        />
        {searchType === 'all' && (
          <TimelineFilters filters={filters} onFiltersChange={setFilters} />
        )}
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-3 text-sm text-muted-foreground">Loading execution timeline...</span>
        </div>
      )}

      {/* Execution Flows */}
      {!isLoading && executionFlows.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-muted/30">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No execution flows found</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {searchType === 'all'
              ? 'No execution flows found. Try adjusting your filters or search for a specific thought, plan, or task.'
              : 'No data found for the specified search criteria. Try a different search.'}
          </p>
        </div>
      )}

      {!isLoading && executionFlows.length > 0 && (
        <div className="space-y-6">
          {executionFlows.map((flow, index) => (
            <ExecutionFlowCard
              key={`flow-${index}-${flow.thought?._id || flow.thought?.id || flow.plan?._id || flow.plan?.id || index}`}
              thought={flow.thought}
              plan={flow.plan}
              tasks={flow.tasks}
              onViewThought={handleViewThought}
              onViewPlan={handleViewPlan}
              onViewTask={handleViewTask}
            />
          ))}
        </div>
      )}

      {/* View Dialogs */}
      <ThoughtViewDialog
        open={viewThoughtDialogOpen}
        onOpenChange={setViewThoughtDialogOpen}
        thoughtId={selectedThoughtId}
      />
      <PlanViewDialog
        open={viewPlanDialogOpen}
        onOpenChange={setViewPlanDialogOpen}
        planId={selectedPlanId}
      />
      <TaskViewDialog
        open={viewTaskDialogOpen}
        onOpenChange={setViewTaskDialogOpen}
        taskId={selectedTaskId}
      />
    </div>
  )
}


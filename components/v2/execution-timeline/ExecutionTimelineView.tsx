'use client'

import { useState, useMemo } from 'react'
import { useThoughts, usePlans, useTasks, useThought, usePlan, useTask } from '@/lib/queries-v2'
import { TimelineStatistics } from './TimelineStatistics'
import { GroupedTimelineView } from './GroupedTimelineView'
import { FlowchartView } from './FlowchartView'
import { TimelineSearch } from './TimelineSearch'
import { TimelineFilters } from './TimelineFilters'
import { ThoughtViewDialog } from '@/components/v2/thoughts/ThoughtViewDialog'
import { PlanViewDialog } from '@/components/v2/plans/PlanViewDialog'
import { TaskViewDialog } from '@/components/v2/tasks/TaskViewDialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, AlertCircle, RefreshCw, List, GitBranch } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

type ViewMode = 'grouped' | 'flowchart'

export function ExecutionTimelineView() {
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState<ViewMode>('grouped')
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
    searchType === 'all' ? { limit: 100 } : undefined
  )
  const { data: plansData, isLoading: isLoadingPlans } = usePlans(
    searchType === 'all' ? { limit: 100, ...filters } : undefined
  )
  const { data: tasksData, isLoading: isLoadingTasks } = useTasks(
    searchType === 'all' ? { limit: 100, ...filters } : undefined
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

  const hasData = thoughts.length > 0 || plans.length > 0 || tasks.length > 0

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      {searchType === 'all' && !isLoading && (
        <TimelineStatistics filters={filters} />
      )}

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

      {/* Controls */}
      <div className="flex items-center justify-between">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="grouped">
              <List className="w-4 h-4 mr-2" />
              Grouped List
            </TabsTrigger>
            <TabsTrigger value="flowchart">
              <GitBranch className="w-4 h-4 mr-2" />
              Flowchart
            </TabsTrigger>
          </TabsList>
        </Tabs>
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

      {/* Empty State */}
      {!isLoading && !hasData && (
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

      {/* Content Views */}
      {!isLoading && hasData && (
        <>
          {viewMode === 'grouped' && (
            <GroupedTimelineView
              thoughts={thoughts}
              plans={plans}
              tasks={tasks}
              onViewThought={handleViewThought}
              onViewPlan={handleViewPlan}
              onViewTask={handleViewTask}
            />
          )}
          {viewMode === 'flowchart' && (
            <FlowchartView
              thoughts={thoughts}
              plans={plans}
              tasks={tasks}
              onViewThought={handleViewThought}
              onViewPlan={handleViewPlan}
              onViewTask={handleViewTask}
            />
          )}
        </>
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


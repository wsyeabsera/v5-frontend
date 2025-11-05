'use client'

import { useState } from 'react'
import { usePlans } from '@/lib/queries-v2'
import { PlanCard } from './PlanCard'
import { PlanViewDialog } from './PlanViewDialog'
import { PlanFilters } from './PlanFilters'
import { GeneratePlanDialog } from './GeneratePlanDialog'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, Plus } from 'lucide-react'

export function PlanList() {
  const [filters, setFilters] = useState<{
    thoughtId?: string
    status?: 'pending' | 'in-progress' | 'completed' | 'failed'
    agentConfigId?: string
    startDate?: string
    endDate?: string
    limit?: number
    skip?: number
  }>({ limit: 50, skip: 0 })
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)

  const { data: plansData, isLoading, error } = usePlans(
    Object.keys(filters).length > 0 ? filters : undefined
  )

  // Extract plans array and pagination info from response
  const plans = Array.isArray(plansData) 
    ? plansData 
    : plansData?.plans || []
  const pagination = plansData && typeof plansData === 'object' && !Array.isArray(plansData)
    ? {
        total: plansData.total || plans.length,
        limit: plansData.limit || filters.limit || 50,
        skip: plansData.skip || filters.skip || 0,
        hasMore: plansData.hasMore || false,
      }
    : null

  const handleGenerate = () => {
    setGenerateDialogOpen(true)
  }

  const handleView = (planId: string) => {
    setSelectedPlanId(planId)
    setViewDialogOpen(true)
  }

  const handleViewDialogClose = (open: boolean) => {
    setViewDialogOpen(open)
    if (!open) {
      setSelectedPlanId(null)
    }
  }

  const handleGenerateSuccess = () => {
    setGenerateDialogOpen(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Loading plans...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
        <div>
          <div className="font-semibold text-red-900 dark:text-red-100">Failed to load plans</div>
          <div className="text-sm text-red-700 dark:text-red-300 mt-1">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Plans</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {plans.length} plan{plans.length !== 1 ? 's' : ''} found
            {pagination && ` (${pagination.total} total)`}
          </p>
        </div>
        <Button onClick={handleGenerate} className="gap-2">
          <Plus className="w-4 h-4" />
          Generate Plan
        </Button>
      </div>

      <PlanFilters filters={filters} onFiltersChange={setFilters} />

      {plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-lg bg-muted/30 border border-dashed border-border">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-muted-foreground" />
            <div className="text-center">
              <div className="font-semibold text-lg mb-1">No plans found</div>
              <div className="text-sm text-muted-foreground">
                {Object.keys(filters).length > 0 && 
                 filters.thoughtId === undefined && 
                 filters.status === undefined && 
                 filters.agentConfigId === undefined &&
                 filters.startDate === undefined &&
                 filters.endDate === undefined
                  ? 'Try adjusting your filters or generate a new plan'
                  : 'Generate your first plan to get started'}
              </div>
            </div>
          </div>
          <Button onClick={handleGenerate} size="lg" className="mt-4 gap-2">
            <Plus className="w-5 h-5" />
            Generate Your First Plan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan: any, index: number) => (
            <div
              key={plan._id || plan.id || index}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <PlanCard plan={plan} onView={handleView} />
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => {
              setFilters({
                ...filters,
                skip: (filters.skip || 0) + (filters.limit || 50),
              })
            }}
          >
            Load More
          </Button>
        </div>
      )}

      <GeneratePlanDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        onSuccess={handleGenerateSuccess}
      />

      <PlanViewDialog
        open={viewDialogOpen}
        onOpenChange={handleViewDialogClose}
        planId={selectedPlanId}
      />
    </div>
  )
}


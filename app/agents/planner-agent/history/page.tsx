'use client'

import { useState, useEffect } from 'react'
import { PlannerAgentOutput } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PlannerHistoryList } from '@/components/planner/PlannerHistoryList'
import { PlannerExampleForm } from '@/components/planner/PlannerExampleForm'
import { ArrowLeft, RefreshCw, History, Trash2 } from 'lucide-react'
import { DeleteAllDialog } from '@/components/ui/delete-all-dialog'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PlannerDetail } from '@/components/planner/PlannerDetail'
import { PlanExample } from '@/types'

export default function PlannerAgentHistoryPage() {
  const [plans, setPlans] = useState<PlannerAgentOutput[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<PlannerAgentOutput | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [exportingPlan, setExportingPlan] = useState<PlannerAgentOutput | null>(null)

  const loadHistory = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/agents/planner-agent/history')
      if (!response.ok) {
        throw new Error('Failed to load planner history')
      }

      const data = await response.json()
      // Ensure timestamps are Date objects
      const processedData = data.map((d: any) => ({
        ...d,
        timestamp: new Date(d.timestamp),
        plan: {
          ...d.plan,
          createdAt: new Date(d.plan.createdAt),
          steps: d.plan.steps.map((step: any) => ({ ...step })),
        },
        requestContext: d.requestContext
          ? {
              ...d.requestContext,
              createdAt: new Date(d.requestContext.createdAt),
            }
          : undefined,
      }))
      setPlans(processedData)
    } catch (err: any) {
      setError(err.message || 'Failed to load planner history')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const handleViewDetails = (plan: PlannerAgentOutput) => {
    setSelectedPlan(plan)
    setIsDetailOpen(true)
  }

  const handleExportAsExample = async (plan: PlannerAgentOutput) => {
    // userQuery might not be in requestContext due to storage omission
    // Try to fetch from request storage first
    let enrichedPlan = plan
    
    if (!plan.requestContext?.userQuery) {
      try {
        const requestResponse = await fetch(`/api/requests/${plan.requestId}`)
        if (requestResponse.ok) {
          const requestData = await requestResponse.json()
          enrichedPlan = {
            ...plan,
            requestContext: plan.requestContext ? {
              ...plan.requestContext,
              userQuery: requestData.userQuery,
            } : {
              requestId: plan.requestId,
              createdAt: new Date(),
              agentChain: [],
              status: 'completed' as const,
              userQuery: requestData.userQuery,
            },
          }
        }
      } catch (err) {
        // Silent fail, will use fallback in transformPlanToExample
      }
    }
    
    setExportingPlan(enrichedPlan)
    setIsExportDialogOpen(true)
  }

  const transformPlanToExample = (plan: PlannerAgentOutput): PlanExample => {
    // Use goal as fallback if no userQuery found
    // Note: requestContext might be missing userQuery due to storage limitation
    const userQuery = plan.requestContext?.userQuery || plan.plan.goal || 'User query not available'

    // Extract unique actions for tags
    const actions = new Set(plan.plan.steps.map(s => s.action))
    
    // Generate tags based on plan characteristics
    const tags: string[] = []
    actions.forEach(action => {
      if (action && action !== 'unknown') {
        tags.push(action)
      }
    })
    
    // Add complexity level tag
    const complexity = plan.plan.estimatedComplexity || 0
    if (complexity < 0.3) {
      tags.push('simple')
    } else if (complexity < 0.7) {
      tags.push('moderate')
    } else {
      tags.push('complex')
    }

    // Add based on thoughts tag if applicable
    if (plan.basedOnThoughts && plan.basedOnThoughts.length > 0) {
      tags.push('thought-based')
    }

    // Auto-generate rationale from plan metadata
    const rationaleParts: string[] = []
    if (plan.rationale) {
      rationaleParts.push(plan.rationale)
    }
    rationaleParts.push(`Plan executed with ${(plan.plan.confidence * 100).toFixed(0)}% confidence`)
    rationaleParts.push(`Consists of ${plan.plan.steps.length} well-structured steps`)
    if (plan.basedOnThoughts && plan.basedOnThoughts.length > 0) {
      rationaleParts.push(`Based on analysis from ${plan.basedOnThoughts.length} thought(s)`)
    }
    const rationale = rationaleParts.join('. ')

    const example: PlanExample = {
      id: '', // Temporary - will be generated by API
      embedding: [], // Will be generated by API
      query: userQuery,
      goal: plan.plan.goal,
      steps: plan.plan.steps.map(step => ({
        description: step.description,
        action: step.action,
        parameters: step.parameters || {},
      })),
      rationale,
      successRating: plan.plan.confidence || 0.8,
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
    }

    return example
  }

  const handleExportSubmit = async (
    exampleData: Omit<PlanExample, 'id' | 'embedding' | 'createdAt' | 'updatedAt' | 'usageCount'>
  ) => {
    try {
      const response = await fetch('/api/planner-examples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exampleData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create example')
      }

      setIsExportDialogOpen(false)
      setExportingPlan(null)
      alert('Successfully exported plan as example! View it in Planner Examples.')
    } catch (err: any) {
      setError(err.message || 'Failed to export plan as example')
    }
  }

  const handleDeleteAll = async () => {
    try {
      const response = await fetch('/api/agents/planner-agent/history', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete all planner history')
      }

      const result = await response.json()
      setError(null)
      await loadHistory()
      alert(`Successfully deleted ${result.count} plan${result.count !== 1 ? 's' : ''}`)
    } catch (err: any) {
      setError(err.message || 'Failed to delete all planner history')
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Breadcrumbs items={[
          { label: 'Agent Pipeline', href: '/agents/pipeline' },
          { label: 'Planner Agent', href: '/agents/planner-agent' },
          { label: 'History' },
        ]} />
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/agents/planner-agent">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="mb-1 flex items-center gap-2">
                <History className="w-5 h-5" />
                Planner Agent History
              </h1>
              <p className="text-[13px] text-muted-foreground">
                View all past planner agent outputs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadHistory}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {plans.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteAllOpen(true)}
                disabled={isLoading}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete All
              </Button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            Showing {plans.length} plan{plans.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* History List */}
        <Card>
          <CardHeader>
            <CardTitle>Planner History</CardTitle>
          </CardHeader>
          <CardContent>
            <PlannerHistoryList
              plans={plans}
              isLoading={isLoading}
              onViewDetails={handleViewDetails}
              onExportAsExample={handleExportAsExample}
            />
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Plan Details</DialogTitle>
            </DialogHeader>
            {selectedPlan && <PlannerDetail result={selectedPlan} />}
          </DialogContent>
        </Dialog>

        {/* Export Dialog */}
        <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Export Plan as Example</DialogTitle>
            </DialogHeader>
            {exportingPlan && (() => {
              try {
                const transformedExample = transformPlanToExample(exportingPlan)
                return (
                  <PlannerExampleForm
                    example={transformedExample}
                    onSubmit={handleExportSubmit}
                    onCancel={() => {
                      setIsExportDialogOpen(false)
                      setExportingPlan(null)
                    }}
                    isLoading={false}
                  />
                )
              } catch (err: any) {
                return (
                  <div className="p-4 text-sm text-destructive">
                    {err.message || 'Failed to transform plan to example'}
                  </div>
                )
              }
            })()}
          </DialogContent>
        </Dialog>

        {/* Delete All Dialog */}
        <DeleteAllDialog
          open={isDeleteAllOpen}
          onOpenChange={setIsDeleteAllOpen}
          onConfirm={handleDeleteAll}
          title="Delete All Planner History"
          description="Are you sure you want to delete all planner agent history? This action cannot be undone."
          itemCount={plans.length}
          itemName="plans"
        />
      </div>
    </div>
  )
}


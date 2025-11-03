'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plan } from '@/types'
import { GitCompare, ArrowRight, Plus, Minus, Edit3, Loader2 } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useState, useEffect } from 'react'

interface PlanComparisonProps {
  planId1: string
  planId2: string
  requestId: string
}

interface StepComparison {
  step: any
  status: 'unchanged' | 'added' | 'removed' | 'modified'
  matchedWith?: any
}

export function PlanComparison({ planId1, planId2, requestId }: PlanComparisonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [plan1, setPlan1] = useState<Plan | null>(null)
  const [plan2, setPlan2] = useState<Plan | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch both plans on mount
  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Fetch all plans for this request
        const response = await fetch(`/api/agents/planner-agent/plans/${requestId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch plans')
        }
        
        const allPlans = await response.json()
        
        // Find the specific plans by ID
        const foundPlan1 = allPlans.find((p: any) => p.plan.id === planId1)
        const foundPlan2 = allPlans.find((p: any) => p.plan.id === planId2)
        
        if (!foundPlan1 || !foundPlan2) {
          throw new Error('One or both plans not found')
        }
        
        setPlan1(foundPlan1.plan)
        setPlan2(foundPlan2.plan)
      } catch (err: any) {
        setError(err.message || 'Failed to load plans')
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
  }, [planId1, planId2, requestId])
  
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading plan comparison...</span>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (error || !plan1 || !plan2) {
    return (
      <Card className="border-red-500/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8 text-red-600">
            <p className="text-sm">{error || 'Failed to load plans'}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const originalPlan = plan1
  const newPlan = plan2

  // Compare plans and calculate differences
  const comparison = comparePlans(originalPlan, newPlan)
  
  const {
    unchangedSteps,
    addedSteps,
    removedSteps,
    modifiedSteps
  } = comparison

  const hasChanges = addedSteps.length > 0 || removedSteps.length > 0 || modifiedSteps.length > 0

  if (!hasChanges) {
    return null
  }

  const summary = {
    originalSteps: originalPlan.steps.length,
    newSteps: newPlan.steps.length,
    added: addedSteps.length,
    removed: removedSteps.length,
    modified: modifiedSteps.length,
    unchanged: unchangedSteps.length,
    confidenceChange: newPlan.confidence - originalPlan.confidence
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-blue-500/50">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-blue-600" />
              Plan Changes
              <Badge variant="outline" className="ml-auto">
                {summary.added + summary.removed + summary.modified} changes
              </Badge>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Steps</div>
                <div className="text-2xl font-bold">{summary.newSteps}</div>
                <div className="text-xs text-muted-foreground">
                  from {summary.originalSteps}
                </div>
              </div>
              <div className="text-green-600">
                <div className="text-xs text-muted-foreground mb-1">Added</div>
                <div className="text-2xl font-bold">{summary.added}</div>
                <div className="text-xs text-green-700">new steps</div>
              </div>
              <div className="text-red-600">
                <div className="text-xs text-muted-foreground mb-1">Removed</div>
                <div className="text-2xl font-bold">{summary.removed}</div>
                <div className="text-xs text-red-700">removed</div>
              </div>
              <div className="text-yellow-600">
                <div className="text-xs text-muted-foreground mb-1">Modified</div>
                <div className="text-2xl font-bold">{summary.modified}</div>
                <div className="text-xs text-yellow-700">changed</div>
              </div>
            </div>

            {/* Side-by-side Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Original Plan */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h4 className="text-sm font-semibold">Original Plan</h4>
                  <Badge variant="outline" className="text-xs">
                    {summary.originalSteps} steps
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {((originalPlan.confidence || 0) * 100).toFixed(0)}% confidence
                  </Badge>
                </div>
                <div className="space-y-3">
                  {getAllStepsWithStatus(originalPlan, comparison).map((comp, idx) => (
                    <StepCard key={idx} comparison={comp} side="original" />
                  ))}
                </div>
              </div>

              {/* New Plan */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h4 className="text-sm font-semibold">Updated Plan</h4>
                  <Badge variant="outline" className="text-xs">
                    {summary.newSteps} steps
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {((newPlan.confidence || 0) * 100).toFixed(0)}% confidence
                  </Badge>
                </div>
                <div className="space-y-3">
                  {getAllStepsWithStatus(newPlan, comparison).map((comp, idx) => (
                    <StepCard key={idx} comparison={comp} side="new" />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

function StepCard({ comparison, side }: { comparison: StepComparison; side: 'original' | 'new' }) {
  const { step, status } = comparison

  const statusStyles = {
    unchanged: 'border-border',
    added: 'border-green-500 bg-green-500/10',
    removed: 'border-red-500 bg-red-500/10 opacity-60',
    modified: 'border-yellow-500 bg-yellow-500/10'
  }

  const statusIcons = {
    unchanged: null,
    added: <Plus className="w-3 h-3 text-green-600" />,
    removed: <Minus className="w-3 h-3 text-red-600" />,
    modified: <Edit3 className="w-3 h-3 text-yellow-600" />
  }

  return (
    <div className={`p-3 border rounded-lg ${statusStyles[status]}`}>
      <div className="flex items-start gap-2 mb-2">
        {statusIcons[status]}
        <Badge variant="secondary" className="text-xs">
          {step.order}
        </Badge>
        <span className="text-xs font-mono text-muted-foreground flex-1">
          {step.action}
        </span>
        {(side === 'new' || status !== 'removed') && (
          <Badge
            variant="outline"
            className={`text-xs ${
              status === 'added' ? 'border-green-500 text-green-700' :
              status === 'removed' ? 'border-red-500 text-red-700' :
              status === 'modified' ? 'border-yellow-500 text-yellow-700' :
              ''
            }`}
          >
            {status}
          </Badge>
        )}
      </div>
      <p className="text-sm">{step.description}</p>
      {step.parameters && Object.keys(step.parameters).length > 0 && (
        <details className="mt-2">
          <summary className="text-xs text-muted-foreground cursor-pointer">Parameters</summary>
          <div className="mt-1 space-y-1">
            {Object.entries(step.parameters).map(([key, val]) => (
              <div key={key} className="text-xs">
                <code className="text-muted-foreground">{key}:</code>
                <span className="ml-1">{String(val)}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function comparePlans(originalPlan: Plan, newPlan: Plan) {
  const originalSteps = originalPlan.steps
  const newSteps = newPlan.steps

  // Find unchanged steps (by order and action)
  const unchanged: StepComparison[] = []
  const modified: StepComparison[] = []
  const added: StepComparison[] = []
  const removed: StepComparison[] = []

  // Check each step in the new plan
  newSteps.forEach((step, idx) => {
    const originalStep = originalSteps[idx]
    if (originalStep) {
      if (originalStep.action === step.action && 
          JSON.stringify(originalStep.parameters) === JSON.stringify(step.parameters)) {
        unchanged.push({ step, status: 'unchanged', matchedWith: originalStep })
      } else if (originalStep.action === step.action) {
        modified.push({ step, status: 'modified', matchedWith: originalStep })
      } else {
        added.push({ step, status: 'added' })
      }
    } else {
      added.push({ step, status: 'added' })
    }
  })

  // Find removed steps
  originalSteps.forEach((step, idx) => {
    const newStep = newSteps[idx]
    if (!newStep || newStep.action !== step.action) {
      removed.push({ step, status: 'removed' })
    }
  })

  return { unchangedSteps: unchanged, addedSteps: added, removedSteps: removed, modifiedSteps: modified }
}

function getAllStepsWithStatus(plan: Plan, comparison: ReturnType<typeof comparePlans>): StepComparison[] {
  const result: StepComparison[] = []

  plan.steps.forEach(step => {
    const found = 
      comparison.unchangedSteps.find(s => s.step.order === step.order) ||
      comparison.addedSteps.find(s => s.step.order === step.order) ||
      comparison.removedSteps.find(s => s.step.order === step.order) ||
      comparison.modifiedSteps.find(s => s.step.order === step.order)
    
    if (found) {
      result.push(found)
    } else {
      result.push({ step, status: 'unchanged' })
    }
  })

  return result
}


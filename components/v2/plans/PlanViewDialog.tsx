'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { usePlan } from '@/lib/queries-v2'
import { ExecutePlanDialog } from './ExecutePlanDialog'
import { Loader2, Calendar, Target, CheckCircle2, XCircle, Clock, AlertCircle, Copy, Check, Play } from 'lucide-react'
import { JsonViewer } from '@/components/ui/json-viewer'

interface PlanViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planId: string | null
}

export function PlanViewDialog({ open, onOpenChange, planId }: PlanViewDialogProps) {
  const { data: plan, isLoading, error } = usePlan(planId || '')
  const [copied, setCopied] = useState(false)
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false)

  const handleCopyPlan = async () => {
    if (!plan) return
    try {
      const text = JSON.stringify(plan, null, 2)
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy plan:', err)
    }
  }

  if (!open) return null

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
      case 'in-progress':
        return <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'default'
      case 'in-progress':
        return 'secondary'
      case 'failed':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Plan Details</DialogTitle>
          <DialogDescription>
            View the complete plan data including goal, steps, dependencies, and missing data.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Loading plan...</span>
          </div>
        )}

        {error && (
          <div className="p-6 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
            <div className="font-semibold text-red-900 dark:text-red-100">
              Failed to load plan
            </div>
            <div className="text-sm text-red-700 dark:text-red-300 mt-1">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </div>
          </div>
        )}

        {plan && !isLoading && (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Goal
                </h3>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  {plan.goal || 'No goal provided'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Status */}
                {plan.status && (
                  <Badge variant={getStatusBadgeVariant(plan.status)} className="gap-1">
                    {getStatusIcon(plan.status)}
                    {plan.status}
                  </Badge>
                )}

                {/* Thought ID */}
                {plan.thoughtId && (
                  <div>
                    <span className="text-xs text-muted-foreground mr-2">Thought ID:</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {plan.thoughtId}
                    </Badge>
                  </div>
                )}

                {/* Agent Config ID */}
                {plan.agentConfigId && (
                  <div>
                    <span className="text-xs text-muted-foreground mr-2">Agent Config:</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {plan.agentConfigId}
                    </Badge>
                  </div>
                )}

                {/* Step Count */}
                {Array.isArray(plan.steps) && (
                  <Badge variant="secondary">
                    {plan.steps.length} step{plan.steps.length !== 1 ? 's' : ''}
                  </Badge>
                )}

                {/* Timestamps */}
                {plan.createdAt && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>Created: {new Date(plan.createdAt).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* User Query */}
              {plan.userQuery && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">User Query</h3>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    {plan.userQuery}
                  </p>
                </div>
              )}

              {/* Execute Plan Button */}
              <div className="pt-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setExecuteDialogOpen(true)}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Execute Plan
                </Button>
              </div>
            </div>

            <Separator />

            {/* Steps */}
            {Array.isArray(plan.steps) && plan.steps.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">
                  Steps ({plan.steps.length})
                </h3>
                <div className="space-y-3">
                  {plan.steps
                    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                    .map((step: any, index: number) => (
                      <div
                        key={step.id || index}
                        className="border rounded-lg p-4 space-y-3 bg-muted/30"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Step {step.order || index + 1}</Badge>
                            {step.status && (
                              <Badge variant={getStatusBadgeVariant(step.status)}>
                                {step.status}
                              </Badge>
                            )}
                          </div>
                          {step.id && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {step.id}
                            </span>
                          )}
                        </div>

                        {step.action && (
                          <div>
                            <h4 className="font-medium text-sm mb-1">Action</h4>
                            <code className="text-sm bg-background px-2 py-1 rounded">
                              {step.action}
                            </code>
                          </div>
                        )}

                        {step.description && (
                          <div>
                            <h4 className="font-medium text-sm mb-1">Description</h4>
                            <p className="text-sm text-muted-foreground">{step.description}</p>
                          </div>
                        )}

                        {step.parameters && Object.keys(step.parameters).length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm mb-1">Parameters</h4>
                            <JsonViewer data={step.parameters} collapsible defaultExpanded={false} />
                          </div>
                        )}

                        {step.expectedOutput && (
                          <div>
                            <h4 className="font-medium text-sm mb-1">Expected Output</h4>
                            <JsonViewer data={step.expectedOutput} collapsible defaultExpanded={false} />
                          </div>
                        )}

                        {Array.isArray(step.dependencies) && step.dependencies.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm mb-1">Dependencies</h4>
                            <div className="flex flex-wrap gap-1">
                              {step.dependencies.map((dep: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {dep}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Missing Data */}
            {Array.isArray(plan.missingData) && plan.missingData.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">
                    Missing Data ({plan.missingData.length})
                  </h3>
                  <div className="space-y-2">
                    {plan.missingData.map((item: any, index: number) => (
                      <div
                        key={index}
                        className="border rounded-lg p-3 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900/30"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">
                            {item.step} - {item.field}
                          </span>
                          {item.type && (
                            <Badge variant="outline" className="text-xs">
                              {item.type}
                            </Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Raw Data */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Raw Data</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyPlan}
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy JSON
                    </>
                  )}
                </Button>
              </div>
              <JsonViewer data={plan} collapsible defaultExpanded={false} />
            </div>
          </div>
        )}
      </DialogContent>

      {/* Execute Plan Dialog */}
      {planId && (
        <ExecutePlanDialog
          open={executeDialogOpen}
          onOpenChange={setExecuteDialogOpen}
          planId={planId}
          onSuccess={() => {
            // Refresh plan data
            window.location.reload()
          }}
        />
      )}
    </Dialog>
  )
}


'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plan, CriticAgentOutput } from '@/types'
import { Play, X, Loader2, AlertTriangle, CheckCircle, ShieldCheck } from 'lucide-react'

interface ExecutePlanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: Plan | null
  onConfirm: () => void
  loading: boolean
  critique?: CriticAgentOutput
}

export function ExecutePlanModal({
  open,
  onOpenChange,
  plan,
  onConfirm,
  loading,
  critique,
}: ExecutePlanModalProps) {
  if (!plan) return null

  const getRecommendationBadge = (recommendation?: string) => {
    if (!recommendation) return null
    
    switch (recommendation) {
      case 'approve':
        return (
          <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approve
          </Badge>
        )
      case 'approve-with-dynamic-fix':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approve (Dynamic Fix)
          </Badge>
        )
      case 'revise':
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Revise
          </Badge>
        )
      case 'reject':
        return (
          <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Reject
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Review & Execute Plan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Critique Recommendation */}
          {critique && (
            <div className="p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-medium text-sm">Critique Recommendation</span>
                {getRecommendationBadge(critique.critique.recommendation)}
              </div>
              <p className="text-sm text-muted-foreground">{critique.critique.rationale}</p>
              
              {critique.critique.issues.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Issues:</p>
                  <ul className="space-y-1">
                    {critique.critique.issues.slice(0, 3).map((issue, idx) => (
                      <li key={idx} className="text-xs flex items-start gap-2">
                        <AlertTriangle className="w-3 h-3 mt-0.5 text-yellow-600" />
                        <span>{issue.description}</span>
                      </li>
                    ))}
                  </ul>
                  {critique.critique.issues.length > 3 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      +{critique.critique.issues.length - 3} more issues
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Plan Goal */}
          <div>
            <h3 className="font-semibold mb-2">Goal</h3>
            <p className="text-sm text-muted-foreground">{plan.goal}</p>
          </div>

          {/* Plan Steps */}
          <div>
            <h3 className="font-semibold mb-3">
              Execution Steps ({plan.steps.length})
            </h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {plan.steps.map((step) => (
                <div
                  key={step.id}
                  className="p-4 border rounded-lg bg-muted/30 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Step {step.order}
                      </Badge>
                      <code className="text-xs bg-background px-2 py-1 rounded font-mono">
                        {step.action}
                      </code>
                    </div>
                  </div>
                  
                  <p className="text-sm">{step.description}</p>
                  
                  {step.parameters && Object.keys(step.parameters).length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Parameters:</p>
                      <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                        {JSON.stringify(step.parameters, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {step.dependencies && step.dependencies.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Depends on: Step {step.dependencies.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Execute Plan
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


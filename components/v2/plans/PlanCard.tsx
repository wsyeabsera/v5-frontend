'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useDeletePlan } from '@/lib/queries-v2'
import { ExecutePlanDialog } from './ExecutePlanDialog'
import { Eye, Trash2, Loader2, Calendar, Target, Copy, Check, Play } from 'lucide-react'

interface PlanCardProps {
  plan: {
    _id?: string
    id?: string
    goal?: string
    status?: 'pending' | 'in-progress' | 'completed' | 'failed'
    steps?: any[]
    thoughtId?: string
    agentConfigId?: string
    createdAt?: string
    updatedAt?: string
  }
  onView: (planId: string) => void
}

export function PlanCard({ plan, onView }: PlanCardProps) {
  const deleteMutation = useDeletePlan()
  const planId = plan._id || plan.id || ''
  const [copied, setCopied] = useState(false)
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false)

  const handleDelete = async () => {
    if (!planId) return
    try {
      await deleteMutation.mutateAsync(planId)
    } catch (error) {
      console.error('Failed to delete plan:', error)
    }
  }

  const handleCopyPlan = async () => {
    try {
      const text = JSON.stringify(plan, null, 2)
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy plan:', err)
    }
  }

  const stepCount = Array.isArray(plan.steps) ? plan.steps.length : 0

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
    <Card className="p-6 hover:border-primary/30 transition-all duration-200">
      <div className="space-y-4">
        {/* Goal */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-lg">Goal</h3>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {plan.goal || 'No goal provided'}
          </p>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status */}
          {plan.status && (
            <Badge variant={getStatusBadgeVariant(plan.status)}>
              {plan.status}
            </Badge>
          )}

          {/* Step Count */}
          <Badge variant="secondary">
            {stepCount} step{stepCount !== 1 ? 's' : ''}
          </Badge>

          {/* Thought ID */}
          {plan.thoughtId && (
            <Badge variant="outline" className="font-mono text-xs">
              Thought: {plan.thoughtId.substring(0, 8)}...
            </Badge>
          )}

          {/* Agent Config ID */}
          {plan.agentConfigId && (
            <Badge variant="outline" className="font-mono text-xs">
              Agent: {plan.agentConfigId.substring(0, 8)}...
            </Badge>
          )}
        </div>

        {/* Timestamps */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          {plan.createdAt && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Created: {new Date(plan.createdAt).toLocaleDateString()}</span>
            </div>
          )}
          {plan.updatedAt && plan.updatedAt !== plan.createdAt && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Updated: {new Date(plan.updatedAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => planId && onView(planId)}
              disabled={deleteMutation.isPending || !planId}
              className="flex-1"
            >
              <Eye className="w-4 h-4 mr-2" />
              View
            </Button>
            {planId && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setExecuteDialogOpen(true)}
                disabled={deleteMutation.isPending}
              >
                <Play className="w-4 h-4 mr-2" />
                Execute
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyPlan}
            disabled={deleteMutation.isPending}
            title="Copy plan JSON"
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteMutation.isPending || !planId}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Plan?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this plan? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Execute Plan Dialog */}
          {planId && (
            <ExecutePlanDialog
              open={executeDialogOpen}
              onOpenChange={setExecuteDialogOpen}
              planId={planId}
            />
          )}
        </div>
      </div>
    </Card>
  )
}


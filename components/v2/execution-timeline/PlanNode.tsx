'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Target, Calendar, ExternalLink, Copy, Check, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { ExecutePlanButton } from './ExecutePlanButton'

interface PlanNodeProps {
  plan: {
    _id?: string
    id?: string
    goal?: string
    status?: 'pending' | 'in-progress' | 'completed' | 'failed'
    steps?: any[]
    thoughtId?: string
    agentConfigId?: string
    createdAt?: string
  }
  onView?: (planId: string) => void
  onViewThought?: (thoughtId: string) => void
}

export function PlanNode({ plan, onView, onViewThought }: PlanNodeProps) {
  const [copied, setCopied] = useState(false)
  const planId = plan._id || plan.id || ''
  const stepCount = Array.isArray(plan.steps) ? plan.steps.length : 0

  const handleCopyId = async () => {
    if (!planId) return
    try {
      await navigator.clipboard.writeText(planId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy ID:', err)
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400" />
      case 'in-progress':
        return <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
      case 'failed':
        return <XCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
      default:
        return <Clock className="w-3 h-3 text-muted-foreground" />
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
    <Card className="p-4 border-l-4 border-l-green-500 hover:border-l-green-600 transition-all duration-200 hover:shadow-md">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950/30">
              <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Plan</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="font-mono text-xs">
                  {planId.substring(0, 8)}...
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={handleCopyId}
                  title="Copy ID"
                >
                  {copied ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Goal */}
        {plan.goal && (
          <div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {plan.goal}
            </p>
          </div>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {plan.status && (
            <Badge variant={getStatusBadgeVariant(plan.status)} className="gap-1 text-xs">
              {getStatusIcon(plan.status)}
              {plan.status}
            </Badge>
          )}
          {stepCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {stepCount} step{stepCount !== 1 ? 's' : ''}
            </Badge>
          )}
          {plan.thoughtId && (
            <Badge
              variant="outline"
              className="font-mono text-xs cursor-pointer hover:bg-muted"
              onClick={() => plan.thoughtId && onViewThought?.(plan.thoughtId)}
              title="Click to view thought"
            >
              Thought: {plan.thoughtId.substring(0, 8)}...
            </Badge>
          )}
          {plan.agentConfigId && (
            <Badge variant="outline" className="font-mono text-xs">
              Agent: {plan.agentConfigId.substring(0, 8)}...
            </Badge>
          )}
          {plan.createdAt && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{new Date(plan.createdAt).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t flex-wrap">
          {onView && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => planId && onView(planId)}
              className="flex-1 min-w-[120px]"
            >
              View Details
            </Button>
          )}
          {planId && plan.status !== 'completed' && (
            <ExecutePlanButton planId={planId} />
          )}
          <Link href={`/v2/plans`} target="_blank">
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="w-3 h-3" />
              Open
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}


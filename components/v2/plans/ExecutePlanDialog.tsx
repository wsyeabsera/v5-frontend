'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AgentConfigSelector } from '@/components/v2/ai-execution/AgentConfigSelector'
import { useExecuteTask } from '@/lib/queries-v2'
import { Loader2, Play } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

interface ExecutePlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planId: string
  onSuccess?: (taskId: string) => void
}

export function ExecutePlanDialog({
  open,
  onOpenChange,
  planId,
  onSuccess,
}: ExecutePlanDialogProps) {
  const queryClient = useQueryClient()
  const [agentConfigId, setAgentConfigId] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const executeMutation = useExecuteTask()
  const isLoading = executeMutation.isPending

  useEffect(() => {
    if (open) {
      setAgentConfigId('')
      setErrors({})
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!agentConfigId) {
      setErrors({ agentConfigId: 'Agent configuration is required' })
      return
    }

    try {
      const result = await executeMutation.mutateAsync({
        planId,
        agentConfigId,
      })
      onSuccess?.(result._id || result.id || '')
      queryClient.invalidateQueries({ queryKey: ['v2', 'tasks'] })
      onOpenChange(false)
    } catch (error: any) {
      console.error('Failed to execute plan:', error)
      setErrors({
        submit: error.message || 'Failed to execute plan',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Execute Plan
          </DialogTitle>
          <DialogDescription>
            Execute this plan by creating and running a new task. Select an agent configuration to use for execution.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Plan ID Display */}
          <div className="p-3 rounded-lg bg-muted/30 border">
            <p className="text-sm text-muted-foreground mb-1">Plan ID</p>
            <p className="font-mono text-sm">{planId}</p>
          </div>

          {/* Agent Config */}
          <div>
            <AgentConfigSelector value={agentConfigId} onValueChange={setAgentConfigId} />
            {errors.agentConfigId && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.agentConfigId}</p>
            )}
          </div>

          {errors.submit && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
              <p className="text-sm text-red-700 dark:text-red-300">{errors.submit}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Execute Plan
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


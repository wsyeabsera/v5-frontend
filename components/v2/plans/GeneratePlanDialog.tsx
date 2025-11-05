'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AgentConfigSelector } from '@/components/v2/ai-execution/AgentConfigSelector'
import { useGeneratePlan } from '@/lib/queries-v2'
import { Loader2, Plus } from 'lucide-react'

interface GeneratePlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function GeneratePlanDialog({
  open,
  onOpenChange,
  onSuccess,
}: GeneratePlanDialogProps) {
  const [thoughtId, setThoughtId] = useState('')
  const [thoughtJson, setThoughtJson] = useState('')
  const [useThoughtObject, setUseThoughtObject] = useState(false)
  const [agentConfigId, setAgentConfigId] = useState('')
  const [enableToolSearch, setEnableToolSearch] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const generateMutation = useGeneratePlan()
  const isLoading = generateMutation.isPending

  useEffect(() => {
    if (open) {
      setThoughtId('')
      setThoughtJson('')
      setUseThoughtObject(false)
      setAgentConfigId('')
      setEnableToolSearch(true)
      setErrors({})
    }
  }, [open])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!useThoughtObject && !thoughtId.trim()) {
      newErrors.thoughtId = 'Thought ID is required when not using thought object'
    }

    if (useThoughtObject && !thoughtJson.trim()) {
      newErrors.thoughtJson = 'Thought object JSON is required'
    }

    if (useThoughtObject && thoughtJson.trim()) {
      try {
        JSON.parse(thoughtJson)
      } catch {
        newErrors.thoughtJson = 'Invalid JSON format'
      }
    }

    if (!agentConfigId) {
      newErrors.agentConfigId = 'Agent configuration is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    try {
      const data: any = {
        agentConfigId,
        enableToolSearch,
      }

      if (useThoughtObject) {
        data.thought = JSON.parse(thoughtJson)
      } else {
        data.thoughtId = thoughtId.trim()
      }

      await generateMutation.mutateAsync(data)
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Failed to generate plan:', error)
      setErrors({
        submit: error.message || 'Failed to generate plan',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Generate Plan
          </DialogTitle>
          <DialogDescription>
            Generate a new plan from a thought using the Planner Agent. Provide a thought ID or thought object and select an agent configuration.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Thought Source Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="useThoughtObject"
              checked={useThoughtObject}
              onChange={(e) => setUseThoughtObject(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label htmlFor="useThoughtObject" className="cursor-pointer">
              Use thought object (instead of thought ID)
            </Label>
          </div>

          {/* Thought ID or Thought Object */}
          {!useThoughtObject ? (
            <div className="space-y-2">
              <Label htmlFor="thoughtId">Thought ID *</Label>
              <Input
                id="thoughtId"
                placeholder="Enter the thought ID..."
                value={thoughtId}
                onChange={(e) => setThoughtId(e.target.value)}
                disabled={isLoading}
              />
              {errors.thoughtId && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.thoughtId}</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="thoughtJson">Thought Object (JSON) *</Label>
              <Textarea
                id="thoughtJson"
                placeholder='{"id": "thought_123", "reasoning": "...", ...}'
                value={thoughtJson}
                onChange={(e) => setThoughtJson(e.target.value)}
                rows={8}
                className="resize-none font-mono text-sm"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                JSON object representing the thought. Must match the thought structure.
              </p>
              {errors.thoughtJson && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.thoughtJson}</p>
              )}
            </div>
          )}

          {/* Agent Config */}
          <div>
            <AgentConfigSelector value={agentConfigId} onValueChange={setAgentConfigId} />
            {errors.agentConfigId && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.agentConfigId}</p>
            )}
          </div>

          {/* Enable Tool Search */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enableToolSearch"
              checked={enableToolSearch}
              onChange={(e) => setEnableToolSearch(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
            />
            <Label htmlFor="enableToolSearch" className="cursor-pointer">
              Enable tool search (default: true)
            </Label>
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
                  Generating...
                </>
              ) : (
                'Generate Plan'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


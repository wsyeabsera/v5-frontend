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
import { useGenerateThoughts } from '@/lib/queries-v2'
import { Loader2, Plus } from 'lucide-react'

interface GenerateThoughtDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function GenerateThoughtDialog({
  open,
  onOpenChange,
  onSuccess,
}: GenerateThoughtDialogProps) {
  const [userQuery, setUserQuery] = useState('')
  const [agentConfigId, setAgentConfigId] = useState('')
  const [conversationHistory, setConversationHistory] = useState('')
  const [availableTools, setAvailableTools] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const generateMutation = useGenerateThoughts()
  const isLoading = generateMutation.isPending

  useEffect(() => {
    if (open) {
      setUserQuery('')
      setAgentConfigId('')
      setConversationHistory('')
      setAvailableTools('')
      setErrors({})
    }
  }, [open])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!userQuery.trim()) {
      newErrors.userQuery = 'User query is required'
    }

    if (!agentConfigId) {
      newErrors.agentConfigId = 'Agent configuration is required'
    }

    // Validate JSON if provided
    if (conversationHistory.trim()) {
      try {
        JSON.parse(conversationHistory)
      } catch {
        newErrors.conversationHistory = 'Invalid JSON format'
      }
    }

    if (availableTools.trim()) {
      try {
        const parsed = JSON.parse(availableTools)
        if (!Array.isArray(parsed)) {
          newErrors.availableTools = 'Available tools must be a JSON array'
        }
      } catch {
        newErrors.availableTools = 'Invalid JSON format'
      }
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
        userQuery: userQuery.trim(),
        agentConfigId,
      }

      if (conversationHistory.trim()) {
        data.conversationHistory = JSON.parse(conversationHistory)
      }

      if (availableTools.trim()) {
        data.availableTools = JSON.parse(availableTools)
      }

      await generateMutation.mutateAsync(data)
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Failed to generate thought:', error)
      setErrors({
        submit: error.message || 'Failed to generate thought',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Generate Thought
          </DialogTitle>
          <DialogDescription>
            Generate a new thought using the Thought Agent. Provide a user query and select an agent configuration.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Query */}
          <div className="space-y-2">
            <Label htmlFor="userQuery">User Query *</Label>
            <Textarea
              id="userQuery"
              placeholder="Enter the user's query or prompt..."
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              rows={4}
              className="resize-none"
              disabled={isLoading}
            />
            {errors.userQuery && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.userQuery}</p>
            )}
          </div>

          {/* Agent Config */}
          <div>
            <AgentConfigSelector value={agentConfigId} onValueChange={setAgentConfigId} />
            {errors.agentConfigId && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.agentConfigId}</p>
            )}
          </div>

          {/* Conversation History (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="conversationHistory">Conversation History (Optional)</Label>
            <Textarea
              id="conversationHistory"
              placeholder='[{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]'
              value={conversationHistory}
              onChange={(e) => setConversationHistory(e.target.value)}
              rows={6}
              className="resize-none font-mono text-sm"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              JSON array of conversation messages. Leave empty if not needed.
            </p>
            {errors.conversationHistory && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.conversationHistory}
              </p>
            )}
          </div>

          {/* Available Tools (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="availableTools">Available Tools (Optional)</Label>
            <Textarea
              id="availableTools"
              placeholder='["tool1", "tool2", "tool3"]'
              value={availableTools}
              onChange={(e) => setAvailableTools(e.target.value)}
              rows={3}
              className="resize-none font-mono text-sm"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              JSON array of tool names. Leave empty if not needed.
            </p>
            {errors.availableTools && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.availableTools}</p>
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
                  Generating...
                </>
              ) : (
                'Generate Thought'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


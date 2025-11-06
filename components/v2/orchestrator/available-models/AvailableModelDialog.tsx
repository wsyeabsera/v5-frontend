'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useCreateOrchestratorAvailableModel,
  useUpdateOrchestratorAvailableModel,
} from '@/lib/queries-v2'
import { Loader2 } from 'lucide-react'

interface AvailableModelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  model?: any
}

export function AvailableModelDialog({ open, onOpenChange, model }: AvailableModelDialogProps) {
  const [provider, setProvider] = useState('')
  const [modelName, setModelName] = useState('')
  const [modelId, setModelId] = useState('')

  const createMutation = useCreateOrchestratorAvailableModel()
  const updateMutation = useUpdateOrchestratorAvailableModel()

  const isEditing = !!model
  const isLoading = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (model) {
      setProvider(model.provider || '')
      setModelName(model.modelName || '')
      setModelId(model.modelId || '')
    } else {
      setProvider('')
      setModelName('')
      setModelId('')
    }
  }, [model, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!provider.trim() || !modelName.trim()) {
      return
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: model._id,
          updates: {
            provider,
            modelName,
            modelId: modelId.trim() || undefined,
          },
        })
      } else {
        await createMutation.mutateAsync({
          provider,
          modelName,
          modelId: modelId.trim() || undefined,
        })
      }
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save model:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Model' : 'Create New Model'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the model configuration below.'
              : 'Add a new available model to the system.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider *</Label>
              <Input
                id="provider"
                placeholder="e.g., anthropic, openai"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelName">Model Name *</Label>
              <Input
                id="modelName"
                placeholder="e.g., claude-3-5-sonnet"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelId">Model ID (Optional)</Label>
              <Input
                id="modelId"
                placeholder="e.g., claude-3-5-sonnet-20241022"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Optional model ID for API calls. If not provided, model name will be used.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !provider.trim() || !modelName.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditing ? 'Update' : 'Create'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


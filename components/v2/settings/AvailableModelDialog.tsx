'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCreateAvailableModel, useUpdateAvailableModel } from '@/lib/queries-v2'
import { Loader2, Plus, Pencil } from 'lucide-react'

interface AvailableModelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  model?: { _id: string; provider: string; modelName: string; modelId?: string }
}

export function AvailableModelDialog({
  open,
  onOpenChange,
  onSuccess,
  model,
}: AvailableModelDialogProps) {
  const [provider, setProvider] = useState('')
  const [modelName, setModelName] = useState('')
  const [modelId, setModelId] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const createMutation = useCreateAvailableModel()
  const updateMutation = useUpdateAvailableModel()
  const isEditing = !!model
  const isLoading = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (open) {
      if (model) {
        setProvider(model.provider)
        setModelName(model.modelName)
        setModelId(model.modelId || '')
      } else {
        setProvider('')
        setModelName('')
        setModelId('')
      }
      setErrors({})
    }
  }, [open, model])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!provider.trim()) {
      newErrors.provider = 'Provider is required'
    }

    if (!modelName.trim()) {
      newErrors.modelName = 'Model name is required'
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
      if (isEditing && model) {
        await updateMutation.mutateAsync({
          id: model._id,
          updates: { 
            provider: provider.trim(), 
            modelName: modelName.trim(),
            ...(modelId.trim() && { modelId: modelId.trim() }),
          },
        })
      } else {
        await createMutation.mutateAsync({
          provider: provider.trim(),
          modelName: modelName.trim(),
          ...(modelId.trim() && { modelId: modelId.trim() }),
        })
      }
      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error('Failed to save model:', error)
      setErrors({ submit: error.message || 'Failed to save model' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Pencil className="w-5 h-5" />
                Edit Available Model
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Create Available Model
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the model provider, name, and ID.'
              : 'Add a new AI model to the available models list.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">
              Provider <span className="text-destructive">*</span>
            </Label>
            <Input
              id="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="e.g., openai, anthropic, google"
              className={errors.provider ? 'border-destructive' : ''}
              disabled={isLoading}
            />
            {errors.provider && (
              <p className="text-sm text-destructive">{errors.provider}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="modelName">
              Model Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="modelName"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="e.g., gpt-4, claude-3-opus, gemini-pro"
              className={errors.modelName ? 'border-destructive' : ''}
              disabled={isLoading}
            />
            {errors.modelName && (
              <p className="text-sm text-destructive">{errors.modelName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="modelId">
              Model ID {isEditing && <span className="text-xs text-muted-foreground">(read-only)</span>}
            </Label>
            <Input
              id="modelId"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              placeholder="e.g., gpt-4, claude-3-opus"
              disabled={isLoading || isEditing}
              className={isEditing ? 'bg-muted font-mono text-sm' : ''}
            />
            <p className="text-xs text-muted-foreground">
              {isEditing 
                ? 'This is the unique identifier for this model (read-only)'
                : 'Optional: Unique identifier for this model'}
            </p>
          </div>

          {errors.submit && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {errors.submit}
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
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditing ? 'Update Model' : 'Create Model'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

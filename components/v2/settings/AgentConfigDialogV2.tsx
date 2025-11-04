'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCreateAgentConfigV2, useUpdateAgentConfigV2, useAvailableModels } from '@/lib/queries-v2'
import { Loader2, Plus, Pencil } from 'lucide-react'

interface AgentConfigDialogV2Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  config?: {
    _id: string
    availableModelId: string
    apiKey: string
    maxTokenCount: number
    isEnabled: boolean
  }
}

export function AgentConfigDialogV2({
  open,
  onOpenChange,
  onSuccess,
  config,
}: AgentConfigDialogV2Props) {
  const [availableModelId, setAvailableModelId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [maxTokenCount, setMaxTokenCount] = useState(4096)
  const [isEnabled, setIsEnabled] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: models } = useAvailableModels()
  const createMutation = useCreateAgentConfigV2()
  const updateMutation = useUpdateAgentConfigV2()
  const isEditing = !!config
  const isLoading = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (open) {
      if (config) {
        setAvailableModelId(config.availableModelId)
        setApiKey(config.apiKey)
        setMaxTokenCount(config.maxTokenCount)
        setIsEnabled(config.isEnabled)
      } else {
        setAvailableModelId('')
        setApiKey('')
        setMaxTokenCount(4096)
        setIsEnabled(true)
      }
      setErrors({})
    }
  }, [open, config])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!availableModelId) {
      newErrors.availableModelId = 'Please select an available model'
    }

    if (!apiKey.trim()) {
      newErrors.apiKey = 'API key is required'
    }

    if (maxTokenCount < 100 || maxTokenCount > 100000) {
      newErrors.maxTokenCount = 'Max token count must be between 100 and 100000'
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
      if (isEditing && config) {
        await updateMutation.mutateAsync({
          id: config._id,
          updates: {
            availableModelId: availableModelId.trim(),
            apiKey: apiKey.trim(),
            maxTokenCount,
            isEnabled,
          },
        })
      } else {
        await createMutation.mutateAsync({
          availableModelId: availableModelId.trim(),
          apiKey: apiKey.trim(),
          maxTokenCount,
          isEnabled,
        })
      }
      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error('Failed to save agent config:', error)
      setErrors({ submit: error.message || 'Failed to save agent configuration' })
    }
  }

  const availableModels = models || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Pencil className="w-5 h-5" />
                Edit Agent Configuration
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Create Agent Configuration
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the agent configuration settings.'
              : 'Create a new agent configuration with model selection and API credentials.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="availableModelId">
              Available Model <span className="text-destructive">*</span>
            </Label>
            <Select
              value={availableModelId}
              onValueChange={setAvailableModelId}
              disabled={isLoading}
            >
              <SelectTrigger className={errors.availableModelId ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select an available model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No available models found. Create one first.
                  </div>
                ) : (
                  availableModels.map((model: any) => (
                    <SelectItem key={model._id} value={model._id}>
                      {model.provider} - {model.modelName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.availableModelId && (
              <p className="text-sm text-destructive">{errors.availableModelId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">
              API Key <span className="text-destructive">*</span>
            </Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter API key..."
              className={errors.apiKey ? 'border-destructive' : ''}
              disabled={isLoading}
            />
            {errors.apiKey && (
              <p className="text-sm text-destructive">{errors.apiKey}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxTokenCount">
              Max Token Count <span className="text-destructive">*</span>
            </Label>
            <Input
              id="maxTokenCount"
              type="number"
              value={maxTokenCount}
              onChange={(e) => setMaxTokenCount(parseInt(e.target.value) || 4096)}
              min={100}
              max={100000}
              className={errors.maxTokenCount ? 'border-destructive' : ''}
              disabled={isLoading}
            />
            {errors.maxTokenCount && (
              <p className="text-sm text-destructive">{errors.maxTokenCount}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Maximum number of tokens for this configuration (100 - 100,000)
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/40">
            <div>
              <Label>Enabled</Label>
              <p className="text-xs text-muted-foreground">
                Whether this configuration is currently active
              </p>
            </div>
            <Button
              type="button"
              variant={isEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsEnabled(!isEnabled)}
              disabled={isLoading}
            >
              {isEnabled ? 'Enabled' : 'Disabled'}
            </Button>
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
            <Button type="submit" disabled={isLoading || availableModels.length === 0}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditing ? 'Update Config' : 'Create Config'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

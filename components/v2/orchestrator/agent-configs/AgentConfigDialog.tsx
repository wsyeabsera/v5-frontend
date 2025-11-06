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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  useCreateOrchestratorAgentConfig,
  useUpdateOrchestratorAgentConfig,
  useOrchestratorAvailableModels,
} from '@/lib/queries-v2'
import { Loader2 } from 'lucide-react'

interface AgentConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config?: any
}

export function AgentConfigDialog({ open, onOpenChange, config }: AgentConfigDialogProps) {
  const [availableModelId, setAvailableModelId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [maxTokenCount, setMaxTokenCount] = useState('8192')
  const [isEnabled, setIsEnabled] = useState(true)

  const { data: models } = useOrchestratorAvailableModels()
  const createMutation = useCreateOrchestratorAgentConfig()
  const updateMutation = useUpdateOrchestratorAgentConfig()

  const isEditing = !!config
  const isLoading = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (config) {
      setAvailableModelId(config.availableModelId || '')
      setApiKey(config.apiKey || '')
      setMaxTokenCount(config.maxTokenCount?.toString() || '8192')
      setIsEnabled(config.isEnabled !== false)
    } else {
      setAvailableModelId('')
      setApiKey('')
      setMaxTokenCount('8192')
      setIsEnabled(true)
    }
  }, [config, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!availableModelId.trim() || !apiKey.trim() || !maxTokenCount.trim()) {
      return
    }

    const tokenCount = parseInt(maxTokenCount, 10)
    if (isNaN(tokenCount) || tokenCount <= 0) {
      return
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: config._id,
          updates: {
            availableModelId,
            apiKey,
            maxTokenCount: tokenCount,
            isEnabled,
          },
        })
      } else {
        await createMutation.mutateAsync({
          availableModelId,
          apiKey,
          maxTokenCount: tokenCount,
          isEnabled,
        })
      }
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save agent config:', error)
    }
  }

  const availableModels = (models as any[]) || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Agent Config' : 'Create New Agent Config'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the agent configuration below.'
              : 'Configure an agent with a model and API key.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="availableModel">Available Model *</Label>
              <Select value={availableModelId} onValueChange={setAvailableModelId} disabled={isEditing}>
                <SelectTrigger id="availableModel">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model: any) => (
                    <SelectItem key={model._id} value={model._id}>
                      {model.provider} - {model.modelName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isEditing && (
                <p className="text-xs text-muted-foreground">
                  Model cannot be changed after creation. Create a new config to use a different model.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key *</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxTokenCount">Max Token Count *</Label>
              <Input
                id="maxTokenCount"
                type="number"
                placeholder="8192"
                value={maxTokenCount}
                onChange={(e) => setMaxTokenCount(e.target.value)}
                required
                disabled={isLoading}
                min="1"
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of tokens for API calls.
              </p>
            </div>

            <div className="flex items-center justify-between space-x-2 py-2">
              <div className="space-y-0.5">
                <Label htmlFor="isEnabled">Enabled</Label>
                <p className="text-xs text-muted-foreground">
                  Enable or disable this agent configuration
                </p>
              </div>
              <Switch
                id="isEnabled"
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
                disabled={isLoading}
              />
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
            <Button
              type="submit"
              disabled={
                isLoading ||
                !availableModelId.trim() ||
                !apiKey.trim() ||
                !maxTokenCount.trim() ||
                parseInt(maxTokenCount, 10) <= 0
              }
            >
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


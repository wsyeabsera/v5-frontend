'use client'

import { useState, useEffect } from 'react'
import { AgentConfig } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useStore } from '@/lib/store'
import { useModels, useCreateAgentConfig } from '@/lib/queries'
import { Check, Loader2, AlertCircle, Plus } from 'lucide-react'

interface AgentConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AgentConfigDialog({ open, onOpenChange, onSuccess }: AgentConfigDialogProps) {
  const [formData, setFormData] = useState<Partial<AgentConfig>>({
    agentId: '',
    name: '',
    description: '',
    modelId: '',
    parameters: {
      temperature: 0.3,
      maxTokens: 500,
      topP: 0.9,
    },
    enabled: true,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const { modelTestResults } = useStore()
  const { data: modelsData } = useModels()
  const createMutation = useCreateAgentConfig()

  const models = modelsData?.models || []
  // Only show models that have been tested and passed
  const workingModels = models.filter((model: any) => {
    const testResult = modelTestResults[model.id]
    return testResult?.status === 'success'
  })

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        agentId: '',
        name: '',
        description: '',
        modelId: '',
        parameters: {
          temperature: 0.3,
          maxTokens: 500,
          topP: 0.9,
        },
        enabled: true,
      })
      setErrors({})
    }
  }, [open])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.agentId?.trim()) {
      newErrors.agentId = 'Agent ID is required'
    } else if (!/^[a-z0-9-]+$/.test(formData.agentId)) {
      newErrors.agentId = 'Agent ID must be lowercase letters, numbers, and hyphens only'
    }

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required'
    }

    if (!formData.modelId) {
      newErrors.modelId = 'Please select a tested model'
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
      await createMutation.mutateAsync(formData as AgentConfig)
      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error('Failed to create agent config:', error)
      setErrors({ submit: error.message || 'Failed to create agent configuration' })
    }
  }

  const handleParameterChange = (key: string, value: number) => {
    setFormData({
      ...formData,
      parameters: { ...formData.parameters, [key]: value }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create New Agent Configuration
          </DialogTitle>
          <DialogDescription>
            Create a new agent configuration with AI model selection and custom parameters.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Agent ID */}
          <div className="space-y-2">
            <Label htmlFor="agentId">
              Agent ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="agentId"
              value={formData.agentId || ''}
              onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
              placeholder="e.g., custom-analyzer"
              className={errors.agentId ? 'border-destructive' : ''}
            />
            {errors.agentId && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.agentId}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Unique identifier (lowercase, numbers, and hyphens only). Used in API calls.
            </p>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Custom Analyzer"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this agent does..."
              rows={3}
              className={errors.description ? 'border-destructive' : ''}
            />
            {errors.description && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.description}
              </p>
            )}
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="modelId">
              AI Model <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.modelId || ''}
              onValueChange={(value) => setFormData({ ...formData, modelId: value })}
            >
              <SelectTrigger className={errors.modelId ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select a tested model">
                  {formData.modelId && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {models.find((m: any) => m.id === formData.modelId)?.name || formData.modelId}
                      </span>
                      {modelTestResults[formData.modelId]?.status === 'success' && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900">
                          <Check className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {workingModels.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    <AlertCircle className="w-4 h-4 mx-auto mb-2" />
                    No tested models available. Test models in the Testing tab first.
                  </div>
                ) : (
                  workingModels.map((model: any) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{model.name}</span>
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900 ml-auto">
                          <Check className="w-3 h-3 mr-1" />
                          Tested
                        </Badge>
                        <span className="text-xs text-muted-foreground">({model.provider})</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.modelId && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.modelId}
              </p>
            )}
          </div>

          {/* Parameters */}
          <div className="space-y-4 pt-4 border-t border-border/40">
            <h4 className="text-sm font-semibold">Model Parameters</h4>

            {/* Temperature */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Temperature</Label>
                <span className="text-sm font-mono">{(formData.parameters?.temperature || 0.3).toFixed(2)}</span>
              </div>
              <Slider
                value={[formData.parameters?.temperature || 0.3]}
                onValueChange={([value]) => handleParameterChange('temperature', value)}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Controls randomness. Lower = more focused, Higher = more creative
              </p>
            </div>

            {/* Max Tokens */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Max Tokens</Label>
                <Input
                  type="number"
                  value={formData.parameters?.maxTokens || 500}
                  onChange={(e) => handleParameterChange('maxTokens', parseInt(e.target.value) || 500)}
                  className="w-24 h-8 text-sm text-right"
                  min={100}
                  max={4096}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Maximum length of the response
              </p>
            </div>

            {/* Top P */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Top P</Label>
                <span className="text-sm font-mono">{(formData.parameters?.topP || 0.9).toFixed(2)}</span>
              </div>
              <Slider
                value={[formData.parameters?.topP || 0.9]}
                onValueChange={([value]) => handleParameterChange('topP', value)}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Nucleus sampling parameter. Controls diversity of output
              </p>
            </div>
          </div>

          {/* Enabled Toggle */}
          <div className="flex items-center justify-between pt-4 border-t border-border/40">
            <div>
              <Label>Enabled</Label>
              <p className="text-xs text-muted-foreground">
                Whether this agent is active
              </p>
            </div>
            <Button
              type="button"
              variant={formData.enabled ? "default" : "outline"}
              size="sm"
              onClick={() => setFormData({ ...formData, enabled: !formData.enabled })}
            >
              {formData.enabled ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.submit}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || workingModels.length === 0}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Agent
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


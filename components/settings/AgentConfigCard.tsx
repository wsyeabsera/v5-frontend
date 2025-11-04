'use client'

import { useState } from 'react'
import { AgentConfig } from '@/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
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
import { useStore } from '@/lib/store'
import { useModels } from '@/lib/queries'
import { getProviderForModel } from '@/lib/ai-config'
import { Check, Loader2, AlertCircle, Trash2, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface AgentConfigCardProps {
  config: AgentConfig
  onSave: (config: AgentConfig) => void
  onDelete?: (agentId: string) => void
  isSaving?: boolean
  isDeleting?: boolean
  isExpanded?: boolean
  onToggle?: () => void
}

export function AgentConfigCard({ config, onSave, onDelete, isSaving, isDeleting, isExpanded: controlledExpanded, onToggle }: AgentConfigCardProps) {
  const [localConfig, setLocalConfig] = useState<AgentConfig>(config)
  const [hasChanges, setHasChanges] = useState(false)
  const [internalExpanded, setInternalExpanded] = useState(false)
  const { modelTestResults, apiKeys } = useStore()
  const { data: modelsData } = useModels()

  // Use controlled state if provided, otherwise use internal state
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded
  const handleToggle = (open: boolean) => {
    if (onToggle) {
      // If controlled, call the toggle handler
      // The handler should toggle the state, so we call it regardless of the open value
      // since Collapsible already handles the state change
      onToggle()
    } else {
      // If uncontrolled, manage internal state directly
      setInternalExpanded(open)
    }
  }

  const models = modelsData?.models || []
  // Only show models that have been tested and passed
  const workingModels = models.filter((model: any) => {
    const testResult = modelTestResults[model.id]
    return testResult?.status === 'success'
  })
  
  // Validate that selected model is tested
  const isSelectedModelTested = localConfig.modelId 
    ? modelTestResults[localConfig.modelId]?.status === 'success'
    : false

  const handleModelChange = (modelId: string) => {
    // Auto-populate API key from store when model changes
    const provider = getProviderForModel(modelId)
    const apiKey = apiKeys[provider]
    
    setLocalConfig({ ...localConfig, modelId, apiKey })
    setHasChanges(true)
  }

  const handleApiKeyChange = (apiKey: string) => {
    setLocalConfig({ ...localConfig, apiKey })
    setHasChanges(true)
  }

  const handleParameterChange = (key: string, value: number | boolean) => {
    setLocalConfig({
      ...localConfig,
      parameters: { ...localConfig.parameters, [key]: value }
    })
    setHasChanges(true)
  }

  const handleEnabledToggle = () => {
    setLocalConfig({ ...localConfig, enabled: !localConfig.enabled })
    setHasChanges(true)
  }

  const handleSave = () => {
    // Validate model is tested before saving
    if (localConfig.modelId && !isSelectedModelTested) {
      return
    }
    onSave(localConfig)
    setHasChanges(false)
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete(config.agentId)
    }
  }

  const getModelInfo = (modelId: string) => {
    return models.find((m: any) => m.id === modelId)
  }

  const selectedModelInfo = localConfig.modelId ? getModelInfo(localConfig.modelId) : null

  return (
    <Collapsible open={isExpanded} onOpenChange={handleToggle}>
      <Card className="border-border/50 hover:border-primary/30 transition-all duration-200">
        <CollapsibleTrigger asChild>
          <div className="w-full p-6 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{localConfig.name}</h3>
                  <Badge 
                    variant="outline" 
                    className={localConfig.enabled 
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900' 
                      : 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-900'
                    }
                  >
                    {localConfig.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                {!isExpanded && (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {selectedModelInfo && (
                      <span className="flex items-center gap-1">
                        Model: <span className="font-medium text-foreground">{selectedModelInfo.name}</span>
                      </span>
                    )}
                    {hasChanges && (
                      <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Unsaved changes
                      </span>
                    )}
                  </div>
                )}
                {isExpanded && (
                  <p className="text-sm text-muted-foreground">{localConfig.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4">
                {isExpanded && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEnabledToggle()
                    }}
                  >
                    {localConfig.enabled ? 'Disable' : 'Enable'}
                  </Button>
                )}
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-6 pb-6 space-y-6">

            {/* Model Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">AI Model</label>
                {localConfig.modelId && !isSelectedModelTested && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900">
                    <XCircle className="w-3 h-3 mr-1" />
                    Not Tested
                  </Badge>
                )}
              </div>
              <Select value={localConfig.modelId} onValueChange={handleModelChange}>
                <SelectTrigger className={`h-12 ${localConfig.modelId && !isSelectedModelTested ? 'border-amber-300 dark:border-amber-700' : ''}`}>
                  <SelectValue placeholder="Select a tested model">
                    {selectedModelInfo && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{selectedModelInfo.name}</span>
                        {isSelectedModelTested && (
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
              {localConfig.modelId && !isSelectedModelTested && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  This model hasn't been tested. Please test it in the Testing tab before using it.
                </p>
              )}
            </div>

            {/* API Key */}
            {localConfig.modelId && (
              <div className="space-y-3 pt-4 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">API Key</label>
                  {localConfig.apiKey && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900">
                      <Check className="w-3 h-3 mr-1" />
                      Set
                    </Badge>
                  )}
                </div>
                <Input
                  type="password"
                  value={localConfig.apiKey || ''}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder="API key will be auto-filled from your saved keys..."
                  className="h-10 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  API key for this model's provider. Auto-filled from your saved keys when you select a model.
                </p>
              </div>
            )}

            {/* Parameters */}
            <div className="space-y-6 pt-4 border-t border-border/40">
              <h4 className="text-sm font-semibold">Model Parameters</h4>

              {/* Temperature */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted-foreground">Temperature</label>
                  <span className="text-sm font-mono">{localConfig.parameters.temperature?.toFixed(2) || '0.30'}</span>
                </div>
                <Slider
                  value={[localConfig.parameters.temperature || 0.3]}
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
                  <label className="text-sm text-muted-foreground">Max Tokens</label>
                  <Input
                    type="number"
                    value={localConfig.parameters.maxTokens || 500}
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
                  <label className="text-sm text-muted-foreground">Top P</label>
                  <span className="text-sm font-mono">{localConfig.parameters.topP?.toFixed(2) || '0.90'}</span>
                </div>
                <Slider
                  value={[localConfig.parameters.topP || 0.9]}
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

              {/* Force Compression */}
              <div className="space-y-3 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium">Force Compression</label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Always compress prompts to reduce token usage, even if under limit. Useful for models with strict limits.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localConfig.parameters.forceCompression || false}
                      onChange={(e) => handleParameterChange('forceCompression', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Save and Delete Buttons */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-border/40">
              <div className="flex items-center gap-2">
                {onDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isDeleting}
                        className="min-w-[100px]"
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Agent Configuration?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete the configuration for <strong>{config.name}</strong>? 
                          This action cannot be undone. The agent will need to be reconfigured.
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
                )}
              </div>
              <div className="flex items-center gap-3">
                {hasChanges && (
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    Unsaved changes
                  </span>
                )}
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges || !localConfig.modelId || !isSelectedModelTested}
                  className="min-w-[120px]"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Save Config
                    </>
                  )}
                </Button>
              </div>
            </div>
    </div>
    </CollapsibleContent>
    </Card>
    </Collapsible>
  )
}


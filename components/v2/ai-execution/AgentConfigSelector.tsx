'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useAgentConfigsV2, useAvailableModel } from '@/lib/queries-v2'
import { Loader2, AlertCircle } from 'lucide-react'

interface AgentConfigSelectorProps {
  value: string
  onValueChange: (value: string) => void
}

export function AgentConfigSelector({ value, onValueChange }: AgentConfigSelectorProps) {
  const { data: configs, isLoading, error } = useAgentConfigsV2(true) // Only enabled configs

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Agent Configuration</Label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading configurations...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-2">
        <Label>Agent Configuration</Label>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-700 dark:text-red-300">
            Failed to load configurations
          </span>
        </div>
      </div>
    )
  }

  const enabledConfigs = (configs || []).filter((c: any) => c.isEnabled)

  return (
    <div className="space-y-2">
      <Label htmlFor="agent-config">Agent Configuration *</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id="agent-config">
          <SelectValue placeholder="Select an agent configuration" />
        </SelectTrigger>
        <SelectContent>
          {enabledConfigs.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No enabled agent configurations available. Create one in Settings.
            </div>
          ) : (
            enabledConfigs.map((config: any) => (
              <AgentConfigOption key={config._id} config={config} />
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  )
}

function AgentConfigOption({ config }: { config: any }) {
  const { data: model, isLoading } = useAvailableModel(config.availableModelId)

  const displayName = model
    ? `${model.provider} - ${model.modelName}`
    : isLoading
    ? 'Loading...'
    : 'Unknown Model'

  return (
    <SelectItem value={config._id}>
      <div className="flex flex-col">
        <span className="font-medium">{displayName}</span>
        <span className="text-xs text-muted-foreground">
          Max tokens: {config.maxTokenCount.toLocaleString()}
        </span>
      </div>
    </SelectItem>
  )
}

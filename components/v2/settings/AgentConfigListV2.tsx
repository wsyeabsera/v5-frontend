'use client'

import { useState } from 'react'
import { useAgentConfigsV2 } from '@/lib/queries-v2'
import { AgentConfigCardV2 } from './AgentConfigCardV2'
import { AgentConfigDialogV2 } from './AgentConfigDialogV2'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, Plus } from 'lucide-react'

export function AgentConfigListV2() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<{
    _id: string
    availableModelId: string
    apiKey: string
    maxTokenCount: number
    isEnabled: boolean
  } | null>(null)
  const { data: configs, isLoading, error } = useAgentConfigsV2()

  const handleCreate = () => {
    setEditingConfig(null)
    setDialogOpen(true)
  }

  const handleEdit = (config: {
    _id: string
    availableModelId: string
    apiKey: string
    maxTokenCount: number
    isEnabled: boolean
  }) => {
    setEditingConfig(config)
    setDialogOpen(true)
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingConfig(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Loading agent configurations...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
        <div>
          <div className="font-semibold text-red-900 dark:text-red-100">Failed to load configurations</div>
          <div className="text-sm text-red-700 dark:text-red-300 mt-1">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Agent Configuration
        </Button>
      </div>

      {(!configs || configs.length === 0) ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-lg bg-muted/30 border border-dashed border-border">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-muted-foreground" />
            <div className="text-center">
              <div className="font-semibold text-lg mb-1">No agent configurations found</div>
              <div className="text-sm text-muted-foreground">
                Create your first agent configuration to get started
              </div>
            </div>
          </div>
          <Button onClick={handleCreate} size="lg" className="mt-4 gap-2">
            <Plus className="w-5 h-5" />
            Create Your First Configuration
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {configs.map((config: any, index: number) => (
            <div
              key={config._id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <AgentConfigCardV2 config={config} onEdit={handleEdit} />
            </div>
          ))}
        </div>
      )}

      <AgentConfigDialogV2
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        config={editingConfig || undefined}
        onSuccess={() => {
          setDialogOpen(false)
          setEditingConfig(null)
        }}
      />
    </div>
  )
}

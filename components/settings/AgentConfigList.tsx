'use client'

import { useState } from 'react'
import { useAgentConfigs, useUpdateAgentConfig, useDeleteAgentConfig } from '@/lib/queries'
import { AgentConfigCard } from './AgentConfigCard'
import { AgentConfigDialog } from './AgentConfigDialog'
import { AgentConfig } from '@/types'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, Plus } from 'lucide-react'

export function AgentConfigList() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const { data: configs, isLoading, error } = useAgentConfigs()
  const updateMutation = useUpdateAgentConfig()
  const deleteMutation = useDeleteAgentConfig()

  const handleCardToggle = (agentId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev)
      if (next.has(agentId)) {
        next.delete(agentId)
      } else {
        next.add(agentId)
      }
      return next
    })
  }

  const handleSave = async (config: AgentConfig) => {
    try {
      await updateMutation.mutateAsync(config)
    } catch (error) {
      console.error('Failed to save agent config:', error)
    }
  }

  const handleDelete = async (agentId: string) => {
    try {
      await deleteMutation.mutateAsync(agentId)
    } catch (error) {
      console.error('Failed to delete agent config:', error)
    }
  }

  const handleCreateSuccess = () => {
    // Dialog will close automatically, list will refresh via React Query
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
      {/* Create Button - Always visible */}
      <div className="flex items-center justify-end">
        <Button
          onClick={() => setDialogOpen(true)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Agent Configuration
        </Button>
      </div>

      {/* Empty State */}
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
          <Button
            onClick={() => setDialogOpen(true)}
            size="lg"
            className="mt-4 gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Your First Agent
          </Button>
        </div>
      ) : (
        /* Config List */
        configs.map((config: AgentConfig, index: number) => (
          <div 
            key={config.agentId} 
            className="animate-slide-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <AgentConfigCard
              config={config}
              onSave={handleSave}
              onDelete={handleDelete}
              isSaving={updateMutation.isPending}
              isDeleting={deleteMutation.isPending}
              isExpanded={expandedCards.has(config.agentId)}
              onToggle={() => handleCardToggle(config.agentId)}
            />
          </div>
        ))
      )}

      {/* Create Dialog */}
      <AgentConfigDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  )
}


'use client'

import { useState, useMemo } from 'react'
import {
  useOrchestratorAgentConfigs,
  useDeleteOrchestratorAgentConfig,
  useOrchestratorAvailableModels,
} from '@/lib/queries-v2'
import { AgentConfigCard } from './AgentConfigCard'
import { AgentConfigDialog } from './AgentConfigDialog'
import { AgentConfigViewDialog } from './AgentConfigViewDialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, AlertCircle, Plus } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function AgentConfigList() {
  const [enabledFilter, setEnabledFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedConfig, setSelectedConfig] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [configToDelete, setConfigToDelete] = useState<any>(null)

  const enabledFilterBool = enabledFilter === 'enabled' ? true : enabledFilter === 'disabled' ? false : undefined
  const { data: configs, isLoading, error } = useOrchestratorAgentConfigs(enabledFilterBool)
  const { data: models } = useOrchestratorAvailableModels()
  const deleteMutation = useDeleteOrchestratorAgentConfig()

  // Enrich configs with model information
  const enrichedConfigs = useMemo(() => {
    if (!configs || !models) return []
    const modelMap = new Map((models as any[]).map((m: any) => [m._id, m]))
    return (configs as any[]).map((config: any) => ({
      ...config,
      availableModel: modelMap.get(config.availableModelId),
    }))
  }, [configs, models])

  const handleView = (config: any) => {
    setSelectedConfig(config)
    setViewDialogOpen(true)
  }

  const handleEdit = (config: any) => {
    setSelectedConfig(config)
    setDialogOpen(true)
  }

  const handleDelete = (config: any) => {
    setConfigToDelete(config)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (configToDelete) {
      try {
        await deleteMutation.mutateAsync(configToDelete._id)
        setDeleteDialogOpen(false)
        setConfigToDelete(null)
      } catch (error) {
        console.error('Failed to delete config:', error)
      }
    }
  }

  const handleCreate = () => {
    setSelectedConfig(null)
    setDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Loading agent configs...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
        <div>
          <div className="font-semibold text-red-900 dark:text-red-100">Failed to load agent configs</div>
          <div className="text-sm text-red-700 dark:text-red-300 mt-1">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Agent Configs</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {enrichedConfigs.length} config{enrichedConfigs.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Config
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="max-w-xs">
          <Label htmlFor="enabled-filter">Filter by Status</Label>
          <Select value={enabledFilter} onValueChange={setEnabledFilter}>
            <SelectTrigger id="enabled-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="enabled">Enabled</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Configs Grid */}
      {enrichedConfigs.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-lg bg-muted/30 border border-dashed border-border">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-muted-foreground" />
            <div className="text-center">
              <div className="font-semibold text-lg mb-1">No agent configs found</div>
              <div className="text-sm text-muted-foreground">
                {enabledFilter !== 'all'
                  ? 'Try adjusting your filter'
                  : 'Create your first agent config to get started'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {enrichedConfigs.map((config: any, index: number) => (
            <div
              key={config._id || index}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <AgentConfigCard
                config={config}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <AgentConfigDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        config={selectedConfig}
      />

      {/* View Dialog */}
      <AgentConfigViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        config={selectedConfig}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent Config</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this agent config? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}


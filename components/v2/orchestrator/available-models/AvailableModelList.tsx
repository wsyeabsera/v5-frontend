'use client'

import { useState, useMemo } from 'react'
import { useOrchestratorAvailableModels, useDeleteOrchestratorAvailableModel } from '@/lib/queries-v2'
import { AvailableModelCard } from './AvailableModelCard'
import { AvailableModelDialog } from './AvailableModelDialog'
import { AvailableModelViewDialog } from './AvailableModelViewDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

export function AvailableModelList() {
  const [providerFilter, setProviderFilter] = useState<string>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [modelToDelete, setModelToDelete] = useState<any>(null)

  const { data: models, isLoading, error } = useOrchestratorAvailableModels(providerFilter || undefined)
  const deleteMutation = useDeleteOrchestratorAvailableModel()

  const filteredModels = useMemo(() => {
    if (!models) return []
    return Array.isArray(models) ? models : []
  }, [models])

  const handleView = (model: any) => {
    setSelectedModel(model)
    setViewDialogOpen(true)
  }

  const handleEdit = (model: any) => {
    setSelectedModel(model)
    setDialogOpen(true)
  }

  const handleDelete = (model: any) => {
    setModelToDelete(model)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (modelToDelete) {
      try {
        await deleteMutation.mutateAsync(modelToDelete._id)
        setDeleteDialogOpen(false)
        setModelToDelete(null)
      } catch (error) {
        console.error('Failed to delete model:', error)
      }
    }
  }

  const handleCreate = () => {
    setSelectedModel(null)
    setDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Loading models...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
        <div>
          <div className="font-semibold text-red-900 dark:text-red-100">Failed to load models</div>
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
          <h2 className="text-2xl font-semibold">Available Models</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredModels.length} model{filteredModels.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Model
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-xs">
          <Label htmlFor="provider-filter">Filter by Provider</Label>
          <Input
            id="provider-filter"
            placeholder="e.g., anthropic, openai"
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Models Grid */}
      {filteredModels.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-lg bg-muted/30 border border-dashed border-border">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-muted-foreground" />
            <div className="text-center">
              <div className="font-semibold text-lg mb-1">No models found</div>
              <div className="text-sm text-muted-foreground">
                {providerFilter ? 'Try adjusting your filter' : 'Create your first model to get started'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredModels.map((model: any, index: number) => (
            <div
              key={model._id || index}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <AvailableModelCard
                model={model}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <AvailableModelDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        model={selectedModel}
      />

      {/* View Dialog */}
      <AvailableModelViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        model={selectedModel}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {modelToDelete?.modelName}? This action cannot be undone.
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


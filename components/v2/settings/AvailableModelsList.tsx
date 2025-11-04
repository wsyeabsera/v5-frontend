'use client'

import { useState } from 'react'
import { useAvailableModels } from '@/lib/queries-v2'
import { AvailableModelCard } from './AvailableModelCard'
import { AvailableModelDialog } from './AvailableModelDialog'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, Plus } from 'lucide-react'

export function AvailableModelsList() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<{
    _id: string
    provider: string
    modelName: string
    modelId?: string
  } | null>(null)
  const { data: models, isLoading, error } = useAvailableModels()

  const handleCreate = () => {
    setEditingModel(null)
    setDialogOpen(true)
  }

  const handleEdit = (model: { _id: string; provider: string; modelName: string; modelId?: string }) => {
    setEditingModel(model)
    setDialogOpen(true)
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingModel(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Loading available models...</span>
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
      <div className="flex items-center justify-end">
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Available Model
        </Button>
      </div>

      {(!models || models.length === 0) ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-lg bg-muted/30 border border-dashed border-border">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-muted-foreground" />
            <div className="text-center">
              <div className="font-semibold text-lg mb-1">No available models found</div>
              <div className="text-sm text-muted-foreground">
                Create your first available model to get started
              </div>
            </div>
          </div>
          <Button onClick={handleCreate} size="lg" className="mt-4 gap-2">
            <Plus className="w-5 h-5" />
            Create Your First Model
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {models.map((model: any, index: number) => (
            <div
              key={model._id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <AvailableModelCard model={model} onEdit={handleEdit} />
            </div>
          ))}
        </div>
      )}

      <AvailableModelDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        model={editingModel || undefined}
        onSuccess={() => {
          setDialogOpen(false)
          setEditingModel(null)
        }}
      />
    </div>
  )
}

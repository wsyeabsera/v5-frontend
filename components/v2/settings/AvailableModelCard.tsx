'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { useDeleteAvailableModel } from '@/lib/queries-v2'
import { Pencil, Trash2, Loader2 } from 'lucide-react'

interface AvailableModelCardProps {
  model: {
    _id: string
    provider: string
    modelName: string
    modelId?: string
    createdAt?: string
    updatedAt?: string
  }
  onEdit: (model: { _id: string; provider: string; modelName: string; modelId?: string }) => void
}

export function AvailableModelCard({ model, onEdit }: AvailableModelCardProps) {
  const deleteMutation = useDeleteAvailableModel()

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(model._id)
    } catch (error) {
      console.error('Failed to delete model:', error)
    }
  }

  return (
    <Card className="p-4 hover:border-primary/30 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{model.modelName}</h3>
            <Badge variant="outline" className="text-xs">
              {model.provider}
            </Badge>
          </div>
          {model.modelId && (
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">Model ID:</p>
              <p className="text-xs font-mono text-muted-foreground">{model.modelId}</p>
            </div>
          )}
          {model.createdAt && (
            <p className="text-xs text-muted-foreground">
              Created: {new Date(model.createdAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(model)}
            disabled={deleteMutation.isPending}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Model?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete <strong>{model.modelName}</strong> ({model.provider})?
                  This action cannot be undone.
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
        </div>
      </div>
    </Card>
  )
}

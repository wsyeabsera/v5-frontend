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
import { useDeleteResource } from '@/lib/queries-v2'
import { Pencil, Trash2, Loader2 } from 'lucide-react'

interface ResourceCardProps {
  resource: {
    uri: string
    name: string
    description?: string
    mimeType?: string
    source?: 'remote' | 'local'
  }
  onEdit: (resource: {
    uri: string
    name: string
    description?: string
    mimeType?: string
    source?: 'remote' | 'local'
  }) => void
}

export function ResourceCard({ resource, onEdit }: ResourceCardProps) {
  const deleteMutation = useDeleteResource()

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(resource.uri)
    } catch (error) {
      console.error('Failed to delete resource:', error)
    }
  }

  return (
    <Card className="p-6 hover:border-primary/30 transition-all duration-200">
      <div className="space-y-4">
        {/* Name and URI */}
        <div>
          <h3 className="font-semibold text-lg mb-1">{resource.name}</h3>
          <p className="text-sm text-muted-foreground font-mono break-all">{resource.uri}</p>
        </div>

        {/* Description */}
        {resource.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{resource.description}</p>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Source */}
          {resource.source && (
            <Badge variant={resource.source === 'remote' ? 'default' : 'secondary'}>
              {resource.source}
            </Badge>
          )}

          {/* MIME Type */}
          {resource.mimeType && <Badge variant="outline">{resource.mimeType}</Badge>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(resource)}
            disabled={deleteMutation.isPending}
            className="flex-1 gap-2"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteMutation.isPending}
                className="flex-1 gap-2"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Resource?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this resource? This action cannot be undone.
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


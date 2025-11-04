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
import { useDeleteRequest } from '@/lib/queries-v2'
import { Pencil, Trash2, Loader2, Calendar } from 'lucide-react'

interface RequestCardProps {
  request: {
    _id: string
    query: string
    categories: string[]
    tags: string[]
    version: string
    createdAt?: string
    updatedAt?: string
  }
  onEdit: (request: {
    _id: string
    query: string
    categories: string[]
    tags: string[]
    version: string
  }) => void
}

export function RequestCard({ request, onEdit }: RequestCardProps) {
  const deleteMutation = useDeleteRequest()

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(request._id)
    } catch (error) {
      console.error('Failed to delete request:', error)
    }
  }

  return (
    <Card className="p-6 hover:border-primary/30 transition-all duration-200">
      <div className="space-y-4">
        {/* Query */}
        <div>
          <h3 className="font-semibold text-lg mb-2">Query</h3>
          <p className="text-sm text-muted-foreground line-clamp-3">{request.query}</p>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Version */}
          <Badge variant="outline">{request.version}</Badge>

          {/* Categories */}
          {request.categories.map((category) => (
            <Badge key={category} variant="secondary">
              {category}
            </Badge>
          ))}

          {/* Tags */}
          {request.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="bg-muted">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Timestamps */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          {request.createdAt && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Created: {new Date(request.createdAt).toLocaleDateString()}</span>
            </div>
          )}
          {request.updatedAt && request.updatedAt !== request.createdAt && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Updated: {new Date(request.updatedAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(request)}
            disabled={deleteMutation.isPending}
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
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
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Request?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this request? This action cannot be undone.
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

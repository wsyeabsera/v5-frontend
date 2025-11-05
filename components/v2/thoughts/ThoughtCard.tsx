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
import { useDeleteThought } from '@/lib/queries-v2'
import { Eye, Trash2, Loader2, Calendar } from 'lucide-react'

interface ThoughtCardProps {
  thought: {
    _id?: string
    id?: string
    userQuery?: string
    agentConfigId?: string
    thoughts?: any[]
    createdAt?: string
    updatedAt?: string
  }
  onView: (thoughtId: string) => void
}

export function ThoughtCard({ thought, onView }: ThoughtCardProps) {
  const deleteMutation = useDeleteThought()
  const thoughtId = thought._id || thought.id || ''

  const handleDelete = async () => {
    if (!thoughtId) return
    try {
      await deleteMutation.mutateAsync(thoughtId)
    } catch (error) {
      console.error('Failed to delete thought:', error)
    }
  }

  const thoughtCount = Array.isArray(thought.thoughts) ? thought.thoughts.length : 0

  return (
    <Card className="p-6 hover:border-primary/30 transition-all duration-200">
      <div className="space-y-4">
        {/* User Query */}
        <div>
          <h3 className="font-semibold text-lg mb-2">Query</h3>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {thought.userQuery || 'No query provided'}
          </p>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Agent Config ID */}
          {thought.agentConfigId && (
            <Badge variant="outline" className="font-mono text-xs">
              {thought.agentConfigId.substring(0, 8)}...
            </Badge>
          )}

          {/* Thought Count */}
          <Badge variant="secondary">
            {thoughtCount} thought{thoughtCount !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Timestamps */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          {thought.createdAt && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Created: {new Date(thought.createdAt).toLocaleDateString()}</span>
            </div>
          )}
          {thought.updatedAt && thought.updatedAt !== thought.createdAt && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Updated: {new Date(thought.updatedAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => thoughtId && onView(thoughtId)}
            disabled={deleteMutation.isPending || !thoughtId}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteMutation.isPending || !thoughtId}
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
                <AlertDialogTitle>Delete Thought?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this thought? This action cannot be undone.
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


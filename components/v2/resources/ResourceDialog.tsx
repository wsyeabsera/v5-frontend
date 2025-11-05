'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateResource, useUpdateResource } from '@/lib/queries-v2'
import { Loader2, Plus, Pencil } from 'lucide-react'

interface ResourceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  resource?: {
    uri: string
    name: string
    description?: string
    mimeType?: string
    source?: 'remote' | 'local'
  }
}

export function ResourceDialog({
  open,
  onOpenChange,
  onSuccess,
  resource,
}: ResourceDialogProps) {
  const [uri, setUri] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [mimeType, setMimeType] = useState('')
  const [source, setSource] = useState<'remote' | 'local'>('local')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const createMutation = useCreateResource()
  const updateMutation = useUpdateResource()
  const isEditing = !!resource
  const isLoading = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (open) {
      if (resource) {
        setUri(resource.uri)
        setName(resource.name)
        setDescription(resource.description || '')
        setMimeType(resource.mimeType || '')
        setSource(resource.source || 'local')
      } else {
        setUri('')
        setName('')
        setDescription('')
        setMimeType('')
        setSource('local')
      }
      setErrors({})
    }
  }, [open, resource])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!uri.trim()) {
      newErrors.uri = 'URI is required'
    }

    if (!name.trim()) {
      newErrors.name = 'Name is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          uri: resource.uri,
          updates: {
            name,
            description: description || undefined,
            mimeType: mimeType || undefined,
            source,
          },
        })
      } else {
        await createMutation.mutateAsync({
          uri,
          name,
          description: description || undefined,
          mimeType: mimeType || undefined,
          source,
        })
      }
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save resource:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Pencil className="w-5 h-5" />
                Edit Resource
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Create Resource
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the resource details below.'
              : 'Create a new resource with URI, name, description, and MIME type.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* URI */}
          <div className="space-y-2">
            <Label htmlFor="uri">URI *</Label>
            <Input
              id="uri"
              placeholder="e.g., https://example.com/resource"
              value={uri}
              onChange={(e) => setUri(e.target.value)}
              disabled={isEditing}
            />
            {errors.uri && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.uri}</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="Resource name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {errors.name && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Resource description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* MIME Type */}
          <div className="space-y-2">
            <Label htmlFor="mimeType">MIME Type</Label>
            <Input
              id="mimeType"
              placeholder="e.g., application/json, text/plain"
              value={mimeType}
              onChange={(e) => setMimeType(e.target.value)}
            />
          </div>

          {/* Source */}
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Select value={source} onValueChange={(value) => setSource(value as 'remote' | 'local')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="local">Local</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : isEditing ? (
                'Update Resource'
              ) : (
                'Create Resource'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


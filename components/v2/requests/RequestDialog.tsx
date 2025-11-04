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
import { useCreateRequest, useUpdateRequest } from '@/lib/queries-v2'
import { Loader2, Plus, Pencil } from 'lucide-react'

interface RequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  request?: {
    _id: string
    query: string
    categories: string[]
    tags: string[]
    version: string
  }
}

export function RequestDialog({
  open,
  onOpenChange,
  onSuccess,
  request,
}: RequestDialogProps) {
  const [query, setQuery] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [version, setVersion] = useState('v1.0')
  const [categoryInput, setCategoryInput] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const createMutation = useCreateRequest()
  const updateMutation = useUpdateRequest()
  const isEditing = !!request
  const isLoading = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (open) {
      if (request) {
        setQuery(request.query)
        setCategories(request.categories || [])
        setTags(request.tags || [])
        setVersion(request.version)
      } else {
        setQuery('')
        setCategories([])
        setTags([])
        setVersion('v1.0')
      }
      setCategoryInput('')
      setTagInput('')
      setErrors({})
    }
  }, [open, request])

  const addCategory = () => {
    const trimmed = categoryInput.trim()
    if (trimmed && !categories.includes(trimmed)) {
      setCategories([...categories, trimmed])
      setCategoryInput('')
    }
  }

  const removeCategory = (category: string) => {
    setCategories(categories.filter((c) => c !== category))
  }

  const addTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!query.trim()) {
      newErrors.query = 'Query is required'
    }

    if (categories.length === 0) {
      newErrors.categories = 'At least one category is required'
    }

    if (tags.length === 0) {
      newErrors.tags = 'At least one tag is required'
    }

    if (!version.trim()) {
      newErrors.version = 'Version is required'
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
          id: request._id,
          updates: {
            query,
            categories,
            tags,
            version,
          },
        })
      } else {
        await createMutation.mutateAsync({
          query,
          categories,
          tags,
          version,
        })
      }
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save request:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Pencil className="w-5 h-5" />
                Edit Request
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Create Request
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the request details below.'
              : 'Create a new request with query, categories, tags, and version.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Query */}
          <div className="space-y-2">
            <Label htmlFor="query">Query *</Label>
            <Textarea
              id="query"
              placeholder="Enter the user's query or prompt..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={4}
              className="resize-none"
            />
            {errors.query && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.query}</p>
            )}
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <Label>Categories *</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter a category..."
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCategory()
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addCategory}>
                Add
              </Button>
            </div>
            {errors.categories && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.categories}</p>
            )}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <div
                    key={category}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-sm"
                  >
                    {category}
                    <button
                      type="button"
                      onClick={() => removeCategory(category)}
                      className="hover:text-destructive"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags *</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter a tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Add
              </Button>
            </div>
            {errors.tags && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.tags}</p>
            )}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <div
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-muted-foreground text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-destructive"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Version */}
          <div className="space-y-2">
            <Label htmlFor="version">Version *</Label>
            <Input
              id="version"
              placeholder="e.g., v1.0"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            />
            {errors.version && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.version}</p>
            )}
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
                'Update Request'
              ) : (
                'Create Request'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

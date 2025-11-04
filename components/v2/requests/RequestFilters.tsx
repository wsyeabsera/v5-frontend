'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface RequestFiltersProps {
  filters: {
    categories?: string[]
    tags?: string[]
    version?: string
  }
  onFiltersChange: (filters: {
    categories?: string[]
    tags?: string[]
    version?: string
  }) => void
  availableCategories?: string[]
  availableTags?: string[]
}

export function RequestFilters({
  filters,
  onFiltersChange,
  availableCategories = [],
  availableTags = [],
}: RequestFiltersProps) {
  const [categoryInput, setCategoryInput] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [versionInput, setVersionInput] = useState(filters.version || '')

  const addCategoryFilter = () => {
    const trimmed = categoryInput.trim()
    if (trimmed && !filters.categories?.includes(trimmed)) {
      onFiltersChange({
        ...filters,
        categories: [...(filters.categories || []), trimmed],
      })
      setCategoryInput('')
    }
  }

  const removeCategoryFilter = (category: string) => {
    onFiltersChange({
      ...filters,
      categories: filters.categories?.filter((c) => c !== category),
    })
  }

  const addTagFilter = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !filters.tags?.includes(trimmed)) {
      onFiltersChange({
        ...filters,
        tags: [...(filters.tags || []), trimmed],
      })
      setTagInput('')
    }
  }

  const removeTagFilter = (tag: string) => {
    onFiltersChange({
      ...filters,
      tags: filters.tags?.filter((t) => t !== tag),
    })
  }

  const updateVersionFilter = (version: string) => {
    setVersionInput(version)
    onFiltersChange({
      ...filters,
      version: version.trim() || undefined,
    })
  }

  const clearFilters = () => {
    onFiltersChange({})
    setVersionInput('')
  }

  const hasActiveFilters =
    (filters.categories && filters.categories.length > 0) ||
    (filters.tags && filters.tags.length > 0) ||
    (filters.version && filters.version.trim().length > 0)

  return (
    <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Filters</Label>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
            <X className="w-4 h-4" />
            Clear All
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {/* Version Filter */}
        <div className="space-y-2">
          <Label htmlFor="version-filter">Version</Label>
          <Input
            id="version-filter"
            placeholder="Filter by version..."
            value={versionInput}
            onChange={(e) => updateVersionFilter(e.target.value)}
          />
        </div>

        {/* Category Filters */}
        <div className="space-y-2">
          <Label>Categories</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Add category filter..."
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCategoryFilter()
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addCategoryFilter}>
              Add
            </Button>
          </div>
          {filters.categories && filters.categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filters.categories.map((category) => (
                <div
                  key={category}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-sm"
                >
                  {category}
                  <button
                    type="button"
                    onClick={() => removeCategoryFilter(category)}
                    className="hover:text-destructive"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tag Filters */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Add tag filter..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTagFilter()
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addTagFilter}>
              Add
            </Button>
          </div>
          {filters.tags && filters.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filters.tags.map((tag) => (
                <div
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-muted-foreground text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTagFilter(tag)}
                    className="hover:text-destructive"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X } from 'lucide-react'

interface BenchmarkTestFiltersProps {
  filters: {
    category?: string
    tags?: string[]
    priority?: 'critical' | 'high' | 'medium' | 'low'
    limit?: number
    skip?: number
  }
  onFiltersChange: (filters: {
    category?: string
    tags?: string[]
    priority?: 'critical' | 'high' | 'medium' | 'low'
    limit?: number
    skip?: number
  }) => void
}

export function BenchmarkTestFilters({
  filters,
  onFiltersChange,
}: BenchmarkTestFiltersProps) {
  const [categoryInput, setCategoryInput] = useState(filters.category || '')

  const updateCategoryFilter = (value: string) => {
    setCategoryInput(value)
    onFiltersChange({
      ...filters,
      category: value.trim() || undefined,
      skip: 0,
    })
  }

  const updatePriorityFilter = (value: string) => {
    onFiltersChange({
      ...filters,
      priority: value === 'all' ? undefined : (value as 'critical' | 'high' | 'medium' | 'low'),
      skip: 0,
    })
  }

  const clearFilters = () => {
    setCategoryInput('')
    onFiltersChange({
      limit: filters.limit || 50,
      skip: 0,
    })
  }

  const hasActiveFilters =
    (filters.category && filters.category.trim().length > 0) ||
    filters.priority !== undefined ||
    (filters.tags && filters.tags.length > 0)

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="category-filter">Category</Label>
          <Input
            id="category-filter"
            placeholder="Filter by category..."
            value={categoryInput}
            onChange={(e) => updateCategoryFilter(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority-filter">Priority</Label>
          <Select
            value={filters.priority || 'all'}
            onValueChange={updatePriorityFilter}
          >
            <SelectTrigger id="priority-filter">
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}


'use client'

import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ResourceFiltersProps {
  filters: {
    source?: 'remote' | 'local' | 'all'
    mimeType?: string
  }
  onFiltersChange: (filters: {
    source?: 'remote' | 'local' | 'all'
    mimeType?: string
  }) => void
  availableMimeTypes?: string[]
}

export function ResourceFilters({
  filters,
  onFiltersChange,
  availableMimeTypes = [],
}: ResourceFiltersProps) {
  const clearFilters = () => {
    onFiltersChange({})
  }

  const hasActiveFilters =
    (filters.source && filters.source !== 'all') || (filters.mimeType && filters.mimeType.length > 0)

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source Filter */}
        <div className="space-y-2">
          <Label>Source</Label>
          <Select
            value={filters.source || 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                source: value === 'all' ? undefined : (value as 'remote' | 'local'),
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="remote">Remote</SelectItem>
              <SelectItem value="local">Local</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* MIME Type Filter */}
        <div className="space-y-2">
          <Label>MIME Type</Label>
          <Select
            value={filters.mimeType || 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                mimeType: value === 'all' ? undefined : value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All MIME types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All MIME types</SelectItem>
              {availableMimeTypes.map((mimeType) => (
                <SelectItem key={mimeType} value={mimeType}>
                  {mimeType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}


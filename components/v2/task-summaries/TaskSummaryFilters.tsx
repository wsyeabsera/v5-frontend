'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search } from 'lucide-react'

interface TaskSummaryFiltersProps {
  filters: {
    status?: 'completed' | 'failed'
    search?: string
  }
  onFiltersChange: (filters: {
    status?: 'completed' | 'failed'
    search?: string
  }) => void
}

export function TaskSummaryFilters({
  filters,
  onFiltersChange,
}: TaskSummaryFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '')

  const updateStatusFilter = (value: string) => {
    onFiltersChange({
      ...filters,
      status: value === 'all' ? undefined : (value as 'completed' | 'failed'),
    })
  }

  const updateSearchFilter = (value: string) => {
    setSearchInput(value)
    onFiltersChange({
      ...filters,
      search: value.trim() || undefined,
    })
  }

  return (
    <div className="flex items-center gap-4">
      {/* Status Filter */}
      <div className="space-y-2">
        <Label htmlFor="status-filter" className="sr-only">
          Status
        </Label>
        <Select
          value={filters.status || 'all'}
          onValueChange={updateStatusFilter}
        >
          <SelectTrigger id="status-filter" className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="search-filter" className="sr-only">
          Search
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="search-filter"
            placeholder="Search by task ID..."
            value={searchInput}
            onChange={(e) => updateSearchFilter(e.target.value)}
            className="pl-9 w-[300px]"
          />
        </div>
      </div>
    </div>
  )
}


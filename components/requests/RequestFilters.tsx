'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { RequestContext } from '@/types'
import { Search, X } from 'lucide-react'

export interface RequestFiltersState {
  search: string
  status: RequestContext['status'] | 'all'
  agentName: string | 'all'
}

interface RequestFiltersProps {
  filters: RequestFiltersState
  onFiltersChange: (filters: RequestFiltersState) => void
  availableAgents?: string[]
}

export function RequestFilters({
  filters,
  onFiltersChange,
  availableAgents = [],
}: RequestFiltersProps) {
  const handleFilterChange = <K extends keyof RequestFiltersState>(
    key: K,
    value: RequestFiltersState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      agentName: 'all',
    })
  }

  const hasActiveFilters =
    filters.search !== '' || filters.status !== 'all' || (filters.agentName !== '' && filters.agentName !== 'all')

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by request ID or query..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status Filter */}
        <Select
          value={filters.status}
          onValueChange={(value) => handleFilterChange('status', value as RequestFiltersState['status'])}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        {/* Agent Name Filter */}
        {availableAgents.length > 0 && (
          <Select
            value={filters.agentName}
            onValueChange={(value) => handleFilterChange('agentName', value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {availableAgents.map((agent) => (
                <SelectItem key={agent} value={agent}>
                  {agent}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="gap-2"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}


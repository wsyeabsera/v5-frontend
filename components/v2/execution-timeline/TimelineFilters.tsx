'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X } from 'lucide-react'

interface TimelineFiltersProps {
  filters: {
    status?: string
    agentConfigId?: string
    startDate?: string
    endDate?: string
  }
  onFiltersChange: (filters: {
    status?: string
    agentConfigId?: string
    startDate?: string
    endDate?: string
  }) => void
}

export function TimelineFilters({
  filters,
  onFiltersChange,
}: TimelineFiltersProps) {
  const [agentConfigIdInput, setAgentConfigIdInput] = useState(filters.agentConfigId || '')
  const [startDateInput, setStartDateInput] = useState(
    filters.startDate ? new Date(filters.startDate).toISOString().split('T')[0] : ''
  )
  const [endDateInput, setEndDateInput] = useState(
    filters.endDate ? new Date(filters.endDate).toISOString().split('T')[0] : ''
  )

  const updateStatusFilter = (value: string) => {
    onFiltersChange({
      ...filters,
      status: value === 'all' ? undefined : value,
    })
  }

  const updateAgentConfigIdFilter = (value: string) => {
    setAgentConfigIdInput(value)
    onFiltersChange({
      ...filters,
      agentConfigId: value.trim() || undefined,
    })
  }

  const updateStartDateFilter = (value: string) => {
    setStartDateInput(value)
    onFiltersChange({
      ...filters,
      startDate: value ? new Date(value).toISOString() : undefined,
    })
  }

  const updateEndDateFilter = (value: string) => {
    setEndDateInput(value)
    onFiltersChange({
      ...filters,
      endDate: value ? new Date(value).toISOString() : undefined,
    })
  }

  const clearFilters = () => {
    setAgentConfigIdInput('')
    setStartDateInput('')
    setEndDateInput('')
    onFiltersChange({})
  }

  const hasActiveFilters =
    filters.status !== undefined ||
    (filters.agentConfigId && filters.agentConfigId.trim().length > 0) ||
    filters.startDate !== undefined ||
    filters.endDate !== undefined

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Status Filter */}
        <div className="space-y-2">
          <Label htmlFor="status-filter">Status</Label>
          <Select
            value={filters.status || 'all'}
            onValueChange={updateStatusFilter}
          >
            <SelectTrigger id="status-filter">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Agent Config ID Filter */}
        <div className="space-y-2">
          <Label htmlFor="agentConfigId-filter">Agent Config ID</Label>
          <Input
            id="agentConfigId-filter"
            placeholder="Filter by agent config ID..."
            value={agentConfigIdInput}
            onChange={(e) => updateAgentConfigIdFilter(e.target.value)}
          />
        </div>

        {/* Start Date Filter */}
        <div className="space-y-2">
          <Label htmlFor="startDate-filter">Start Date</Label>
          <Input
            id="startDate-filter"
            type="date"
            value={startDateInput}
            onChange={(e) => updateStartDateFilter(e.target.value)}
          />
        </div>

        {/* End Date Filter */}
        <div className="space-y-2">
          <Label htmlFor="endDate-filter">End Date</Label>
          <Input
            id="endDate-filter"
            type="date"
            value={endDateInput}
            onChange={(e) => updateEndDateFilter(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}


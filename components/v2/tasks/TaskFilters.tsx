'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X } from 'lucide-react'

interface TaskFiltersProps {
  filters: {
    planId?: string
    status?: 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled'
    agentConfigId?: string
    startDate?: string
    endDate?: string
    limit?: number
    skip?: number
  }
  onFiltersChange: (filters: {
    planId?: string
    status?: 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled'
    agentConfigId?: string
    startDate?: string
    endDate?: string
    limit?: number
    skip?: number
  }) => void
}

export function TaskFilters({
  filters,
  onFiltersChange,
}: TaskFiltersProps) {
  const [planIdInput, setPlanIdInput] = useState(filters.planId || '')
  const [agentConfigIdInput, setAgentConfigIdInput] = useState(filters.agentConfigId || '')
  const [startDateInput, setStartDateInput] = useState(
    filters.startDate ? new Date(filters.startDate).toISOString().split('T')[0] : ''
  )
  const [endDateInput, setEndDateInput] = useState(
    filters.endDate ? new Date(filters.endDate).toISOString().split('T')[0] : ''
  )

  const updatePlanIdFilter = (value: string) => {
    setPlanIdInput(value)
    onFiltersChange({
      ...filters,
      planId: value.trim() || undefined,
      skip: 0, // Reset pagination when filter changes
    })
  }

  const updateStatusFilter = (value: string) => {
    onFiltersChange({
      ...filters,
      status: value === 'all' ? undefined : (value as 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled'),
      skip: 0, // Reset pagination when filter changes
    })
  }

  const updateAgentConfigIdFilter = (value: string) => {
    setAgentConfigIdInput(value)
    onFiltersChange({
      ...filters,
      agentConfigId: value.trim() || undefined,
      skip: 0, // Reset pagination when filter changes
    })
  }

  const updateStartDateFilter = (value: string) => {
    setStartDateInput(value)
    onFiltersChange({
      ...filters,
      startDate: value ? new Date(value).toISOString() : undefined,
      skip: 0,
    })
  }

  const updateEndDateFilter = (value: string) => {
    setEndDateInput(value)
    onFiltersChange({
      ...filters,
      endDate: value ? new Date(value).toISOString() : undefined,
      skip: 0,
    })
  }

  const clearFilters = () => {
    setPlanIdInput('')
    setAgentConfigIdInput('')
    setStartDateInput('')
    setEndDateInput('')
    onFiltersChange({
      limit: filters.limit || 50,
      skip: 0,
    })
  }

  const hasActiveFilters =
    (filters.planId && filters.planId.trim().length > 0) ||
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Plan ID Filter */}
        <div className="space-y-2">
          <Label htmlFor="planId-filter">Plan ID</Label>
          <Input
            id="planId-filter"
            placeholder="Filter by plan ID..."
            value={planIdInput}
            onChange={(e) => updatePlanIdFilter(e.target.value)}
          />
        </div>

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
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
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


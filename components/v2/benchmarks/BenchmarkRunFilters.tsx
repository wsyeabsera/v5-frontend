'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateRangePicker } from '@/components/v2/shared/DateRangePicker'
import { X } from 'lucide-react'

interface BenchmarkRunFiltersProps {
  filters: {
    testId?: string
    status?: 'passed' | 'failed' | 'timeout' | 'error'
    agentConfigId?: string
    startDate?: string
    endDate?: string
    limit?: number
    skip?: number
  }
  onFiltersChange: (filters: {
    testId?: string
    status?: 'passed' | 'failed' | 'timeout' | 'error'
    agentConfigId?: string
    startDate?: string
    endDate?: string
    limit?: number
    skip?: number
  }) => void
}

export function BenchmarkRunFilters({
  filters,
  onFiltersChange,
}: BenchmarkRunFiltersProps) {
  const [testIdInput, setTestIdInput] = useState(filters.testId || '')
  const [agentConfigIdInput, setAgentConfigIdInput] = useState(filters.agentConfigId || '')

  const updateTestIdFilter = (value: string) => {
    setTestIdInput(value)
    onFiltersChange({
      ...filters,
      testId: value.trim() || undefined,
      skip: 0,
    })
  }

  const updateStatusFilter = (value: string) => {
    onFiltersChange({
      ...filters,
      status: value === 'all' ? undefined : (value as 'passed' | 'failed' | 'timeout' | 'error'),
      skip: 0,
    })
  }

  const updateAgentConfigIdFilter = (value: string) => {
    setAgentConfigIdInput(value)
    onFiltersChange({
      ...filters,
      agentConfigId: value.trim() || undefined,
      skip: 0,
    })
  }

  const updateStartDate = (date: string) => {
    onFiltersChange({
      ...filters,
      startDate: date || undefined,
      skip: 0,
    })
  }

  const updateEndDate = (date: string) => {
    onFiltersChange({
      ...filters,
      endDate: date || undefined,
      skip: 0,
    })
  }

  const clearFilters = () => {
    setTestIdInput('')
    setAgentConfigIdInput('')
    onFiltersChange({
      limit: filters.limit || 50,
      skip: 0,
    })
  }

  const hasActiveFilters =
    (filters.testId && filters.testId.trim().length > 0) ||
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
        <div className="space-y-2">
          <Label htmlFor="testId-filter">Test ID</Label>
          <Input
            id="testId-filter"
            placeholder="Filter by test ID..."
            value={testIdInput}
            onChange={(e) => updateTestIdFilter(e.target.value)}
          />
        </div>

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
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="timeout">Timeout</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="agentConfigId-filter">Agent Config ID</Label>
          <Input
            id="agentConfigId-filter"
            placeholder="Filter by agent config ID..."
            value={agentConfigIdInput}
            onChange={(e) => updateAgentConfigIdFilter(e.target.value)}
          />
        </div>

        <div className="md:col-span-2 lg:col-span-3">
          <DateRangePicker
            startDate={filters.startDate}
            endDate={filters.endDate}
            onStartDateChange={updateStartDate}
            onEndDateChange={updateEndDate}
          />
        </div>
      </div>
    </div>
  )
}


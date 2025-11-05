'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateRangePicker } from '@/components/v2/shared/DateRangePicker'
import { X } from 'lucide-react'

interface RegressionFiltersProps {
  filters: {
    testId?: string
    severity?: 'critical' | 'high' | 'medium' | 'low'
    resolved?: boolean
    startDate?: string
    endDate?: string
    limit?: number
    skip?: number
  }
  onFiltersChange: (filters: {
    testId?: string
    severity?: 'critical' | 'high' | 'medium' | 'low'
    resolved?: boolean
    startDate?: string
    endDate?: string
    limit?: number
    skip?: number
  }) => void
}

export function RegressionFilters({
  filters,
  onFiltersChange,
}: RegressionFiltersProps) {
  const [testIdInput, setTestIdInput] = useState(filters.testId || '')

  const updateTestIdFilter = (value: string) => {
    setTestIdInput(value)
    onFiltersChange({
      ...filters,
      testId: value.trim() || undefined,
      skip: 0,
    })
  }

  const updateSeverityFilter = (value: string) => {
    onFiltersChange({
      ...filters,
      severity: value === 'all' ? undefined : (value as 'critical' | 'high' | 'medium' | 'low'),
      skip: 0,
    })
  }

  const updateResolvedFilter = (value: string) => {
    onFiltersChange({
      ...filters,
      resolved: value === 'unresolved' ? false : value === 'resolved' ? true : undefined,
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
    onFiltersChange({
      limit: filters.limit || 50,
      skip: 0,
    })
  }

  const hasActiveFilters =
    (filters.testId && filters.testId.trim().length > 0) ||
    filters.severity !== undefined ||
    filters.resolved !== undefined ||
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
          <Label htmlFor="severity-filter">Severity</Label>
          <Select
            value={filters.severity || 'all'}
            onValueChange={updateSeverityFilter}
          >
            <SelectTrigger id="severity-filter">
              <SelectValue placeholder="All severities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="resolved-filter">Status</Label>
          <Select
            value={
              filters.resolved === false
                ? 'unresolved'
                : filters.resolved === true
                ? 'resolved'
                : 'all'
            }
            onValueChange={updateResolvedFilter}
          >
            <SelectTrigger id="resolved-filter">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="unresolved">Unresolved only</SelectItem>
              <SelectItem value="resolved">Resolved only</SelectItem>
            </SelectContent>
          </Select>
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


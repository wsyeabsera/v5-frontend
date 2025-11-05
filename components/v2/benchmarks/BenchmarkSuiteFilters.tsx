'use client'

import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { DateRangePicker } from '@/components/v2/shared/DateRangePicker'
import { X } from 'lucide-react'

interface BenchmarkSuiteFiltersProps {
  filters: {
    startDate?: string
    endDate?: string
    limit?: number
    skip?: number
  }
  onFiltersChange: (filters: {
    startDate?: string
    endDate?: string
    limit?: number
    skip?: number
  }) => void
}

export function BenchmarkSuiteFilters({
  filters,
  onFiltersChange,
}: BenchmarkSuiteFiltersProps) {
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
    onFiltersChange({
      limit: filters.limit || 50,
      skip: 0,
    })
  }

  const hasActiveFilters = filters.startDate !== undefined || filters.endDate !== undefined

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

      <DateRangePicker
        startDate={filters.startDate}
        endDate={filters.endDate}
        onStartDateChange={updateStartDate}
        onEndDateChange={updateEndDate}
      />
    </div>
  )
}


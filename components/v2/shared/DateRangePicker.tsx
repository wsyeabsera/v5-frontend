'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DateRangePickerProps {
  startDate?: string
  endDate?: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  className?: string
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className = '',
}: DateRangePickerProps) {
  const startDateInput = startDate ? new Date(startDate).toISOString().split('T')[0] : ''
  const endDateInput = endDate ? new Date(endDate).toISOString().split('T')[0] : ''

  const handleStartDateChange = (value: string) => {
    onStartDateChange(value ? new Date(value).toISOString() : '')
  }

  const handleEndDateChange = (value: string) => {
    onEndDateChange(value ? new Date(value).toISOString() : '')
  }

  return (
    <div className={`grid grid-cols-2 gap-4 ${className}`}>
      <div className="space-y-2">
        <Label htmlFor="start-date">Start Date</Label>
        <Input
          id="start-date"
          type="date"
          value={startDateInput}
          onChange={(e) => handleStartDateChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="end-date">End Date</Label>
        <Input
          id="end-date"
          type="date"
          value={endDateInput}
          onChange={(e) => handleEndDateChange(e.target.value)}
        />
      </div>
    </div>
  )
}


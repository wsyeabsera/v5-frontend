'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type TimeRange = '7d' | '30d' | '90d' | 'all'

interface TimeRangeSelectorProps {
  value: TimeRange
  onChange: (range: TimeRange) => void
  className?: string
}

export function TimeRangeSelector({ value, onChange, className }: TimeRangeSelectorProps) {
  const ranges: { value: TimeRange; label: string }[] = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: 'all', label: 'All Time' },
  ]

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {ranges.map((range) => (
        <Button
          key={range.value}
          variant={value === range.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(range.value)}
          className="text-xs"
        >
          {range.label}
        </Button>
      ))}
    </div>
  )
}

export function getTimeRangeDates(range: TimeRange): { startDate: Date | null; endDate: Date | null } {
  const now = new Date()
  const endDate = now

  switch (range) {
    case '7d':
      return {
        startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        endDate,
      }
    case '30d':
      return {
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate,
      }
    case '90d':
      return {
        startDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        endDate,
      }
    case 'all':
      return {
        startDate: null,
        endDate: null,
      }
    default:
      return { startDate: null, endDate: null }
  }
}

export function formatDateForAPI(date: Date | null): string | undefined {
  if (!date) return undefined
  return date.toISOString()
}


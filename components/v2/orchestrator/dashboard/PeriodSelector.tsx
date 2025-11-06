'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type Period = 'minutely' | 'hourly' | 'daily' | 'monthly'

interface PeriodSelectorProps {
  value: Period
  onChange: (period: Period) => void
  className?: string
}

export function PeriodSelector({ value, onChange, className }: PeriodSelectorProps) {
  const periods: { value: Period; label: string }[] = [
    { value: 'minutely', label: 'Minutely' },
    { value: 'hourly', label: 'Hourly' },
    { value: 'daily', label: 'Daily' },
    { value: 'monthly', label: 'Monthly' },
  ]

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {periods.map((period) => (
        <Button
          key={period.value}
          variant={value === period.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(period.value)}
          className="text-xs"
        >
          {period.label}
        </Button>
      ))}
    </div>
  )
}


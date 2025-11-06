'use client'

import { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Loader2, AlertCircle } from 'lucide-react'

interface DashboardLayoutProps {
  title: string
  description?: string
  timeRangeSelector?: ReactNode
  actions?: ReactNode
  children: ReactNode
  isLoading?: boolean
  error?: Error | null
}

export function DashboardLayout({
  title,
  description,
  timeRangeSelector,
  actions,
  children,
  isLoading,
  error,
}: DashboardLayoutProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Loading dashboard...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
        <div>
          <div className="font-semibold text-red-900 dark:text-red-100">Failed to load dashboard</div>
          <div className="text-sm text-red-700 dark:text-red-300 mt-1">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-muted-foreground mt-2">{description}</p>}
        </div>
        <div className="flex items-center gap-4">
          {timeRangeSelector && <div>{timeRangeSelector}</div>}
          {actions && <div>{actions}</div>}
        </div>
      </div>
      {children}
    </div>
  )
}


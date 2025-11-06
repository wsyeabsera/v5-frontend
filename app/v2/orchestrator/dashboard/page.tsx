'use client'

import { useState, useMemo, useEffect } from 'react'
import { usePerformanceMetrics } from '@/lib/queries-v2'
import { DashboardLayout } from '@/components/v2/orchestrator/dashboard/DashboardLayout'
import { TimeRangeSelector, TimeRange, getTimeRangeDates, formatDateForAPI } from '@/components/v2/orchestrator/dashboard/TimeRangeSelector'
import { PeriodSelector, Period } from '@/components/v2/orchestrator/dashboard/PeriodSelector'
import { DashboardStats } from '@/components/v2/orchestrator/dashboard/DashboardStats'
import { PerformanceTrendChart } from '@/components/v2/orchestrator/dashboard/PerformanceTrendChart'
import { SuccessRateChart } from '@/components/v2/orchestrator/dashboard/SuccessRateChart'
import { TokenUsageChart } from '@/components/v2/orchestrator/dashboard/TokenUsageChart'
import { ExecutionStatusChart } from '@/components/v2/orchestrator/dashboard/ExecutionStatusChart'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, BarChart3 } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('all') // Start with 'all' to see all data
  const [period, setPeriod] = useState<Period>('daily')

  // Smart period defaults based on time range
  useEffect(() => {
    switch (timeRange) {
      case '7d':
        setPeriod('hourly')
        break
      case '30d':
      case '90d':
        setPeriod('daily')
        break
      case 'all':
        setPeriod('monthly')
        break
    }
  }, [timeRange])

  const { startDate, endDate } = getTimeRangeDates(timeRange)
  const startDateStr = formatDateForAPI(startDate)
  const endDateStr = formatDateForAPI(endDate)

  // Calculate previous period for trends
  const previousRangeDates = useMemo(() => {
    if (timeRange === 'all') return { startDate: null, endDate: null }
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
    const prevEnd = startDate
    const prevStart = prevEnd ? new Date(prevEnd.getTime() - days * 24 * 60 * 60 * 1000) : null
    return { startDate: prevStart, endDate: prevEnd }
  }, [timeRange, startDate])

  // Build filters - only include date filters if they're not null
  const filters: any = { limit: 1000 }
  if (startDateStr) filters.startDate = startDateStr
  if (endDateStr) filters.endDate = endDateStr

  const { data: currentMetrics, isLoading, error, isError } = usePerformanceMetrics(filters)

  const previousStartDateStr = formatDateForAPI(previousRangeDates.startDate)
  const previousEndDateStr = formatDateForAPI(previousRangeDates.endDate)
  
  const { data: previousMetrics } = usePerformanceMetrics(
    previousStartDateStr && previousEndDateStr
      ? {
          startDate: previousStartDateStr,
          endDate: previousEndDateStr,
          limit: 1000,
        }
      : undefined
  )

  const metricsArray = Array.isArray(currentMetrics) ? currentMetrics : []
  const previousMetricsArray = Array.isArray(previousMetrics) ? previousMetrics : []

  // Show content even if loading, but show empty states for charts
  const displayError = isError ? error : null

  return (
    <div className="container mx-auto py-8 px-4 max-w-[95vw]">
      <DashboardLayout
        title="Orchestrator Dashboard"
        description="Overview of orchestrator performance metrics and trends"
        timeRangeSelector={
          <div className="flex items-center gap-4 flex-wrap">
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
            <PeriodSelector value={period} onChange={setPeriod} />
          </div>
        }
        isLoading={false}
        error={displayError}
      >
        <div className="space-y-6">
          {/* Stats Cards with Trends */}
          <DashboardStats
            currentMetrics={metricsArray}
            previousMetrics={previousMetricsArray}
            showTrends={true}
          />

          {/* Quick Links */}
          <div className="flex items-center gap-4">
            <Link href="/v2/orchestrator/analytics">
              <Button variant="outline" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                View Detailed Analytics
              </Button>
            </Link>
            <Link href="/v2/orchestrator/orchestrations">
              <Button variant="outline" className="gap-2">
                <LayoutDashboard className="w-4 h-4" />
                View Orchestrations
              </Button>
            </Link>
          </div>

          {/* Summary Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PerformanceTrendChart metrics={metricsArray} period={period} />
            <SuccessRateChart metrics={metricsArray} period={period} />
            <TokenUsageChart metrics={metricsArray} period={period} />
            <ExecutionStatusChart metrics={metricsArray} />
          </div>
        </div>
      </DashboardLayout>
    </div>
  )
}


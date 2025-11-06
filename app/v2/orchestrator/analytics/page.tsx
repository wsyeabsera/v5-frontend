'use client'

import { useState, useMemo, useEffect } from 'react'
import { usePerformanceMetrics, useOrchestrators } from '@/lib/queries-v2'
import { DashboardLayout } from '@/components/v2/orchestrator/dashboard/DashboardLayout'
import { TimeRangeSelector, TimeRange, getTimeRangeDates, formatDateForAPI } from '@/components/v2/orchestrator/dashboard/TimeRangeSelector'
import { PeriodSelector, Period } from '@/components/v2/orchestrator/dashboard/PeriodSelector'
import { PerformanceTrendChart } from '@/components/v2/orchestrator/dashboard/PerformanceTrendChart'
import { SuccessRateChart } from '@/components/v2/orchestrator/dashboard/SuccessRateChart'
import { TokenUsageChart } from '@/components/v2/orchestrator/dashboard/TokenUsageChart'
import { CostTrendChart } from '@/components/v2/orchestrator/dashboard/CostTrendChart'
import { QualityMetricsChart } from '@/components/v2/orchestrator/dashboard/QualityMetricsChart'
import { ConfidenceTrendChart } from '@/components/v2/orchestrator/dashboard/ConfidenceTrendChart'
import { ExecutionStatusChart } from '@/components/v2/orchestrator/dashboard/ExecutionStatusChart'
import { PhaseLatencyBreakdown } from '@/components/v2/orchestrator/dashboard/PhaseLatencyBreakdown'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('all') // Start with 'all' to see all data
  const [orchestratorFilter, setOrchestratorFilter] = useState<string>('all')
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

  // Build filters - only include date filters if they're not null
  const filters: any = { limit: 1000 }
  if (startDateStr) filters.startDate = startDateStr
  if (endDateStr) filters.endDate = endDateStr

  if (orchestratorFilter && orchestratorFilter !== 'all') {
    filters.orchestratorId = orchestratorFilter
  }

  const { data: metrics, isLoading, error, isError } = usePerformanceMetrics(filters)
  const { data: orchestrators } = useOrchestrators()

  const metricsArray = Array.isArray(metrics) ? metrics : []
  const orchestratorList = Array.isArray(orchestrators) ? orchestrators : []
  
  const displayError = isError ? error : null

  return (
    <div className="container mx-auto py-8 px-4 max-w-[95vw]">
      <DashboardLayout
        title="Performance Analytics"
        description="Detailed analytics and trends for orchestrator performance metrics"
        timeRangeSelector={
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label htmlFor="orchestrator-filter">Orchestrator:</Label>
              <Select value={orchestratorFilter} onValueChange={setOrchestratorFilter}>
                <SelectTrigger id="orchestrator-filter" className="w-[200px]">
                  <SelectValue placeholder="All orchestrators" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {orchestratorList.map((orch: any) => (
                    <SelectItem key={orch._id} value={orch._id}>
                      {orch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
            <PeriodSelector value={period} onChange={setPeriod} />
          </div>
        }
        isLoading={false}
        error={displayError}
      >
        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="quality">Quality</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PerformanceTrendChart metrics={metricsArray} period={period} />
              <SuccessRateChart metrics={metricsArray} period={period} />
              <PhaseLatencyBreakdown metrics={metricsArray} />
              <ExecutionStatusChart metrics={metricsArray} />
            </div>
          </TabsContent>

          <TabsContent value="resources" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TokenUsageChart metrics={metricsArray} period={period} />
              <CostTrendChart metrics={metricsArray} period={period} />
            </div>
          </TabsContent>

          <TabsContent value="quality" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <QualityMetricsChart metrics={metricsArray} period={period} />
              <ConfidenceTrendChart metrics={metricsArray} period={period} />
            </div>
          </TabsContent>
        </Tabs>
      </DashboardLayout>
    </div>
  )
}


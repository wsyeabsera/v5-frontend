# Phase 3: Test Analytics Dashboard

## Overview

Build a comprehensive analytics dashboard for test execution trends, success rates, performance metrics over time, and user input statistics.

## Page: `app/v2/orchestrator/testing/analytics/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { AnalyticsDashboard } from '@/components/v2/orchestrator/testing/analytics/AnalyticsDashboard'
import { TimeRangeSelector, TimeRange } from '@/components/v2/orchestrator/dashboard/TimeRangeSelector'
import { BarChart3 } from 'lucide-react'
import { DashboardLayout } from '@/components/v2/orchestrator/dashboard/DashboardLayout'

export default function TestAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')

  return (
    <div className="container mx-auto py-8 px-4 max-w-[95vw]">
      <DashboardLayout
        title="Test Analytics"
        description="Analyze test execution trends, success rates, performance metrics, and user input statistics over time."
        timeRangeSelector={
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        }
      >
        <AnalyticsDashboard timeRange={timeRange} />
      </DashboardLayout>
    </div>
  )
}
```

## Component: `components/v2/orchestrator/testing/analytics/AnalyticsDashboard.tsx`

```typescript
'use client'

import { ExecutionTrends } from './ExecutionTrends'
import { SuccessRateChart } from './SuccessRateChart'
import { PerformanceMetrics } from './PerformanceMetrics'
import { UserInputStats } from './UserInputStats'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TimeRange } from '@/components/v2/orchestrator/dashboard/TimeRangeSelector'
import { useTestAnalytics } from '@/lib/queries-v2'
import { Loader2 } from 'lucide-react'

interface AnalyticsDashboardProps {
  timeRange: TimeRange
}

export function AnalyticsDashboard({ timeRange }: AnalyticsDashboardProps) {
  const { data: analytics, isLoading, error } = useTestAnalytics(timeRange)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-red-600">Error loading analytics: {error.message}</div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Executions</div>
          <div className="text-2xl font-bold">{analytics?.data?.totalExecutions || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Success Rate</div>
          <div className="text-2xl font-bold text-green-600">
            {analytics?.data?.overallSuccessRate?.toFixed(1) || 0}%
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Avg Latency</div>
          <div className="text-2xl font-bold">
            {Math.round(analytics?.data?.averageLatency || 0)}ms
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">User Inputs Provided</div>
          <div className="text-2xl font-bold">
            {analytics?.data?.totalUserInputsProvided || 0}
          </div>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-6">
          <TabsTrigger value="trends">Execution Trends</TabsTrigger>
          <TabsTrigger value="success">Success Rates</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="inputs">User Inputs</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-6">
          <ExecutionTrends timeRange={timeRange} />
        </TabsContent>

        <TabsContent value="success" className="space-y-6">
          <SuccessRateChart timeRange={timeRange} />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <PerformanceMetrics timeRange={timeRange} />
        </TabsContent>

        <TabsContent value="inputs" className="space-y-6">
          <UserInputStats timeRange={timeRange} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

## Component: `components/v2/orchestrator/testing/analytics/ExecutionTrends.tsx`

```typescript
'use client'

import { Card } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useTestExecutionTrends } from '@/lib/queries-v2'
import { TimeRange } from '@/components/v2/orchestrator/dashboard/TimeRangeSelector'
import { Loader2 } from 'lucide-react'

interface ExecutionTrendsProps {
  timeRange: TimeRange
}

export function ExecutionTrends({ timeRange }: ExecutionTrendsProps) {
  const { data: trends, isLoading } = useTestExecutionTrends(timeRange)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  const chartData = trends?.data?.map((point) => ({
    date: new Date(point.date).toLocaleDateString(),
    total: point.total,
    passed: point.passed,
    failed: point.failed,
  })) || []

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold mb-4">Execution Trends Over Time</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="total" stroke="#8884d8" name="Total Executions" />
          <Line type="monotone" dataKey="passed" stroke="#82ca9d" name="Passed" />
          <Line type="monotone" dataKey="failed" stroke="#ff7300" name="Failed" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
```

## Component: `components/v2/orchestrator/testing/analytics/SuccessRateChart.tsx`

```typescript
'use client'

import { Card } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useSuccessRateAnalytics } from '@/lib/queries-v2'
import { TimeRange } from '@/components/v2/orchestrator/dashboard/TimeRangeSelector'
import { Loader2 } from 'lucide-react'

interface SuccessRateChartProps {
  timeRange: TimeRange
}

export function SuccessRateChart({ timeRange }: SuccessRateChartProps) {
  const { data: analytics, isLoading } = useSuccessRateAnalytics(timeRange)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  const chartData = analytics?.data?.map((point) => ({
    date: new Date(point.date).toLocaleDateString(),
    successRate: point.successRate,
  })) || []

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold mb-4">Success Rate Over Time</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Legend />
          <Bar dataKey="successRate" fill="#82ca9d" name="Success Rate (%)" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
```

## Component: `components/v2/orchestrator/testing/analytics/PerformanceMetrics.tsx`

```typescript
'use client'

import { Card } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { usePerformanceAnalytics } from '@/lib/queries-v2'
import { TimeRange } from '@/components/v2/orchestrator/dashboard/TimeRangeSelector'
import { Loader2 } from 'lucide-react'

interface PerformanceMetricsProps {
  timeRange: TimeRange
}

export function PerformanceMetrics({ timeRange }: PerformanceMetricsProps) {
  const { data: metrics, isLoading } = usePerformanceAnalytics(timeRange)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  const chartData = metrics?.data?.map((point) => ({
    date: new Date(point.date).toLocaleDateString(),
    avgLatency: point.averageLatency,
    p95Latency: point.p95Latency,
    p99Latency: point.p99Latency,
  })) || []

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold mb-4">Performance Metrics Over Time</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="avgLatency" stroke="#8884d8" name="Avg Latency (ms)" />
          <Line type="monotone" dataKey="p95Latency" stroke="#82ca9d" name="P95 Latency (ms)" />
          <Line type="monotone" dataKey="p99Latency" stroke="#ff7300" name="P99 Latency (ms)" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
```

## Component: `components/v2/orchestrator/testing/analytics/UserInputStats.tsx`

```typescript
'use client'

import { Card } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useUserInputAnalytics } from '@/lib/queries-v2'
import { TimeRange } from '@/components/v2/orchestrator/dashboard/TimeRangeSelector'
import { Loader2 } from 'lucide-react'

interface UserInputStatsProps {
  timeRange: TimeRange
}

export function UserInputStats({ timeRange }: UserInputStatsProps) {
  const { data: stats, isLoading } = useUserInputAnalytics(timeRange)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  const chartData = stats?.data?.map((point) => ({
    date: new Date(point.date).toLocaleDateString(),
    provided: point.inputsProvided,
    required: point.inputsRequired,
    coverage: point.coverageRate,
  })) || []

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4">User Input Statistics</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="provided" fill="#8884d8" name="Inputs Provided" />
            <Bar dataKey="required" fill="#82ca9d" name="Inputs Required" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4">Input Coverage Rate</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="coverage" fill="#ff7300" name="Coverage Rate (%)" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
```

## API Integration

### Extend `lib/mcp-client-orchestrator.ts`

```typescript
async getPerformanceReport(orchestratorId: string, dateRange?: {
  startDate?: string
  endDate?: string
}) {
  return this.callTool('get_performance_report', {
    orchestratorId,
    startDate: dateRange?.startDate,
    endDate: dateRange?.endDate,
    format: 'detailed',
    stream: false,
  })
}

async getPerformanceTrends(filters?: {
  orchestratorId?: string
  metricType?: 'successRate' | 'latency' | 'confidence' | 'quality' | 'cost'
  startDate?: string
  endDate?: string
}) {
  return this.callTool('analyze_performance_trends', { ...filters, stream: false })
}
```

### Extend `lib/queries-v2.ts`

```typescript
export function useTestAnalytics(timeRange: TimeRange) {
  const dateRange = getDateRangeFromTimeRange(timeRange)
  return useQuery({
    queryKey: ['test-analytics', timeRange],
    queryFn: () => {
      // Aggregate test run data for analytics
      return mcpClient.listTestRuns({
        startDate: dateRange.start,
        endDate: dateRange.end,
        limit: 1000,
      })
    },
  })
}

export function useTestExecutionTrends(timeRange: TimeRange) {
  const dateRange = getDateRangeFromTimeRange(timeRange)
  return useQuery({
    queryKey: ['test-execution-trends', timeRange],
    queryFn: async () => {
      const runs = await mcpClient.listTestRuns({
        startDate: dateRange.start,
        endDate: dateRange.end,
        limit: 1000,
      })
      // Process and group by date
      return processTrendsData(runs.data || [])
    },
  })
}

export function useSuccessRateAnalytics(timeRange: TimeRange) {
  const dateRange = getDateRangeFromTimeRange(timeRange)
  return useQuery({
    queryKey: ['success-rate-analytics', timeRange],
    queryFn: async () => {
      const runs = await mcpClient.listTestRuns({
        startDate: dateRange.start,
        endDate: dateRange.end,
        limit: 1000,
      })
      return processSuccessRateData(runs.data || [])
    },
  })
}

export function usePerformanceAnalytics(timeRange: TimeRange) {
  const dateRange = getDateRangeFromTimeRange(timeRange)
  return useQuery({
    queryKey: ['performance-analytics', timeRange],
    queryFn: async () => {
      const runs = await mcpClient.listTestRuns({
        startDate: dateRange.start,
        endDate: dateRange.end,
        limit: 1000,
      })
      return processPerformanceData(runs.data || [])
    },
  })
}

export function useUserInputAnalytics(timeRange: TimeRange) {
  const dateRange = getDateRangeFromTimeRange(timeRange)
  return useQuery({
    queryKey: ['user-input-analytics', timeRange],
    queryFn: async () => {
      const runs = await mcpClient.listTestRuns({
        startDate: dateRange.start,
        endDate: dateRange.end,
        limit: 1000,
      })
      return processUserInputData(runs.data || [])
    },
  })
}

// Helper functions
function getDateRangeFromTimeRange(timeRange: TimeRange): { start: string; end: string } {
  const end = new Date()
  const start = new Date()
  
  switch (timeRange) {
    case '7d':
      start.setDate(start.getDate() - 7)
      break
    case '30d':
      start.setDate(start.getDate() - 30)
      break
    case '90d':
      start.setDate(start.getDate() - 90)
      break
    default:
      start.setDate(start.getDate() - 30)
  }
  
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

function processTrendsData(runs: any[]) {
  // Group runs by date and calculate totals
  // Implementation details...
  return { data: [] }
}

function processSuccessRateData(runs: any[]) {
  // Calculate success rates over time
  // Implementation details...
  return { data: [] }
}

function processPerformanceData(runs: any[]) {
  // Calculate performance metrics over time
  // Implementation details...
  return { data: [] }
}

function processUserInputData(runs: any[]) {
  // Calculate user input statistics
  // Implementation details...
  return { data: [] }
}
```

## Implementation Steps

1. Create page component at `app/v2/orchestrator/testing/analytics/page.tsx`
2. Create component directory `components/v2/orchestrator/testing/analytics/`
3. Implement `AnalyticsDashboard` with tabs
4. Implement `ExecutionTrends` chart
5. Implement `SuccessRateChart` chart
6. Implement `PerformanceMetrics` chart
7. Implement `UserInputStats` charts
8. Add helper functions for data processing
9. Extend `MCPClientOrchestrator` with analytics methods
10. Add query hooks to `queries-v2.ts`
11. Test time range filtering
12. Test chart rendering
13. Test data aggregation

## Success Criteria

- ✅ View execution trends over time
- ✅ View success rate analytics
- ✅ View performance metrics (latency, P95, P99)
- ✅ View user input statistics
- ✅ Filter by time range
- ✅ Interactive charts with tooltips
- ✅ Summary statistics cards
- ✅ Responsive design


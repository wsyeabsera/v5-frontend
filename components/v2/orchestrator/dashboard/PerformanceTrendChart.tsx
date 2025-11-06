'use client'

import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/card'
import { Period } from './PeriodSelector'
import { groupByPeriod, aggregateLatency, formatPeriodLabel } from './utils/aggregateMetrics'

interface PerformanceTrendChartProps {
  metrics: any[]
  period?: Period
}

export function PerformanceTrendChart({ metrics, period = 'daily' }: PerformanceTrendChartProps) {
  const chartData = useMemo(() => {
    const filtered = metrics.filter((m: any) => m.timestamp && m.execution?.latency)
    if (filtered.length === 0) return []

    const grouped = groupByPeriod(filtered, period)
    const aggregated: any[] = []

    for (const [key, periodMetrics] of Array.from(grouped.entries())) {
      const latency = aggregateLatency(periodMetrics)
      const firstMetric = periodMetrics[0]
      const date = new Date(firstMetric.timestamp)

      aggregated.push({
        date: formatPeriodLabel(date, period),
        timestamp: date.getTime(),
        key,
        ...latency,
      })
    }

    return aggregated.sort((a: any, b: any) => a.timestamp - b.timestamp).slice(-100)
  }, [metrics, period])

  if (chartData.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground py-8">
          No latency data available
        </div>
      </Card>
    )
  }

  const formatLatency = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}s`
    }
    return `${Math.round(value)}ms`
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Latency Trends</h3>
        <p className="text-sm text-muted-foreground">Execution latency by phase over time</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            className="text-xs"
            tick={{ fill: 'currentColor' }}
            stroke="currentColor"
          />
          <YAxis
            className="text-xs"
            tick={{ fill: 'currentColor' }}
            stroke="currentColor"
            tickFormatter={formatLatency}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
            }}
            formatter={(value: number) => formatLatency(value)}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="total"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            name="Total"
          />
          <Line
            type="monotone"
            dataKey="thought"
            stroke="#3b82f6"
            strokeWidth={1.5}
            dot={false}
            name="Thought"
          />
          <Line
            type="monotone"
            dataKey="plan"
            stroke="#8b5cf6"
            strokeWidth={1.5}
            dot={false}
            name="Plan"
          />
          <Line
            type="monotone"
            dataKey="execution"
            stroke="#10b981"
            strokeWidth={1.5}
            dot={false}
            name="Execution"
          />
          <Line
            type="monotone"
            dataKey="summary"
            stroke="#f59e0b"
            strokeWidth={1.5}
            dot={false}
            name="Summary"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}


'use client'

import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/card'
import { Period } from './PeriodSelector'
import { groupByPeriod, aggregateQuality, formatPeriodLabel } from './utils/aggregateMetrics'

interface QualityMetricsChartProps {
  metrics: any[]
  period?: Period
}

export function QualityMetricsChart({ metrics, period = 'daily' }: QualityMetricsChartProps) {
  const chartData = useMemo(() => {
    const filtered = metrics.filter((m: any) => m.timestamp && m.quality)
    if (filtered.length === 0) return []

    const grouped = groupByPeriod(filtered, period)
    const aggregated: any[] = []

    for (const [key, periodMetrics] of Array.from(grouped.entries())) {
      const quality = aggregateQuality(periodMetrics)
      const firstMetric = periodMetrics[0]
      const date = new Date(firstMetric.timestamp)

      aggregated.push({
        date: formatPeriodLabel(date, period),
        timestamp: date.getTime(),
        key,
        ...quality,
      })
    }

    return aggregated.sort((a: any, b: any) => a.timestamp - b.timestamp).slice(-100)
  }, [metrics, period])

  if (chartData.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground py-8">
          No quality metrics data available
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Quality Metrics Trends</h3>
        <p className="text-sm text-muted-foreground">Completeness, relevance, and accuracy scores</p>
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
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
            }}
            formatter={(value: number) => [`${value}%`, 'Score']}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="completeness"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="Completeness"
          />
          <Line
            type="monotone"
            dataKey="relevance"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            name="Relevance"
          />
          <Line
            type="monotone"
            dataKey="accuracy"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            name="Accuracy"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}


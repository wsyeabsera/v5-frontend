'use client'

import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/card'
import { Period } from './PeriodSelector'
import { groupByPeriod, aggregateConfidence, formatPeriodLabel } from './utils/aggregateMetrics'

interface ConfidenceTrendChartProps {
  metrics: any[]
  period?: Period
}

export function ConfidenceTrendChart({ metrics, period = 'daily' }: ConfidenceTrendChartProps) {
  const chartData = useMemo(() => {
    const filtered = metrics.filter((m: any) => m.timestamp && m.confidence)
    if (filtered.length === 0) return []

    const grouped = groupByPeriod(filtered, period)
    const aggregated: any[] = []

    for (const [key, periodMetrics] of grouped.entries()) {
      const confidence = aggregateConfidence(periodMetrics)
      const firstMetric = periodMetrics[0]
      const date = new Date(firstMetric.timestamp)

      aggregated.push({
        date: formatPeriodLabel(date, period),
        timestamp: date.getTime(),
        key,
        ...confidence,
      })
    }

    return aggregated.sort((a: any, b: any) => a.timestamp - b.timestamp).slice(-100)
  }, [metrics, period])

  if (chartData.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground py-8">
          No confidence data available
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Confidence Trends</h3>
        <p className="text-sm text-muted-foreground">Confidence scores by phase over time</p>
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
            formatter={(value: number) => [`${value}%`, 'Confidence']}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="overall"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            name="Overall"
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


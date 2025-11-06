'use client'

import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { Card } from '@/components/ui/card'
import { Period } from './PeriodSelector'
import { groupByPeriod, aggregateSuccessRate, formatPeriodLabel } from './utils/aggregateMetrics'

interface SuccessRateChartProps {
  metrics: any[]
  period?: Period
}

export function SuccessRateChart({ metrics, period = 'daily' }: SuccessRateChartProps) {
  const chartData = useMemo(() => {
    const filtered = metrics.filter((m: any) => m.timestamp && m.execution?.status)
    if (filtered.length === 0) return []

    const grouped = groupByPeriod(filtered, period)
    const aggregated: any[] = []

    for (const [key, periodMetrics] of grouped.entries()) {
      const { success, total, successRate } = aggregateSuccessRate(periodMetrics)
      const firstMetric = periodMetrics[0]
      const date = new Date(firstMetric.timestamp)

      aggregated.push({
        date: formatPeriodLabel(date, period),
        timestamp: date.getTime(),
        key,
        success,
        total,
        successRate,
      })
    }

    return aggregated.sort((a: any, b: any) => a.timestamp - b.timestamp).slice(-100)
  }, [metrics, period])

  if (chartData.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground py-8">
          No success rate data available
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Success Rate Trend</h3>
        <p className="text-sm text-muted-foreground">Success rate percentage over time</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            formatter={(value: number) => [`${value}%`, 'Success Rate']}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="successRate"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#colorSuccess)"
            name="Success Rate"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}


'use client'

import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts'
import { Card } from '@/components/ui/card'
import { Period } from './PeriodSelector'
import { groupByPeriod, aggregateTokens, formatPeriodLabel } from './utils/aggregateMetrics'

interface TokenUsageChartProps {
  metrics: any[]
  period?: Period
}

export function TokenUsageChart({ metrics, period = 'daily' }: TokenUsageChartProps) {
  const chartData = useMemo(() => {
    const filtered = metrics.filter((m: any) => m.timestamp && m.resources?.tokenUsage)
    if (filtered.length === 0) return []

    const grouped = groupByPeriod(filtered, period)
    const aggregated: any[] = []

    for (const [key, periodMetrics] of Array.from(grouped.entries())) {
      const tokens = aggregateTokens(periodMetrics)
      const firstMetric = periodMetrics[0]
      const date = new Date(firstMetric.timestamp)

      aggregated.push({
        date: formatPeriodLabel(date, period),
        timestamp: date.getTime(),
        key,
        ...tokens,
      })
    }

    return aggregated.sort((a: any, b: any) => a.timestamp - b.timestamp).slice(-100)
  }, [metrics, period])

  if (chartData.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground py-8">
          No token usage data available
        </div>
      </Card>
    )
  }

  const formatTokens = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toLocaleString()
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Token Usage Trends</h3>
        <p className="text-sm text-muted-foreground">Input, output, and total token consumption</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData}>
          <defs>
            <linearGradient id="colorInput" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
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
            tickFormatter={formatTokens}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
            }}
            formatter={(value: number) => formatTokens(value)}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="input"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#colorInput)"
            name="Input Tokens"
            stackId="1"
          />
          <Area
            type="monotone"
            dataKey="output"
            stroke="#8b5cf6"
            strokeWidth={2}
            fill="url(#colorOutput)"
            name="Output Tokens"
            stackId="1"
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            name="Total"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  )
}


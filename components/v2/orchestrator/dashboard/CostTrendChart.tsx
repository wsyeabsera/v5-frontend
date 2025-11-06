'use client'

import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp } from 'lucide-react'
import { Period } from './PeriodSelector'
import { groupByPeriod, aggregateCost, formatPeriodLabel } from './utils/aggregateMetrics'

interface CostTrendChartProps {
  metrics: any[]
  period?: Period
}

export function CostTrendChart({ metrics, period = 'daily' }: CostTrendChartProps) {
  const [cumulative, setCumulative] = useState(false)

  const chartData = useMemo(() => {
    const filtered = metrics.filter((m: any) => m.timestamp && m.resources?.cost !== undefined)
    if (filtered.length === 0) return []

    const grouped = groupByPeriod(filtered, period)
    const aggregated: any[] = []

    for (const [key, periodMetrics] of grouped.entries()) {
      const cost = aggregateCost(periodMetrics)
      const firstMetric = periodMetrics[0]
      const date = new Date(firstMetric.timestamp)

      aggregated.push({
        date: formatPeriodLabel(date, period),
        timestamp: date.getTime(),
        key,
        cost,
      })
    }

    const sorted = aggregated.sort((a: any, b: any) => a.timestamp - b.timestamp).slice(-100)

    if (cumulative) {
      let runningTotal = 0
      return sorted.map((item: any) => {
        runningTotal += item.cost
        return {
          ...item,
          cost: runningTotal,
        }
      })
    }

    return sorted
  }, [metrics, period, cumulative])

  if (chartData.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground py-8">
          No cost data available
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Cost Trends</h3>
          <p className="text-sm text-muted-foreground">
            {cumulative ? 'Cumulative cost over time' : 'Cost per execution over time'}
          </p>
        </div>
        <Button
          variant={cumulative ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCumulative(!cumulative)}
          className="gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          {cumulative ? 'Cumulative' : 'Per Execution'}
        </Button>
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
            tickFormatter={(value) => `$${value.toFixed(4)}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
            }}
            formatter={(value: number) => [`$${value.toFixed(4)}`, 'Cost']}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="cost"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            name={cumulative ? 'Cumulative Cost' : 'Cost'}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}


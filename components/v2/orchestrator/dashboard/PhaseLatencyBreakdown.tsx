'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/card'

interface PhaseLatencyBreakdownProps {
  metrics: any[]
  limit?: number
}

export function PhaseLatencyBreakdown({ metrics, limit = 20 }: PhaseLatencyBreakdownProps) {
  const chartData = useMemo(() => {
    return metrics
      .filter((m: any) => m.execution?.latency)
      .map((m: any, index: number) => {
        const date = new Date(m.timestamp || Date.now())
        return {
          id: `Exec ${index + 1}`,
          date: date.toLocaleDateString(),
          thought: m.execution?.latency?.thought || 0,
          plan: m.execution?.latency?.plan || 0,
          execution: m.execution?.latency?.execution || 0,
          summary: m.execution?.latency?.summary || 0,
        }
      })
      .slice(-limit)
  }, [metrics, limit])

  if (chartData.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground py-8">
          No latency breakdown data available
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
        <h3 className="text-lg font-semibold">Phase Latency Breakdown</h3>
        <p className="text-sm text-muted-foreground">Latency by phase for recent executions</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="id"
            className="text-xs"
            tick={{ fill: 'currentColor' }}
            stroke="currentColor"
            angle={-45}
            textAnchor="end"
            height={80}
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
          <Bar dataKey="thought" stackId="a" fill="#3b82f6" name="Thought" />
          <Bar dataKey="plan" stackId="a" fill="#8b5cf6" name="Plan" />
          <Bar dataKey="execution" stackId="a" fill="#10b981" name="Execution" />
          <Bar dataKey="summary" stackId="a" fill="#f59e0b" name="Summary" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}


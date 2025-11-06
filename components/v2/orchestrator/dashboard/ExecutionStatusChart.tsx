'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Card } from '@/components/ui/card'

interface ExecutionStatusChartProps {
  metrics: any[]
}

const COLORS = {
  success: '#10b981',
  failure: '#ef4444',
  timeout: '#f59e0b',
  error: '#dc2626',
}

export function ExecutionStatusChart({ metrics }: ExecutionStatusChartProps) {
  const chartData = useMemo(() => {
    const statusCounts = metrics.reduce((acc: any, m: any) => {
      const status = m.execution?.status || 'unknown'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})

    return Object.entries(statusCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }))
  }, [metrics])

  if (chartData.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground py-8">
          No execution status data available
        </div>
      </Card>
    )
  }

  const getColor = (name: string) => {
    const lower = name.toLowerCase()
    return COLORS[lower as keyof typeof COLORS] || '#6b7280'
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Execution Status Distribution</h3>
        <p className="text-sm text-muted-foreground">Breakdown of execution outcomes</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
            }}
            formatter={(value: number) => [value, 'Executions']}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  )
}


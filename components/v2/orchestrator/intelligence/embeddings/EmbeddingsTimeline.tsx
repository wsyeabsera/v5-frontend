'use client'

import { useEmbeddingsTimeline } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { useMemo } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export function EmbeddingsTimeline() {
  const { data: timelineData, isLoading } = useEmbeddingsTimeline()

  const chartData = useMemo(() => {
    if (!timelineData?.timeline || !Array.isArray(timelineData.timeline)) {
      return []
    }

    // Format dates for display
    return timelineData.timeline.map((entry: any) => {
      const date = new Date(entry.date)
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: entry.date,
        embeddings: entry.embeddings || 0,
        cumulative: entry.cumulative || 0,
      }
    })
  }, [timelineData])

  if (isLoading) {
    return (
      <Card className="p-12">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </Card>
    )
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Embedding Generation Over Time</h3>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          No timeline data available
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Daily Embeddings Chart */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Daily Embedding Generation</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: 'currentColor' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis className="text-xs" tick={{ fill: 'currentColor' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="embeddings"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.3}
              name="Embeddings Generated"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Cumulative Embeddings Chart */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Cumulative Embeddings</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: 'currentColor' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis className="text-xs" tick={{ fill: 'currentColor' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="#10b981"
              strokeWidth={2}
              name="Total Embeddings"
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}


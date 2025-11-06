'use client'

import { useMemo } from 'react'
import { usePerformanceComparison, useIntelligenceComparison } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export function PerformanceComparison() {
  const { data: performance, isLoading } = usePerformanceComparison()
  const { data: comparison } = useIntelligenceComparison()

  // Process performance metrics for trends chart
  const trendsData = useMemo(() => {
    if (!performance || !Array.isArray(performance) || performance.length === 0) {
      return []
    }

    // Group metrics by date and calculate averages
    const groupedByDate = new Map<string, any[]>()
    
    performance.forEach((metric: any) => {
      if (!metric.timestamp) return
      
      const date = new Date(metric.timestamp)
      const dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      
      if (!groupedByDate.has(dateKey)) {
        groupedByDate.set(dateKey, [])
      }
      groupedByDate.get(dateKey)!.push(metric)
    })

    const aggregated = Array.from(groupedByDate.entries())
      .map(([date, metrics]) => {
        const withIntel = metrics.filter((m: any) => m.confidence?.overall || m.quality?.outputCompleteness)
        const withoutIntel = metrics.filter((m: any) => !m.confidence?.overall && !m.quality?.outputCompleteness)

        const calcAvg = (items: any[], key: string) => {
          const values = items
            .map((m: any) => {
              if (key === 'latency') return m.execution?.latency?.total
              if (key === 'successRate') {
                const success = items.filter((item: any) => item.execution?.status === 'success').length
                return (success / items.length) * 100
              }
              if (key === 'quality') return m.quality?.outputCompleteness
              if (key === 'confidence') return m.confidence?.overall
              return 0
            })
            .filter((v: any) => v !== undefined && v !== null)
          
          return values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0
        }

        return {
          date,
          withIntelLatency: calcAvg(withIntel, 'latency'),
          withoutIntelLatency: calcAvg(withoutIntel, 'latency'),
          withIntelSuccessRate: calcAvg(withIntel, 'successRate'),
          withoutIntelSuccessRate: calcAvg(withoutIntel, 'successRate'),
          withIntelQuality: calcAvg(withIntel, 'quality'),
          withoutIntelQuality: calcAvg(withoutIntel, 'quality'),
        }
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30) // Last 30 data points

    return aggregated
  }, [performance])

  // Prepare comparison data for bar chart
  const comparisonData = useMemo(() => {
    if (!comparison) {
      return []
    }

    return [
      {
        metric: 'Success Rate',
        withIntel: comparison.withIntelligence.successRate,
        withoutIntel: comparison.withoutIntelligence.successRate,
      },
      {
        metric: 'Confidence',
        withIntel: comparison.withIntelligence.avgConfidence,
        withoutIntel: comparison.withoutIntelligence.avgConfidence,
      },
      {
        metric: 'Quality',
        withIntel: comparison.withIntelligence.avgQuality,
        withoutIntel: comparison.withoutIntelligence.avgQuality,
      },
      {
        metric: 'Latency (ms)',
        withIntel: comparison.withIntelligence.avgLatency,
        withoutIntel: comparison.withoutIntelligence.avgLatency,
      },
    ]
  }, [comparison])

  if (isLoading) {
    return (
      <Card className="p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Performance Trends Chart */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Performance Trends</h3>
          <p className="text-sm text-muted-foreground">Latency and success rate over time</p>
        </div>
        {trendsData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No performance data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendsData}>
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
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="withIntelLatency"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                name="With Intel - Latency (ms)"
              />
              <Line
                type="monotone"
                dataKey="withoutIntelLatency"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name="Without Intel - Latency (ms)"
              />
              <Line
                type="monotone"
                dataKey="withIntelSuccessRate"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="With Intel - Success Rate (%)"
              />
              <Line
                type="monotone"
                dataKey="withoutIntelSuccessRate"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name="Without Intel - Success Rate (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Metric Comparison Chart */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Metric Comparison</h3>
          <p className="text-sm text-muted-foreground">Side-by-side comparison of key metrics</p>
        </div>
        {comparisonData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No comparison data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="metric"
                className="text-xs"
                tick={{ fill: 'currentColor' }}
                stroke="currentColor"
              />
              <YAxis
                className="text-xs"
                tick={{ fill: 'currentColor' }}
                stroke="currentColor"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number, name: string) => {
                  if (name === 'withIntel' || name === 'withoutIntel') {
                    if (value > 1000) {
                      return [`${(value / 1000).toFixed(1)}s`, name === 'withIntel' ? 'With Intelligence' : 'Without Intelligence']
                    }
                    if (name.includes('Latency')) {
                      return [`${value.toFixed(0)}ms`, name === 'withIntel' ? 'With Intelligence' : 'Without Intelligence']
                    }
                    return [`${value.toFixed(1)}${name.includes('Rate') || name.includes('Confidence') || name.includes('Quality') ? '%' : ''}`, name === 'withIntel' ? 'With Intelligence' : 'Without Intelligence']
                  }
                  return [value, name]
                }}
              />
              <Legend />
              <Bar dataKey="withIntel" fill="#10b981" name="With Intelligence" />
              <Bar dataKey="withoutIntel" fill="#ef4444" name="Without Intelligence" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  )
}


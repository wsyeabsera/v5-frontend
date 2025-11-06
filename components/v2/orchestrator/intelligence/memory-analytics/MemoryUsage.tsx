'use client'

import { useMemo } from 'react'
import { useMemoryUsage } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const COLORS = {
  success: '#10b981',
  pattern: '#3b82f6',
  insight: '#8b5cf6',
  warning: '#f59e0b',
  unknown: '#6b7280',
}

export function MemoryUsage() {
  const { data: usage, isLoading } = useMemoryUsage()

  // Process usage patterns by category
  const usageByCategory = useMemo(() => {
    if (!usage || !usage.usagePatterns || usage.usagePatterns.length === 0) {
      return []
    }

    const categoryMap = new Map<string, number>()
    
    usage.usagePatterns.forEach((pattern: any) => {
      const category = pattern.category || 'unknown'
      const current = categoryMap.get(category) || 0
      categoryMap.set(category, current + (pattern.usageCount || 0))
    })

    return Array.from(categoryMap.entries())
      .map(([category, totalUsage]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        usage: totalUsage,
        color: COLORS[category as keyof typeof COLORS] || COLORS.unknown,
      }))
      .sort((a, b) => b.usage - a.usage)
  }, [usage?.usagePatterns])

  // Process retrieval trends (top memories by usage)
  const retrievalTrends = useMemo(() => {
    if (!usage || !usage.retrievalTrends || usage.retrievalTrends.length === 0) {
      return []
    }

    return usage.retrievalTrends
      .slice(0, 10) // Top 10 most used memories
      .map((trend: any, index: number) => ({
        name: `Memory ${index + 1}`,
        usage: trend.usageCount || 0,
        category: trend.category || 'unknown',
      }))
  }, [usage?.retrievalTrends])

  if (isLoading) {
    return (
      <Card className="p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
      </Card>
    )
  }

  if (!usage) {
    return (
      <Card className="p-12">
        <div className="text-center text-muted-foreground">
          No usage data available
        </div>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Usage Patterns Chart */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Usage Patterns</h3>
          <p className="text-sm text-muted-foreground">Memory usage count by category</p>
        </div>
        {usageByCategory.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No usage data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={usageByCategory}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="category"
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
                formatter={(value: number) => [value, 'Usage Count']}
              />
              <Legend />
              <Bar dataKey="usage" fill="hsl(var(--primary))" name="Usage Count" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Retrieval Trends Chart */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Retrieval Trends</h3>
          <p className="text-sm text-muted-foreground">Top memories by retrieval frequency</p>
        </div>
        {retrievalTrends.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No retrieval data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={retrievalTrends}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
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
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [value, 'Retrieval Count']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="usage"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                name="Retrieval Count"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  )
}


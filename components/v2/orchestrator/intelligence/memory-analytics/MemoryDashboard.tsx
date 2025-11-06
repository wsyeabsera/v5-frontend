'use client'

import { useMemo } from 'react'
import { useMemoryAnalytics, useMemoryList } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
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

export function MemoryDashboard() {
  const { data: analytics, isLoading } = useMemoryAnalytics()
  const { data: memoryData, isLoading: memoryLoading } = useMemoryList()

  // Process category breakdown for pie chart
  const distributionData = useMemo(() => {
    if (!analytics?.categoryBreakdown || Object.keys(analytics.categoryBreakdown).length === 0) {
      return []
    }

    return Object.entries(analytics.categoryBreakdown).map(([category, count]: [string, any]) => ({
      name: category.charAt(0).toUpperCase() + category.slice(1),
      value: count,
      color: COLORS[category as keyof typeof COLORS] || COLORS.unknown,
    }))
  }, [analytics?.categoryBreakdown])

  // Process effectiveness by category for line chart
  const effectivenessData = useMemo(() => {
    if (!memoryData?.memories || memoryData.memories.length === 0) {
      return []
    }

    const categoryMap = new Map<string, { total: number; sum: number }>()
    
    memoryData.memories.forEach((memory: any) => {
      const category = memory.category || 'unknown'
      const effectiveness = memory.effectiveness || 0
      
      const current = categoryMap.get(category) || { total: 0, sum: 0 }
      categoryMap.set(category, {
        total: current.total + 1,
        sum: current.sum + effectiveness,
      })
    })

    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        effectiveness: data.total > 0 ? data.sum / data.total : 0,
        count: data.total,
      }))
      .sort((a, b) => b.effectiveness - a.effectiveness)
  }, [memoryData?.memories])

  if (isLoading || memoryLoading) {
    return (
      <Card className="p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
      </Card>
    )
  }

  if (!analytics) {
    return (
      <Card className="p-12">
        <div className="text-center text-muted-foreground">
          No analytics data available
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Total Memories</p>
          <h3 className="text-3xl font-bold mt-2">{analytics.totalMemories}</h3>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Avg Effectiveness</p>
          <h3 className="text-3xl font-bold mt-2">{analytics.avgEffectiveness.toFixed(1)}%</h3>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Total Usage</p>
          <h3 className="text-3xl font-bold mt-2">{analytics.totalUsage}</h3>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Categories</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            {Object.keys(analytics.categoryBreakdown).length > 0 ? (
              Object.entries(analytics.categoryBreakdown).map(([category, count]: [string, any]) => (
                <Badge key={category} variant="outline">
                  {category}: {count}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No categories</span>
            )}
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Memory Distribution Pie Chart */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Memory Distribution</h3>
            <p className="text-sm text-muted-foreground">Distribution of memories by category</p>
          </div>
          {distributionData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No memory data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Effectiveness Trends Chart */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Effectiveness Trends</h3>
            <p className="text-sm text-muted-foreground">Average effectiveness by category</p>
          </div>
          {effectivenessData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No effectiveness data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={effectivenessData}>
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
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Effectiveness']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="effectiveness"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 4 }}
                  name="Effectiveness %"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  )
}


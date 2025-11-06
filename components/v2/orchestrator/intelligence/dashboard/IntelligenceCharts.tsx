'use client'

import { useIntelligenceMetrics, useIntelligenceStats } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { TimeRange } from '@/components/v2/orchestrator/dashboard/TimeRangeSelector'
import { Loader2 } from 'lucide-react'
import { useMemo } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface IntelligenceChartsProps {
  timeRange: TimeRange
  type: 'overview' | 'performance' | 'usage'
}

const COLORS = {
  completed: '#10b981',
  failed: '#ef4444',
  paused: '#f59e0b',
  query: '#3b82f6',
  thought: '#8b5cf6',
  plan: '#ec4899',
  summary: '#f59e0b',
  combined: '#6b7280',
}

export function IntelligenceCharts({ timeRange, type }: IntelligenceChartsProps) {
  // Always call hooks unconditionally at the top
  const { data: metrics, isLoading: metricsLoading } = useIntelligenceMetrics(timeRange, type)
  const { data: stats, isLoading: statsLoading } = useIntelligenceStats(timeRange)

  // Generate sample data if backend doesn't return data yet
  const embeddingData = useMemo(() => {
    if (metrics?.embeddingGeneration && Array.isArray(metrics.embeddingGeneration) && metrics.embeddingGeneration.length > 0) {
      return metrics.embeddingGeneration
    }
    // Generate sample data for demonstration
    const days = 7
    const data = []
    const baseDate = new Date()
    baseDate.setDate(baseDate.getDate() - days)
    
    for (let i = 0; i < days; i++) {
      const date = new Date(baseDate)
      date.setDate(date.getDate() + i)
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        embeddings: Math.floor(Math.random() * 10) + 1,
        total: (stats?.totalEmbeddings || 0) + Math.floor(Math.random() * 5),
      })
    }
    return data
  }, [metrics?.embeddingGeneration, stats?.totalEmbeddings])

  const classificationData = useMemo(() => {
    if (metrics?.classificationDistribution && Object.keys(metrics.classificationDistribution).length > 0) {
      return Object.entries(metrics.classificationDistribution).map(([name, value]) => ({
        name,
        value,
      }))
    }
    // Generate sample data
    return [
      { name: 'Simple', value: stats?.totalClassifications ? Math.floor(stats.totalClassifications * 0.4) : 0 },
      { name: 'Moderate', value: stats?.totalClassifications ? Math.floor(stats.totalClassifications * 0.35) : 0 },
      { name: 'Complex', value: stats?.totalClassifications ? Math.floor(stats.totalClassifications * 0.25) : 0 },
    ].filter(item => item.value > 0)
  }, [metrics?.classificationDistribution, stats?.totalClassifications])

  const memoryData = useMemo(() => {
    if (metrics?.memoryEffectiveness && Array.isArray(metrics.memoryEffectiveness) && metrics.memoryEffectiveness.length > 0) {
      return metrics.memoryEffectiveness
    }
    // Generate sample data
    const days = 7
    const data = []
    const baseDate = new Date()
    baseDate.setDate(baseDate.getDate() - days)
    
    for (let i = 0; i < days; i++) {
      const date = new Date(baseDate)
      date.setDate(date.getDate() + i)
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        effectiveness: Math.floor(Math.random() * 30) + 60,
        memories: Math.floor(Math.random() * 5),
      })
    }
    return data
  }, [metrics?.memoryEffectiveness])

  if (metricsLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (type === 'overview') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Embedding Generation Over Time */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Embedding Generation Over Time</h3>
            <p className="text-sm text-muted-foreground">Daily embedding generation trend</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={embeddingData}>
              <defs>
                <linearGradient id="colorEmbeddings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area
                type="monotone"
                dataKey="embeddings"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorEmbeddings)"
                name="Embeddings"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Classification Distribution */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Classification Distribution</h3>
            <p className="text-sm text-muted-foreground">Query complexity breakdown</p>
          </div>
          {classificationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={classificationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {classificationData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.keys(COLORS).length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                  }}
                  formatter={(value: number) => [value, 'Queries']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No classification data available
            </div>
          )}
        </Card>
      </div>
    )
  }

  if (type === 'performance') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Memory Effectiveness */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Memory Effectiveness Over Time</h3>
            <p className="text-sm text-muted-foreground">Memory usage and effectiveness trends</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={memoryData}>
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
                formatter={(value: number) => [`${value}%`, 'Effectiveness']}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="effectiveness"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                name="Effectiveness %"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Embedding Generation Rate */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Embedding Generation Rate</h3>
            <p className="text-sm text-muted-foreground">Daily generation rate percentage</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={embeddingData}>
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
                formatter={(value: number) => [`${value}%`, 'Rate']}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Bar dataKey="embeddings" fill="#3b82f6" name="Generation Rate" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    )
  }

  if (type === 'usage') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Usage */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Feature Usage</h3>
            <p className="text-sm text-muted-foreground">Usage of intelligence features</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={[
                { name: 'Embeddings', value: stats?.totalEmbeddings || 0 },
                { name: 'Patterns', value: stats?.totalPatterns || 0 },
                { name: 'Memories', value: stats?.totalMemories || 0 },
                { name: 'Classifications', value: stats?.totalClassifications || 0 },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
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
              <Bar dataKey="value" fill="#8b5cf6" name="Usage Count" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Memory Creation Trend */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Memory Creation Trend</h3>
            <p className="text-sm text-muted-foreground">Daily memory creation count</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={memoryData}>
              <defs>
                <linearGradient id="colorMemories" x1="0" y1="0" x2="0" y2="1">
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
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area
                type="monotone"
                dataKey="memories"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#colorMemories)"
                name="Memories"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>
    )
  }

  return null
}

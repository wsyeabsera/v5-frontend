'use client'

import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { useOrchestrations } from '@/lib/queries-v2'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'

interface ClassificationChartsProps {
  categoryFilter: string
  complexityFilter: string
}

const COLORS = {
  analytical: '#3b82f6',
  creative: '#8b5cf6',
  procedural: '#10b981',
  debugging: '#f59e0b',
  generation: '#ef4444',
  other: '#6b7280',
}

const COMPLEXITY_COLORS = {
  simple: '#10b981',
  medium: '#f59e0b',
  complex: '#ef4444',
}

export function ClassificationCharts({
  categoryFilter,
  complexityFilter,
}: ClassificationChartsProps) {
  const { data: orchestrations, isLoading } = useOrchestrations({ limit: 1000 })

  // Extract classifications and compute analytics
  const { categoryData, complexityData, confidenceData, timeSeriesData } = useMemo(() => {
    if (!orchestrations) {
      return {
        categoryData: [],
        complexityData: [],
        confidenceData: [],
        timeSeriesData: [],
      }
    }

    const classifications = orchestrations
      .filter((orch: any) => orch.classification)
      .map((orch: any) => ({
        category: orch.classification?.category || 'other',
        complexity: orch.classification?.complexity || 'medium',
        confidence: orch.classification?.confidence || 0,
        timestamp: orch.startedAt || orch.createdAt,
      }))
      .filter((c: any) => {
        if (categoryFilter !== 'all' && c.category !== categoryFilter) return false
        if (complexityFilter !== 'all' && c.complexity !== complexityFilter) return false
        return true
      })

    // Category distribution
    const categoryCounts: Record<string, number> = {}
    classifications.forEach((c: any) => {
      categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1
    })
    const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }))

    // Complexity distribution
    const complexityCounts: Record<string, number> = {}
    classifications.forEach((c: any) => {
      complexityCounts[c.complexity] = (complexityCounts[c.complexity] || 0) + 1
    })
    const complexityData = Object.entries(complexityCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }))

    // Confidence distribution
    const avgConfidenceByCategory: Record<string, { total: number; count: number }> = {}
    classifications.forEach((c: any) => {
      if (!avgConfidenceByCategory[c.category]) {
        avgConfidenceByCategory[c.category] = { total: 0, count: 0 }
      }
      avgConfidenceByCategory[c.category].total += c.confidence
      avgConfidenceByCategory[c.category].count += 1
    })
    const confidenceData = Object.entries(avgConfidenceByCategory).map(([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      confidence: Math.round(data.total / data.count),
    }))

    // Time series (group by day)
    const timeSeriesMap: Record<string, { count: number; avgConfidence: number; confidenceSum: number }> = {}
    classifications.forEach((c: any) => {
      const date = new Date(c.timestamp)
      const dayKey = date.toISOString().split('T')[0]
      if (!timeSeriesMap[dayKey]) {
        timeSeriesMap[dayKey] = { count: 0, avgConfidence: 0, confidenceSum: 0 }
      }
      timeSeriesMap[dayKey].count += 1
      timeSeriesMap[dayKey].confidenceSum += c.confidence
    })
    const timeSeriesData = Object.entries(timeSeriesMap)
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: data.count,
        avgConfidence: Math.round(data.confidenceSum / data.count),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return {
      categoryData,
      complexityData,
      confidenceData,
      timeSeriesData,
    }
  }, [orchestrations, categoryFilter, complexityFilter])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Category Distribution</h3>
        {categoryData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <p className="text-sm">No classification data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={256}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS] || COLORS.other}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Complexity Distribution</h3>
        {complexityData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <p className="text-sm">No classification data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={256}>
            <BarChart data={complexityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8">
                {complexityData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      COMPLEXITY_COLORS[entry.name.toLowerCase() as keyof typeof COMPLEXITY_COLORS] ||
                      COMPLEXITY_COLORS.medium
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Average Confidence by Category</h3>
        {confidenceData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <p className="text-sm">No classification data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={256}>
            <BarChart data={confidenceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="confidence" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Classifications Over Time</h3>
        {timeSeriesData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <p className="text-sm">No classification data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={256}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                name="Count"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgConfidence"
                stroke="#10b981"
                name="Avg Confidence %"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  )
}


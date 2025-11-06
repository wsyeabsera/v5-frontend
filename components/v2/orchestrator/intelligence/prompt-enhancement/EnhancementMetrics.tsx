'use client'

import { useMemo, useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import {
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
  LineChart,
  Line,
} from 'recharts'

interface EnhancementMetricsProps {
  phaseFilter: string
}

const STORAGE_KEY = 'prompt-enhancement-history'

const COLORS = {
  thought: '#3b82f6',
  plan: '#8b5cf6',
  execution: '#10b981',
  summary: '#f59e0b',
}

export function EnhancementMetrics({ phaseFilter }: EnhancementMetricsProps) {
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const loadHistory = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          setHistory(Array.isArray(parsed) ? parsed : [])
        }
      } catch (error) {
        console.error('Failed to load enhancement history:', error)
        setHistory([])
      }
    }

    loadHistory()
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        loadHistory()
      }
    }
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('prompt-enhancement-updated', loadHistory)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('prompt-enhancement-updated', loadHistory)
    }
  }, [])

  const { phaseData, lengthData, sourceData, timeSeriesData, stats } = useMemo(() => {
    const filtered = history.filter((h: any) => {
      if (phaseFilter !== 'all') {
        return h.phase === phaseFilter
      }
      return true
    })

    if (filtered.length === 0) {
      return {
        phaseData: [],
        lengthData: [],
        sourceData: [],
        timeSeriesData: [],
        stats: {
          total: 0,
          avgLengthIncrease: 0,
          avgLengthIncreasePercent: 0,
        },
      }
    }

    // Phase distribution
    const phaseCounts: Record<string, number> = {}
    filtered.forEach((h: any) => {
      phaseCounts[h.phase] = (phaseCounts[h.phase] || 0) + 1
    })
    const phaseData = Object.entries(phaseCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }))

    // Average length increase by phase
    const lengthByPhase: Record<string, { total: number; count: number }> = {}
    filtered.forEach((h: any) => {
      if (!lengthByPhase[h.phase]) {
        lengthByPhase[h.phase] = { total: 0, count: 0 }
      }
      lengthByPhase[h.phase].total += h.enhancedLength - h.originalLength
      lengthByPhase[h.phase].count += 1
    })
    const lengthData = Object.entries(lengthByPhase).map(([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      avgIncrease: Math.round(data.total / data.count),
    }))

    // Enhancement sources breakdown
    const sourceCounts: Record<string, number> = {
      fewShot: 0,
      context: 0,
      both: 0,
      none: 0,
    }
    filtered.forEach((h: any) => {
      const hasFewShot = h.options?.includeFewShot
      const hasContext = h.options?.includeContext
      if (hasFewShot && hasContext) {
        sourceCounts.both += 1
      } else if (hasFewShot) {
        sourceCounts.fewShot += 1
      } else if (hasContext) {
        sourceCounts.context += 1
      } else {
        sourceCounts.none += 1
      }
    })
    const sourceData = Object.entries(sourceCounts)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({
        name: name === 'both' ? 'Few-Shot + Context' : name === 'fewShot' ? 'Few-Shot Only' : name === 'context' ? 'Context Only' : 'None',
        value,
      }))

    // Time series
    const timeSeriesMap: Record<string, { count: number; avgIncrease: number; increaseSum: number }> = {}
    filtered.forEach((h: any) => {
      const date = new Date(h.timestamp)
      const dayKey = date.toISOString().split('T')[0]
      if (!timeSeriesMap[dayKey]) {
        timeSeriesMap[dayKey] = { count: 0, avgIncrease: 0, increaseSum: 0 }
      }
      timeSeriesMap[dayKey].count += 1
      timeSeriesMap[dayKey].increaseSum += h.enhancedLength - h.originalLength
    })
    const timeSeriesData = Object.entries(timeSeriesMap)
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: data.count,
        avgIncrease: Math.round(data.increaseSum / data.count),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Overall stats
    const totalIncrease = filtered.reduce((sum, h) => sum + (h.enhancedLength - h.originalLength), 0)
    const avgLengthIncrease = Math.round(totalIncrease / filtered.length)
    const avgLengthIncreasePercent = filtered.length > 0
      ? Math.round(
          (filtered.reduce((sum, h) => sum + ((h.enhancedLength - h.originalLength) / h.originalLength) * 100, 0) /
            filtered.length) * 10
        ) / 10
      : 0

    return {
      phaseData,
      lengthData,
      sourceData,
      timeSeriesData,
      stats: {
        total: filtered.length,
        avgLengthIncrease,
        avgLengthIncreasePercent,
      },
    }
  }, [history, phaseFilter])

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Enhancements</div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Avg Length Increase</div>
          <div className="text-2xl font-bold mt-1">
            {stats.avgLengthIncrease > 0 ? '+' : ''}
            {stats.avgLengthIncrease} chars
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Avg % Increase</div>
          <div className="text-2xl font-bold mt-1">
            {stats.avgLengthIncreasePercent > 0 ? '+' : ''}
            {stats.avgLengthIncreasePercent}%
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Enhancements by Phase</h3>
          {phaseData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <p className="text-sm">No enhancement data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <PieChart>
                <Pie
                  data={phaseData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {phaseData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS] || '#6b7280'}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Average Length Increase by Phase</h3>
          {lengthData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <p className="text-sm">No enhancement data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={lengthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgIncrease" fill="#3b82f6" name="Avg Increase (chars)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Enhancement Sources</h3>
          {sourceData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <p className="text-sm">No enhancement data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={sourceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Enhancements Over Time</h3>
          {timeSeriesData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <p className="text-sm">No enhancement data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
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
                  dataKey="avgIncrease"
                  stroke="#10b981"
                  name="Avg Increase (chars)"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  )
}


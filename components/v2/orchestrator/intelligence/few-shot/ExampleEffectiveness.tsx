'use client'

import { useMemo } from 'react'
import { useFewShotEffectiveness, useFewShotExamples } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
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
} from 'recharts'

interface ExampleEffectivenessProps {
  phaseFilter: string
}

const COLORS = {
  highQuality: '#10b981',
  regular: '#6b7280',
}

export function ExampleEffectiveness({ phaseFilter }: ExampleEffectivenessProps) {
  const filters: any = {}
  if (phaseFilter !== 'all') {
    filters.phase = phaseFilter as 'thought' | 'plan' | 'execution' | 'summary'
  }

  const effectiveness = useFewShotEffectiveness(filters)
  const { data: examplesData } = useFewShotExamples(
    phaseFilter !== 'all' ? { ...filters, query: '' } : undefined
  )

  // Process quality distribution for pie chart
  const qualityDistribution = useMemo(() => {
    const total = effectiveness.totalExamples
    const highQuality = effectiveness.highQualityCount
    const regular = total - highQuality

    if (total === 0) return []

    return [
      {
        name: 'High Quality',
        value: highQuality,
        color: COLORS.highQuality,
      },
      {
        name: 'Regular',
        value: regular,
        color: COLORS.regular,
      },
    ].filter((item) => item.value > 0)
  }, [effectiveness.totalExamples, effectiveness.highQualityCount])

  // Process similarity and confidence for bar chart
  const metricsData = useMemo(() => {
    const data = []
    
    if (effectiveness.avgSimilarity > 0) {
      data.push({
        metric: 'Similarity',
        value: effectiveness.avgSimilarity * 100,
      })
    }
    
    if (effectiveness.avgConfidence > 0) {
      data.push({
        metric: 'Confidence',
        value: effectiveness.avgConfidence,
      })
    }

    return data
  }, [effectiveness.avgSimilarity, effectiveness.avgConfidence])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Example Quality Distribution */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Example Quality Distribution</h3>
          <p className="text-sm text-muted-foreground">Breakdown of high quality vs regular examples</p>
        </div>
        {qualityDistribution.length === 0 ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Examples</p>
              <p className="text-3xl font-bold">{effectiveness.totalExamples}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">High Quality Examples</p>
              <p className="text-3xl font-bold">{effectiveness.highQualityCount}</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={qualityDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {qualityDistribution.map((entry, index) => (
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

      {/* Similarity/Confidence Metrics */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Effectiveness Metrics</h3>
          <p className="text-sm text-muted-foreground">Average similarity and confidence scores</p>
        </div>
        {metricsData.length === 0 ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Average Similarity</p>
              <p className="text-3xl font-bold">{(effectiveness.avgSimilarity * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average Confidence</p>
              <p className="text-3xl font-bold">
                {effectiveness.avgConfidence > 0
                  ? `${effectiveness.avgConfidence.toFixed(1)}%`
                  : 'N/A'}
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metricsData}>
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
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Score']}
              />
              <Legend />
              <Bar dataKey="value" fill="hsl(var(--primary))" name="Score (%)" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  )
}


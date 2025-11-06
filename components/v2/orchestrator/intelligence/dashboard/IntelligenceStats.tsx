'use client'

import { useIntelligenceStats } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Database, Search, Tag, Sparkles, Network, TrendingUp, TrendingDown } from 'lucide-react'
import { TimeRange } from '@/components/v2/orchestrator/dashboard/TimeRangeSelector'
import { Loader2 } from 'lucide-react'

interface IntelligenceStatsProps {
  timeRange: TimeRange
}

export function IntelligenceStats({ timeRange }: IntelligenceStatsProps) {
  const { data: stats, isLoading, error } = useIntelligenceStats(timeRange)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-red-600">Error loading stats: {error.message}</div>
      </Card>
    )
  }

  const statsData = stats || {
    totalEmbeddings: 0,
    totalPatterns: 0,
    totalMemories: 0,
    totalClassifications: 0,
    embeddingGenerationRate: 0,
    patternExtractionRate: 0,
    memoryEffectiveness: 0,
    classificationAccuracy: 0,
  }

  const statCards = [
    {
      title: 'Total Embeddings',
      value: statsData.totalEmbeddings?.toLocaleString() || '0',
      icon: Database,
      trend: statsData.embeddingGenerationRate || 0,
      description: 'Vector embeddings generated',
    },
    {
      title: 'Patterns Extracted',
      value: statsData.totalPatterns?.toLocaleString() || '0',
      icon: Network,
      trend: statsData.patternExtractionRate || 0,
      description: 'Execution patterns identified',
    },
    {
      title: 'Memories Created',
      value: statsData.totalMemories?.toLocaleString() || '0',
      icon: Sparkles,
      trend: statsData.memoryEffectiveness || 0,
      description: 'Execution memories stored',
    },
    {
      title: 'Queries Classified',
      value: statsData.totalClassifications?.toLocaleString() || '0',
      icon: Tag,
      trend: statsData.classificationAccuracy || 0,
      description: 'Queries analyzed and classified',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat) => {
        const Icon = stat.icon
        const TrendIcon = stat.trend > 0 ? TrendingUp : TrendingDown
        const trendColor = stat.trend > 0 ? 'text-green-600' : 'text-red-600'

        return (
          <Card key={stat.title} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <h3 className="text-3xl font-bold mt-2">{stat.value}</h3>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                {stat.trend !== 0 && (
                  <div className={`flex items-center gap-1 mt-2 ${trendColor}`}>
                    <TrendIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {Math.abs(stat.trend).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              <Icon className="w-8 h-8 text-muted-foreground" />
            </div>
          </Card>
        )
      })}
    </div>
  )
}


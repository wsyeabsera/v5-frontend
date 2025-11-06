'use client'

import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { BarChart3, Clock, DollarSign, TrendingUp, Zap, Target } from 'lucide-react'

interface PerformanceDashboardProps {
  metrics: any[]
}

export function PerformanceDashboard({ metrics }: PerformanceDashboardProps) {
  const stats = useMemo(() => {
    const total = metrics.length
    const successful = metrics.filter((m: any) => m.execution?.status === 'success').length
    const failed = metrics.filter((m: any) => 
      ['failure', 'timeout', 'error'].includes(m.execution?.status)
    ).length
    
    // Calculate average latency
    const latencies = metrics
      .map((m: any) => m.execution?.latency?.total)
      .filter((l: any) => typeof l === 'number' && l > 0)
    
    const avgLatency = latencies.length > 0
      ? Math.round(latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length)
      : 0
    
    // Calculate average confidence
    const confidences = metrics
      .map((m: any) => m.confidence?.overall)
      .filter((c: any) => typeof c === 'number' && c > 0)
    
    const avgConfidence = confidences.length > 0
      ? Math.round(confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length)
      : 0
    
    // Calculate average quality
    const qualities = metrics
      .map((m: any) => {
        const q = m.quality
        if (!q) return null
        const scores = [q.outputCompleteness, q.outputRelevance, q.outputAccuracy].filter((s: any) => typeof s === 'number')
        return scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : null
      })
      .filter((q: any) => q !== null)
    
    const avgQuality = qualities.length > 0
      ? Math.round(qualities.reduce((a: number, b: number) => a + b, 0) / qualities.length)
      : 0
    
    // Calculate total token usage
    const totalTokens = metrics.reduce((sum: number, m: any) => {
      return sum + (m.resources?.tokenUsage?.total || 0)
    }, 0)
    
    // Calculate total cost
    const totalCost = metrics.reduce((sum: number, m: any) => {
      return sum + (m.resources?.cost || 0)
    }, 0)
    
    // Calculate total API calls
    const totalApiCalls = metrics.reduce((sum: number, m: any) => {
      return sum + (m.resources?.apiCalls || 0)
    }, 0)
    
    // Calculate success rate
    const successRate = total > 0 ? Math.round((successful / total) * 100) : 0
    
    return {
      total,
      successful,
      failed,
      avgLatency,
      avgConfidence,
      avgQuality,
      totalTokens,
      totalCost,
      totalApiCalls,
      successRate,
    }
  }, [metrics])

  if (metrics.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Metrics */}
      <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/50 dark:border-blue-900/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Metrics</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.successRate}% success rate
            </p>
          </div>
          <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </Card>

      {/* Average Latency */}
      <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200/50 dark:border-purple-900/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Avg Latency</p>
            <p className="text-2xl font-bold mt-1">
              {stats.avgLatency > 1000
                ? `${(stats.avgLatency / 1000).toFixed(1)}s`
                : `${stats.avgLatency}ms`
              }
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.successful} successful
            </p>
          </div>
          <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </Card>

      {/* Average Confidence */}
      <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-100/50 dark:from-green-950/30 dark:to-emerald-900/20 border-green-200/50 dark:border-green-900/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Avg Confidence</p>
            <p className="text-2xl font-bold mt-1">{stats.avgConfidence}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              Avg quality: {stats.avgQuality}%
            </p>
          </div>
          <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
            <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </Card>

      {/* Token Usage / Cost */}
      <Card className="p-4 bg-gradient-to-br from-orange-50 to-amber-100/50 dark:from-orange-950/30 dark:to-amber-900/20 border-orange-200/50 dark:border-orange-900/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Token Usage</p>
            <p className="text-2xl font-bold mt-1">
              {stats.totalTokens > 1000000
                ? `${(stats.totalTokens / 1000000).toFixed(1)}M`
                : stats.totalTokens > 1000
                ? `${(stats.totalTokens / 1000).toFixed(1)}K`
                : stats.totalTokens.toLocaleString()
              }
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalCost > 0 && `$${stats.totalCost.toFixed(2)} cost`}
              {stats.totalCost === 0 && stats.totalApiCalls > 0 && `${stats.totalApiCalls} API calls`}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <Zap className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
      </Card>
    </div>
  )
}


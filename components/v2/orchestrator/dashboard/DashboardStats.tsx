'use client'

import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardStatsProps {
  currentMetrics: any[]
  previousMetrics?: any[]
  showTrends?: boolean
}

export function DashboardStats({ currentMetrics, previousMetrics = [], showTrends = true }: DashboardStatsProps) {
  const stats = useMemo(() => {
    const current = currentMetrics.length
    const previous = previousMetrics.length

    const currentSuccessful = currentMetrics.filter((m: any) => m.execution?.status === 'success').length
    const previousSuccessful = previousMetrics.filter((m: any) => m.execution?.status === 'success').length

    const currentSuccessRate = current > 0 ? (currentSuccessful / current) * 100 : 0
    const previousSuccessRate = previous > 0 ? (previousSuccessful / previous) * 100 : 0

    const currentLatencies = currentMetrics
      .map((m: any) => m.execution?.latency?.total || 0)
      .filter((l: number) => l > 0)
    const currentAvgLatency = currentLatencies.length > 0
      ? currentLatencies.reduce((a: number, b: number) => a + b, 0) / currentLatencies.length
      : 0

    const previousLatencies = previousMetrics
      .map((m: any) => m.execution?.latency?.total || 0)
      .filter((l: number) => l > 0)
    const previousAvgLatency = previousLatencies.length > 0
      ? previousLatencies.reduce((a: number, b: number) => a + b, 0) / previousLatencies.length
      : 0

    const currentTotalCost = currentMetrics.reduce((sum: number, m: any) => sum + (m.resources?.cost || 0), 0)
    const previousTotalCost = previousMetrics.reduce((sum: number, m: any) => sum + (m.resources?.cost || 0), 0)

    const currentConfidences = currentMetrics
      .map((m: any) => m.confidence?.overall || 0)
      .filter((c: number) => c > 0)
    const currentAvgConfidence = currentConfidences.length > 0
      ? currentConfidences.reduce((a: number, b: number) => a + b, 0) / currentConfidences.length
      : 0

    const previousConfidences = previousMetrics
      .map((m: any) => m.confidence?.overall || 0)
      .filter((c: number) => c > 0)
    const previousAvgConfidence = previousConfidences.length > 0
      ? previousConfidences.reduce((a: number, b: number) => a + b, 0) / previousConfidences.length
      : 0

    return {
      totalExecutions: {
        current,
        previous,
        change: previous > 0 ? ((current - previous) / previous) * 100 : 0,
      },
      successRate: {
        current: currentSuccessRate,
        previous: previousSuccessRate,
        change: previousSuccessRate > 0 ? currentSuccessRate - previousSuccessRate : 0,
      },
      avgLatency: {
        current: currentAvgLatency,
        previous: previousAvgLatency,
        change: previousAvgLatency > 0 ? ((currentAvgLatency - previousAvgLatency) / previousAvgLatency) * 100 : 0,
      },
      totalCost: {
        current: currentTotalCost,
        previous: previousTotalCost,
        change: previousTotalCost > 0 ? ((currentTotalCost - previousTotalCost) / previousTotalCost) * 100 : 0,
      },
      avgConfidence: {
        current: currentAvgConfidence,
        previous: previousAvgConfidence,
        change: previousAvgConfidence > 0 ? currentAvgConfidence - previousAvgConfidence : 0,
      },
    }
  }, [currentMetrics, previousMetrics])

  const TrendIcon = ({ change }: { change: number }) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
    return <Minus className="w-4 h-4 text-muted-foreground" />
  }

  const formatChange = (change: number, isPercentage = false) => {
    const abs = Math.abs(change)
    const sign = change > 0 ? '+' : change < 0 ? '-' : ''
    if (isPercentage) {
      return `${sign}${abs.toFixed(1)}%`
    }
    return `${sign}${abs.toFixed(1)}`
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/50 dark:border-blue-900/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Executions</p>
            <p className="text-2xl font-bold mt-1">{stats.totalExecutions.current}</p>
            {showTrends && previousMetrics.length > 0 && (
              <div className="flex items-center gap-1 mt-1 text-xs">
                <TrendIcon change={stats.totalExecutions.change} />
                <span className={cn(
                  stats.totalExecutions.change > 0 ? 'text-green-600 dark:text-green-400' :
                  stats.totalExecutions.change < 0 ? 'text-red-600 dark:text-red-400' :
                  'text-muted-foreground'
                )}>
                  {formatChange(stats.totalExecutions.change, true)}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-100/50 dark:from-green-950/30 dark:to-emerald-900/20 border-green-200/50 dark:border-green-900/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
            <p className="text-2xl font-bold mt-1">{stats.successRate.current.toFixed(1)}%</p>
            {showTrends && previousMetrics.length > 0 && (
              <div className="flex items-center gap-1 mt-1 text-xs">
                <TrendIcon change={stats.successRate.change} />
                <span className={cn(
                  stats.successRate.change > 0 ? 'text-green-600 dark:text-green-400' :
                  stats.successRate.change < 0 ? 'text-red-600 dark:text-red-400' :
                  'text-muted-foreground'
                )}>
                  {formatChange(stats.successRate.change, true)}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200/50 dark:border-purple-900/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Avg Latency</p>
            <p className="text-2xl font-bold mt-1">
              {stats.avgLatency.current > 1000
                ? `${(stats.avgLatency.current / 1000).toFixed(1)}s`
                : `${Math.round(stats.avgLatency.current)}ms`
              }
            </p>
            {showTrends && previousMetrics.length > 0 && (
              <div className="flex items-center gap-1 mt-1 text-xs">
                <TrendIcon change={-stats.avgLatency.change} />
                <span className={cn(
                  stats.avgLatency.change < 0 ? 'text-green-600 dark:text-green-400' :
                  stats.avgLatency.change > 0 ? 'text-red-600 dark:text-red-400' :
                  'text-muted-foreground'
                )}>
                  {formatChange(stats.avgLatency.change, true)}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-gradient-to-br from-orange-50 to-amber-100/50 dark:from-orange-950/30 dark:to-amber-900/20 border-orange-200/50 dark:border-orange-900/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
            <p className="text-2xl font-bold mt-1">${stats.totalCost.current.toFixed(4)}</p>
            {showTrends && previousMetrics.length > 0 && (
              <div className="flex items-center gap-1 mt-1 text-xs">
                <TrendIcon change={stats.totalCost.change} />
                <span className={cn(
                  stats.totalCost.change > 0 ? 'text-red-600 dark:text-red-400' :
                  stats.totalCost.change < 0 ? 'text-green-600 dark:text-green-400' :
                  'text-muted-foreground'
                )}>
                  {formatChange(stats.totalCost.change, true)}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-gradient-to-br from-teal-50 to-cyan-100/50 dark:from-teal-950/30 dark:to-cyan-900/20 border-teal-200/50 dark:border-teal-900/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Avg Confidence</p>
            <p className="text-2xl font-bold mt-1">{stats.avgConfidence.current.toFixed(1)}%</p>
            {showTrends && previousMetrics.length > 0 && (
              <div className="flex items-center gap-1 mt-1 text-xs">
                <TrendIcon change={stats.avgConfidence.change} />
                <span className={cn(
                  stats.avgConfidence.change > 0 ? 'text-green-600 dark:text-green-400' :
                  stats.avgConfidence.change < 0 ? 'text-red-600 dark:text-red-400' :
                  'text-muted-foreground'
                )}>
                  {formatChange(stats.avgConfidence.change, true)}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}


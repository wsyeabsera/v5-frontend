'use client'

import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Play, CheckCircle2, XCircle, Clock, Activity, TrendingUp } from 'lucide-react'

interface OrchestrationDashboardProps {
  orchestrations: any[]
  orchestrators?: any[]
}

export function OrchestrationDashboard({ orchestrations, orchestrators = [] }: OrchestrationDashboardProps) {
  const stats = useMemo(() => {
    const total = orchestrations.length
    const completed = orchestrations.filter((o: any) => o.status === 'completed').length
    const failed = orchestrations.filter((o: any) => o.status === 'failed').length
    const active = orchestrations.filter((o: any) => 
      ['pending', 'thought', 'planning', 'executing'].includes(o.status)
    ).length
    const paused = orchestrations.filter((o: any) => o.status === 'paused').length
    
    // Calculate success rate
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0
    
    // Calculate average duration
    const durations = orchestrations
      .filter((o: any) => o.timestamps?.started && o.timestamps?.completed)
      .map((o: any) => {
        const start = new Date(o.timestamps.started).getTime()
        const completed = new Date(o.timestamps.completed).getTime()
        return completed - start
      })
    
    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 1000) // Convert to seconds
      : 0
    
    // Get unique orchestrators
    const uniqueOrchestrators = new Set(
      orchestrations.map((o: any) => o.orchestratorId?.toString()).filter(Boolean)
    ).size
    
    return {
      total,
      completed,
      failed,
      active,
      paused,
      successRate,
      avgDuration,
      uniqueOrchestrators,
    }
  }, [orchestrations])

  if (orchestrations.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Executions */}
      <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/50 dark:border-blue-900/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Executions</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
            {stats.uniqueOrchestrators > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {stats.uniqueOrchestrators} orchestrator{stats.uniqueOrchestrators !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Play className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </Card>

      {/* Success Rate */}
      <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-100/50 dark:from-green-950/30 dark:to-emerald-900/20 border-green-200/50 dark:border-green-900/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
            <p className="text-2xl font-bold mt-1">{stats.successRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.completed} completed
            </p>
          </div>
          <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </Card>

      {/* Average Duration */}
      <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200/50 dark:border-purple-900/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Avg Duration</p>
            <p className="text-2xl font-bold mt-1">
              {stats.avgDuration > 60 
                ? `${Math.round(stats.avgDuration / 60)}m ${stats.avgDuration % 60}s`
                : `${stats.avgDuration}s`
              }
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.active > 0 && `${stats.active} active`}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </Card>

      {/* Failed / Active */}
      <Card className="p-4 bg-gradient-to-br from-red-50 to-rose-100/50 dark:from-red-950/30 dark:to-rose-900/20 border-red-200/50 dark:border-red-900/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Failed</p>
            <p className="text-2xl font-bold mt-1">{stats.failed}</p>
            <div className="flex gap-1 mt-1">
              {stats.active > 0 && (
                <Badge variant="outline" className="text-xs">
                  {stats.active} active
                </Badge>
              )}
              {stats.paused > 0 && (
                <Badge variant="outline" className="text-xs">
                  {stats.paused} paused
                </Badge>
              )}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
            <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
        </div>
      </Card>
    </div>
  )
}


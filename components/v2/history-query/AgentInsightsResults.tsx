'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useGetAgentInsights } from '@/lib/queries-intelligence/history-query'
import { Loader2, Brain, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react'

export function AgentInsightsResults() {
  const [agentType, setAgentType] = useState<'thought' | 'planner' | 'executor'>('planner')
  const [insightType, setInsightType] = useState<'patterns' | 'optimizations' | 'warnings' | undefined>(undefined)
  const [limit, setLimit] = useState(10)

  const { data: insights, isLoading, error } = useGetAgentInsights(agentType, {
    insightType,
    limit,
  })

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'patterns':
        return <TrendingUp className="w-4 h-4" />
      case 'optimizations':
        return <Lightbulb className="w-4 h-4" />
      case 'warnings':
        return <AlertTriangle className="w-4 h-4" />
      default:
        return <Brain className="w-4 h-4" />
    }
  }

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'patterns':
        return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/30'
      case 'optimizations':
        return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/30'
      case 'warnings':
        return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900/30'
      default:
        return ''
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="agent-type">Agent Type</Label>
          <select
            id="agent-type"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={agentType}
            onChange={(e) => setAgentType(e.target.value as 'thought' | 'planner' | 'executor')}
          >
            <option value="thought">Thought</option>
            <option value="planner">Planner</option>
            <option value="executor">Executor</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Select the agent type to view insights for
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="insight-type">Insight Type</Label>
          <select
            id="insight-type"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={insightType || ''}
            onChange={(e) => setInsightType(e.target.value ? (e.target.value as any) : undefined)}
          >
            <option value="">All</option>
            <option value="patterns">Patterns</option>
            <option value="optimizations">Optimizations</option>
            <option value="warnings">Warnings</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Filter by insight category: patterns, optimizations, or warnings
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="limit-insights">Limit</Label>
          <input
            id="limit-insights"
            type="number"
            min={1}
            max={50}
            value={limit}
            onChange={(e) => setLimit(Math.max(1, Math.min(50, parseInt(e.target.value) || 10)))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">Loading insights...</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
          <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
            Failed to load insights
          </p>
          <p className="text-xs text-red-500 dark:text-red-400/80">
            {error instanceof Error ? error.message : 'Please try again or check your connection'}
          </p>
        </div>
      )}

      {!isLoading && insights && (
        <div>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Found {Array.isArray(insights) ? insights.length : 0} insight
              {(Array.isArray(insights) ? insights.length : 0) !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="space-y-4">
            {Array.isArray(insights) && insights.length > 0 ? (
              insights.map((insight: any) => (
                <Card
                  key={insight.id}
                  className={`p-4 ${getInsightColor(insight.insightType)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getInsightIcon(insight.insightType)}
                      <Badge variant="outline">{insight.insightType}</Badge>
                      <Badge variant="secondary">
                        {insight.confidence != null ? (insight.confidence * 100).toFixed(0) : '0'}% confidence
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm mb-2">{insight.insight}</p>
                  {insight.examples && insight.examples.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold mb-1">Examples:</p>
                      <div className="space-y-1">
                        {insight.examples.slice(0, 3).map((example: any, idx: number) => (
                          <div key={idx} className="text-xs text-muted-foreground">
                            • Task {example.taskId} - {example.context}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {insight.createdAt && (
                    <div className="text-xs text-muted-foreground mt-2">
                      {new Date(insight.createdAt).toLocaleDateString()}
                    </div>
                  )}
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center">
                <Brain className="w-12 h-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-base font-medium mb-2">No insights found</p>
                <p className="text-sm text-muted-foreground">
                  Insights are generated automatically after task executions. Try completing some tasks first.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


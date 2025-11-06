'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useGetToolPerformance } from '@/lib/queries-intelligence/history-query'
import { Loader2, Wrench, AlertTriangle } from 'lucide-react'

export function ToolPerformanceResults() {
  const [toolName, setToolName] = useState('')
  const [debouncedToolName, setDebouncedToolName] = useState('')
  const [context, setContext] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedToolName(toolName)
    }, 300)
    return () => clearTimeout(timer)
  }, [toolName])

  const { data: performance, isLoading, error } = useGetToolPerformance(
    debouncedToolName,
    context || undefined
  )

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tool-name-input">Tool Name</Label>
          <Input
            id="tool-name-input"
            placeholder="Enter tool name (e.g., create_facility)..."
            value={toolName}
            onChange={(e) => setToolName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Enter the exact tool name to view performance metrics and error patterns
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="context-input">Context (Optional)</Label>
          <Input
            id="context-input"
            placeholder="Enter context (e.g., facility_management)..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Filter performance data by specific context or use case
          </p>
        </div>
      </div>

      {isLoading && debouncedToolName && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">Loading performance data...</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
          <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
            Failed to load performance data
          </p>
          <p className="text-xs text-red-500 dark:text-red-400/80">
            {error instanceof Error ? error.message : 'Please try again or check your connection'}
          </p>
        </div>
      )}

      {!isLoading && debouncedToolName && performance && (
        <Card className="p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Wrench className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-semibold">{performance.toolName || 'Unknown Tool'}</h3>
              {performance.context && (
                <Badge variant="outline">{performance.context}</Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Success Rate</span>
                  <span className="text-sm font-bold">
                    {performance.successRate != null ? (performance.successRate * 100).toFixed(1) : '0.0'}%
                  </span>
                </div>
                <Progress value={performance.successRate != null ? performance.successRate * 100 : 0} className="h-2" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Average Duration</span>
                  <span className="text-sm font-bold">
                    {performance.averageDuration != null ? performance.averageDuration.toFixed(0) : '0'}ms
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{(performance as any).totalExecutions || (performance as any).totalCalls || 0}</div>
                <div className="text-xs text-muted-foreground">Total Executions</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {(performance as any).successCount || (performance as any).successfulCalls || 0}
                </div>
                <div className="text-xs text-muted-foreground">Successful</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {(performance as any).failureCount || (performance as any).failedCalls || 0}
                </div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>

            {performance.commonErrors && performance.commonErrors.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Common Errors
                </h4>
                <div className="space-y-2">
                  {performance.commonErrors.map((error: any, idx: number) => (
                    <div key={idx} className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{error.error}</span>
                        <Badge variant="outline">{error.frequency || error.count} times</Badge>
                      </div>
                      {error.percentage && (
                        <p className="text-xs text-muted-foreground mb-2">
                          {(error.percentage * 100).toFixed(0)}% of failures
                        </p>
                      )}
                      {error.solutions && error.solutions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-semibold mb-1">Solutions:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {error.solutions.map((solution: string, solIdx: number) => (
                              <li key={solIdx} className="text-xs text-muted-foreground">{solution}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {performance.recommendations && performance.recommendations.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Recommendations</h4>
                <ul className="list-disc list-inside space-y-1">
                  {performance.recommendations.map((rec: string, idx: number) => (
                    <li key={idx} className="text-sm text-muted-foreground">{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

      {!debouncedToolName && (
        <div className="text-center py-12 text-muted-foreground">
          <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-base mb-2">Enter a tool name to view performance metrics</p>
          <p className="text-sm">Try: <code className="bg-muted px-1 rounded">create_facility</code>, <code className="bg-muted px-1 rounded">list_facilities</code>, <code className="bg-muted px-1 rounded">get_facility</code></p>
        </div>
      )}
    </div>
  )
}


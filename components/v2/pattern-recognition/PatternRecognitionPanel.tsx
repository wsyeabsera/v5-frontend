'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useGetMemoryPattern } from '@/lib/queries-intelligence/pattern-recognition'
import { Loader2, Network, TrendingUp } from 'lucide-react'

export function PatternRecognitionPanel() {
  const [patternType, setPatternType] = useState<'query_pattern' | 'plan_pattern' | 'tool_sequence' | 'error_pattern'>('query_pattern')
  const [pattern, setPattern] = useState('')
  const [debouncedPattern, setDebouncedPattern] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPattern(pattern)
    }, 300)
    return () => clearTimeout(timer)
  }, [pattern])

  const { data: patterns, isLoading, error } = useGetMemoryPattern(patternType, debouncedPattern)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="pattern-type">Pattern Type</Label>
          <Select value={patternType} onValueChange={(v) => setPatternType(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="query_pattern">Query Pattern</SelectItem>
              <SelectItem value="plan_pattern">Plan Pattern</SelectItem>
              <SelectItem value="tool_sequence">Tool Sequence</SelectItem>
              <SelectItem value="error_pattern">Error Pattern</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pattern-input">Pattern</Label>
          <Input
            id="pattern-input"
            placeholder="Enter pattern to search (e.g., 'facility', 'create', 'error')..."
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Search for patterns extracted from task executions
          </p>
        </div>
      </div>

      {isLoading && debouncedPattern && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">Searching patterns...</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
          <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
            Failed to search patterns
          </p>
          <p className="text-xs text-red-500 dark:text-red-400/80">
            {error instanceof Error ? error.message : 'Please try again or check your connection'}
          </p>
        </div>
      )}

      {!isLoading && debouncedPattern && patterns && (
        <div>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Found {Array.isArray(patterns) ? patterns.length : 0} pattern
              {(Array.isArray(patterns) ? patterns.length : 0) !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="space-y-4">
            {Array.isArray(patterns) && patterns.length > 0 ? (
              patterns.map((patternItem: any) => (
                <Card key={patternItem.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Network className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold">{patternItem.pattern}</h3>
                        <Badge variant="outline">{patternItem.patternType}</Badge>
                        <Badge variant="default">
                          {(patternItem.successRate * 100).toFixed(0)}% success
                        </Badge>
                        <Badge variant="secondary">Used {patternItem.usageCount} times</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{patternItem.description}</p>
                      {patternItem.metadata && (
                        <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                          {patternItem.metadata.averageDuration && (
                            <div>
                              <span className="text-muted-foreground">Avg Duration: </span>
                              <span className="font-medium">{patternItem.metadata.averageDuration}ms</span>
                            </div>
                          )}
                          {patternItem.metadata.averageSteps && (
                            <div>
                              <span className="text-muted-foreground">Avg Steps: </span>
                              <span className="font-medium">{patternItem.metadata.averageSteps}</span>
                            </div>
                          )}
                          {patternItem.metadata.commonTools && patternItem.metadata.commonTools.length > 0 && (
                            <div>
                              <span className="text-muted-foreground">Tools: </span>
                              <span className="font-medium">
                                {patternItem.metadata.commonTools.slice(0, 3).join(', ')}
                                {patternItem.metadata.commonTools.length > 3 && '...'}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      {patternItem.examples && patternItem.examples.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold mb-1">Examples ({patternItem.examples.length}):</p>
                          <div className="space-y-1">
                            {patternItem.examples.slice(0, 3).map((example: any, idx: number) => (
                              <div key={idx} className="text-xs text-muted-foreground">
                                • Task {example.taskId} - {example.context} ({example.result})
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center">
                <Network className="w-12 h-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-base font-medium mb-2">No patterns found</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Patterns need to be extracted from completed tasks first.
                </p>
                <p className="text-sm text-muted-foreground">
                  Visit the <a href="/v2/memory" className="text-primary hover:underline">Memory System</a> to extract patterns from your tasks.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}

      {!debouncedPattern && (
        <div className="text-center py-12 text-muted-foreground">
          <Network className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-base mb-2">Select pattern type and enter a pattern to search</p>
          <p className="text-sm">Patterns are extracted from completed tasks using the Memory System</p>
        </div>
      )}
    </div>
  )
}


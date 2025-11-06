'use client'

import { useEffect } from 'react'
import { usePatterns } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'

interface PatternListProps {
  patternTypeFilter: string
  onSelect: (pattern: any) => void
}

export function PatternList({ patternTypeFilter, onSelect }: PatternListProps) {
  const filters: any = {}
  if (patternTypeFilter !== 'all') filters.patternType = patternTypeFilter

  const { data: patterns, isLoading, error } = usePatterns(filters)

  // Debug logging
  useEffect(() => {
    if (patterns !== undefined) {
      console.log('[PatternList] Patterns data:', patterns)
      console.log('[PatternList] Filters:', filters)
      console.log('[PatternList] Is array:', Array.isArray(patterns))
      if (!Array.isArray(patterns)) {
        console.log('[PatternList] Response structure:', typeof patterns, patterns)
      }
    }
  }, [patterns, filters])

  if (isLoading) {
    return (
      <Card className="p-12">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-3 text-sm text-muted-foreground">Loading patterns...</span>
        </div>
      </Card>
    )
  }

  if (error) {
    console.error('[PatternList] Error loading patterns:', error)
    return (
      <Card className="p-6 border-red-200 bg-red-50 dark:bg-red-950/20">
        <div className="space-y-2">
          <div className="text-red-600 font-semibold">Error loading patterns</div>
          <div className="text-sm text-red-600">{error.message}</div>
          <div className="text-xs text-muted-foreground mt-2">
            Please check the console for more details or try extracting patterns first.
          </div>
        </div>
      </Card>
    )
  }

  // Handle different response structures
  let patternList: any[] = []
  if (Array.isArray(patterns)) {
    patternList = patterns
  } else if (patterns && typeof patterns === 'object') {
    // Try to extract patterns from response object
    if (Array.isArray(patterns.patterns)) {
      patternList = patterns.patterns
    } else if (Array.isArray(patterns.data)) {
      patternList = patterns.data
    } else if (Array.isArray(patterns.results)) {
      patternList = patterns.results
    } else {
      console.warn('[PatternList] Unexpected response structure:', patterns)
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          {patternList.length} pattern{patternList.length !== 1 ? 's' : ''} found
        </p>
      </div>
      <ScrollArea className="h-[600px]">
        <div className="space-y-4 pr-4">
          {patternList.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>No patterns found</p>
              <p className="text-xs mt-2">Use the "Extract Patterns" tab to extract patterns from executions</p>
            </div>
          ) : (
            patternList.map((pattern: any, index: number) => (
              <Card
                key={pattern.name || pattern.id || index}
                className="p-4 cursor-pointer hover:bg-muted/50"
                onClick={() => onSelect(pattern)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          pattern.patternType === 'success'
                            ? 'default'
                            : pattern.patternType === 'failure'
                              ? 'destructive'
                              : 'outline'
                        }
                      >
                        {pattern.patternType || 'unknown'}
                      </Badge>
                      {pattern.statistics?.occurrenceCount && (
                        <span className="text-sm text-muted-foreground">
                          {pattern.statistics.occurrenceCount} occurrences
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold">{pattern.name || `Pattern ${index + 1}`}</h3>
                    {pattern.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {pattern.description}
                      </p>
                    )}
                    {pattern.statistics && (
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {pattern.statistics.successRate !== undefined && (
                          <span>
                            Success Rate: {pattern.statistics.successRate.toFixed(1)}%
                          </span>
                        )}
                        {pattern.statistics.averageConfidence !== undefined && (
                          <span>
                            Avg Confidence: {pattern.statistics.averageConfidence.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  )
}


'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useGetSimilarTasks } from '@/lib/queries-intelligence/history-query'
import { Loader2, Search, Clock, CheckCircle2, XCircle } from 'lucide-react'

export function SimilarTasksResults() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [limit, setLimit] = useState(10)
  const [minSimilarity, setMinSimilarity] = useState(0.5)
  const [status, setStatus] = useState<'completed' | 'failed' | undefined>(undefined)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const { data: tasks, isLoading, error } = useGetSimilarTasks(debouncedQuery, {
    limit,
    minSimilarity,
    status,
  })

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="query-input">Search Query</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="query-input"
                placeholder="Enter a query to find similar tasks..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="limit">Limit</Label>
            <Input
              id="limit"
              type="number"
              min={1}
              max={50}
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Math.min(50, parseInt(e.target.value) || 10)))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="min-similarity">Min Similarity</Label>
            <Input
              id="min-similarity"
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={minSimilarity}
              onChange={(e) => setMinSimilarity(Math.max(0, Math.min(1, parseFloat(e.target.value) || 0.5)))}
            />
            <p className="text-xs text-muted-foreground">
              Minimum similarity score (0.0-1.0). Lower values show more results.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={status || ''}
              onChange={(e) => setStatus(e.target.value ? (e.target.value as 'completed' | 'failed') : undefined)}
            >
              <option value="">All</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading && debouncedQuery && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">Searching...</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
          <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
            Failed to search similar tasks
          </p>
          <p className="text-xs text-red-500 dark:text-red-400/80">
            {error instanceof Error ? error.message : 'Please try again or check your connection'}
          </p>
        </div>
      )}

      {!isLoading && debouncedQuery && tasks && (
        <div>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Found {Array.isArray(tasks) ? tasks.length : 0} similar task
              {(Array.isArray(tasks) ? tasks.length : 0) !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="space-y-4">
            {Array.isArray(tasks) && tasks.length > 0 ? (
              tasks.map((task: any) => (
                <Card key={task.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={task.status === 'completed' ? 'default' : 'destructive'}>
                          {task.status}
                        </Badge>
                        <Badge variant="outline">
                          {task.similarityScore != null ? (task.similarityScore * 100).toFixed(0) : '0'}% similar
                        </Badge>
                      </div>
                      <h3 className="font-semibold mb-1">{task.query || task.goal}</h3>
                      {task.goal && task.goal !== task.query && (
                        <p className="text-sm text-muted-foreground mb-2">Goal: {task.goal}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {task.executionTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {task.executionTime}ms
                          </div>
                        )}
                        {task.stepsCompleted !== undefined && (
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            {task.stepsCompleted} steps
                          </div>
                        )}
                        {task.createdAt && (
                          <div className="text-xs">
                            {new Date(task.createdAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground mb-2">No similar tasks found</p>
                <p className="text-sm text-muted-foreground">
                  Try lowering the similarity threshold or using a different search query
                </p>
              </Card>
            )}
          </div>
        </div>
      )}

      {!debouncedQuery && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-base mb-2">Enter a search query to find similar tasks</p>
          <p className="text-sm">Try searching for: "Get facility", "Create shipment", or any task description</p>
        </div>
      )}
    </div>
  )
}


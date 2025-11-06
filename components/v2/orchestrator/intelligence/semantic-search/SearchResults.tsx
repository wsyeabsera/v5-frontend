'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Progress } from '@/components/ui/progress'

interface SearchResultsProps {
  results: {
    total: number
    results: Array<{
      executionId: string
      similarity: number
      matchedPart: string
      userQuery: string
      status: string
      confidence?: number
      quality?: number
      summary?: string
      startedAt: string
      completedAt?: string
    }>
  }
  query: string
}

export function SearchResults({ results, query }: SearchResultsProps) {
  // Handle different response structures
  let resultsArray: any[] = []
  let total = 0

  if (results) {
    if (Array.isArray(results)) {
      resultsArray = results
      total = results.length
    } else if (results.results && Array.isArray(results.results)) {
      resultsArray = results.results
      total = results.total || resultsArray.length
    } else if (results.total !== undefined) {
      total = results.total
    }
  }

  if (!results || total === 0 || resultsArray.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center text-muted-foreground">
          <p>No similar executions found</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Found {total} similar execution{total !== 1 ? 's' : ''}
        </p>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-4 pr-4">
          {resultsArray.map((result: any) => (
            <Card key={result.executionId} className="p-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={result.status === 'completed' ? 'default' : 'destructive'}>
                        {result.status}
                      </Badge>
                      <Badge variant="outline">{result.matchedPart}</Badge>
                    </div>
                    <h3 className="font-semibold text-lg mb-1">{result.userQuery}</h3>
                    {result.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {result.summary}
                      </p>
                    )}
                  </div>
                  <Link href={`/v2/orchestrator/orchestrations?executionId=${result.executionId}`}>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>

                {/* Similarity Score */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Similarity</span>
                    <span className="font-medium">
                      {(result.similarity * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={result.similarity * 100} className="h-2" />
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  {result.confidence !== undefined && (
                    <div>
                      <p className="text-xs text-muted-foreground">Confidence</p>
                      <p className="text-sm font-medium">{result.confidence}%</p>
                    </div>
                  )}
                  {result.quality !== undefined && (
                    <div>
                      <p className="text-xs text-muted-foreground">Quality</p>
                      <p className="text-sm font-medium">{result.quality}%</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Started</p>
                    <p className="text-sm font-medium">
                      {new Date(result.startedAt).toLocaleString()}
                    </p>
                  </div>
                  {result.completedAt && (
                    <div>
                      <p className="text-xs text-muted-foreground">Completed</p>
                      <p className="text-sm font-medium">
                        {new Date(result.completedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}


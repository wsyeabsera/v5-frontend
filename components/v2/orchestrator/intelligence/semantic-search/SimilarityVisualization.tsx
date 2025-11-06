'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface SimilarityVisualizationProps {
  results: {
    total: number
    results: Array<{
      executionId: string
      similarity: number
      matchedPart: string
      userQuery: string
      status: string
    }>
  }
  query: string
}

export function SimilarityVisualization({ results, query }: SimilarityVisualizationProps) {
  // Handle different response structures
  let resultsArray: any[] = []
  if (results) {
    if (Array.isArray(results)) {
      resultsArray = results
    } else if (results.results && Array.isArray(results.results)) {
      resultsArray = results.results
    }
  }

  // Sort by similarity descending
  const sortedResults = [...resultsArray].sort((a, b) => (b.similarity || 0) - (a.similarity || 0))

  if (sortedResults.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Similarity Distribution</h3>
        <div className="text-center text-muted-foreground py-8">
          No results to visualize
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Similarity Distribution</h3>
      <div className="space-y-4">
        {sortedResults.map((result, index) => (
          <div key={result.executionId} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">#{index + 1}</span>
                <Badge variant="outline" className="text-xs">
                  {result.matchedPart}
                </Badge>
                <span className="text-sm text-muted-foreground truncate max-w-md">
                  {result.userQuery}
                </span>
              </div>
              <span className="text-sm font-medium">
                {(result.similarity * 100).toFixed(1)}%
              </span>
            </div>
            <Progress value={result.similarity * 100} className="h-2" />
          </div>
        ))}
      </div>
    </Card>
  )
}


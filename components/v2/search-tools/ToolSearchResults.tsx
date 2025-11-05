'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'

interface ToolSearchResultsProps {
  results: Array<{
    name: string
    description?: string
    source?: 'remote' | 'local'
    operationType?: 'query' | 'mutation'
    entityType?: string
    score?: number
  }>
  onView: (tool: any) => void
}

export function ToolSearchResults({ results, onView }: ToolSearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No results found. Try a different search query.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {results.map((tool, index) => (
        <Card key={tool.name || index} className="p-4 hover:border-primary/30 transition-all">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{tool.name}</h3>
                {tool.score !== undefined && (
                  <Badge variant="outline" className="text-xs">
                    Score: {tool.score.toFixed(2)}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {tool.description || 'No description available'}
              </p>
              <div className="flex flex-wrap gap-2">
                {tool.source && (
                  <Badge variant={tool.source === 'remote' ? 'default' : 'secondary'}>
                    {tool.source}
                  </Badge>
                )}
                {tool.operationType && <Badge variant="outline">{tool.operationType}</Badge>}
                {tool.entityType && (
                  <Badge variant="outline" className="bg-muted">
                    {tool.entityType}
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => onView(tool)} className="gap-2">
              <Eye className="w-4 h-4" />
              View
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}


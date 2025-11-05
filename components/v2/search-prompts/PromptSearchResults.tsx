'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'

interface PromptSearchResultsProps {
  results: Array<{
    name: string
    description?: string
    source?: 'remote' | 'local'
    arguments?: Array<{ name: string; description?: string; required?: boolean }>
    score?: number
  }>
  onView: (prompt: any) => void
}

export function PromptSearchResults({ results, onView }: PromptSearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No results found. Try a different search query.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {results.map((prompt, index) => {
        const argsCount = prompt.arguments?.length || 0
        return (
          <Card key={prompt.name || index} className="p-4 hover:border-primary/30 transition-all">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{prompt.name}</h3>
                  {prompt.score !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      Score: {prompt.score.toFixed(2)}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {prompt.description || 'No description available'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {prompt.source && (
                    <Badge variant={prompt.source === 'remote' ? 'default' : 'secondary'}>
                      {prompt.source}
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {argsCount} argument{argsCount !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => onView(prompt)} className="gap-2">
                <Eye className="w-4 h-4" />
                View
              </Button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}


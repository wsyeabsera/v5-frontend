'use client'

import { PlanExample } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2, Edit2 } from 'lucide-react'

interface PlannerExampleListProps {
  examples: PlanExample[]
  onEdit?: (example: PlanExample) => void
  onDelete?: (id: string) => void
  isLoading?: boolean
}

export function PlannerExampleList({ examples, onEdit, onDelete, isLoading }: PlannerExampleListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Loading examples...</p>
      </div>
    )
  }

  if (examples.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">No examples yet. Create one to get started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {examples.map((example) => (
        <Card key={example.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium">{example.query}</p>
                {example.goal && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    Goal: {example.goal}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">
                    Success: {(example.successRating * 100).toFixed(0)}%
                  </Badge>
                  <Badge variant="secondary">
                    {example.steps?.length || 0} Step{(example.steps?.length || 0) !== 1 ? 's' : ''}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Used {example.usageCount} time{example.usageCount !== 1 ? 's' : ''}
                  </span>
                </div>
                {example.tags && example.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {example.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(example)}
                    className="gap-2"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(example.id)}
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}


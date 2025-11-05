'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Eye } from 'lucide-react'

interface PromptCardProps {
  prompt: {
    name: string
    description?: string
    source?: 'remote' | 'local'
    arguments?: Array<{ name: string; description?: string; required?: boolean }>
  }
  onView: (prompt: any) => void
}

export function PromptCard({ prompt, onView }: PromptCardProps) {
  const argsCount = prompt.arguments?.length || 0

  return (
    <Card className="p-6 hover:border-primary/30 transition-all duration-200">
      <div className="space-y-4">
        {/* Name and Description */}
        <div>
          <h3 className="font-semibold text-lg mb-2">{prompt.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {prompt.description || 'No description available'}
          </p>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Source */}
          {prompt.source && (
            <Badge variant={prompt.source === 'remote' ? 'default' : 'secondary'}>
              {prompt.source}
            </Badge>
          )}

          {/* Arguments Count */}
          <Badge variant="outline">
            {argsCount} argument{argsCount !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(prompt)}
            className="flex-1 gap-2"
          >
            <Eye className="w-4 h-4" />
            View
          </Button>
        </div>
      </div>
    </Card>
  )
}


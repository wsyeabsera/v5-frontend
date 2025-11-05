'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Eye, Play } from 'lucide-react'

interface ToolCardProps {
  tool: {
    name: string
    description?: string
    source?: 'remote' | 'local'
    operationType?: 'query' | 'mutation'
    entityType?: 'facility' | 'shipment' | 'contaminant' | 'contract' | 'inspection' | 'other'
  }
  onView: (tool: any) => void
  onExecute: (tool: any) => void
}

export function ToolCard({ tool, onView, onExecute }: ToolCardProps) {
  return (
    <Card className="p-6 hover:border-primary/30 transition-all duration-200">
      <div className="space-y-4">
        {/* Name and Description */}
        <div>
          <h3 className="font-semibold text-lg mb-2">{tool.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {tool.description || 'No description available'}
          </p>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Source */}
          {tool.source && (
            <Badge variant={tool.source === 'remote' ? 'default' : 'secondary'}>
              {tool.source}
            </Badge>
          )}

          {/* Operation Type */}
          {tool.operationType && (
            <Badge variant="outline">{tool.operationType}</Badge>
          )}

          {/* Entity Type */}
          {tool.entityType && (
            <Badge variant="outline" className="bg-muted">
              {tool.entityType}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(tool)}
            className="flex-1 gap-2"
          >
            <Eye className="w-4 h-4" />
            View
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => onExecute(tool)}
            className="flex-1 gap-2"
          >
            <Play className="w-4 h-4" />
            Execute
          </Button>
        </div>
      </div>
    </Card>
  )
}


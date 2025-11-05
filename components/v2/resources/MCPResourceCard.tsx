'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Eye } from 'lucide-react'

interface MCPResourceCardProps {
  resource: {
    uri: string
    name: string
    description?: string
    mimeType?: string
  }
  onView: (resource: {
    uri: string
    name: string
    description?: string
    mimeType?: string
  }) => void
}

export function MCPResourceCard({ resource, onView }: MCPResourceCardProps) {
  return (
    <Card className="p-6 hover:border-primary/30 transition-all duration-200">
      <div className="space-y-4">
        {/* Name and URI */}
        <div>
          <h3 className="font-semibold text-lg mb-1">{resource.name}</h3>
          <p className="text-sm text-muted-foreground font-mono break-all">{resource.uri}</p>
        </div>

        {/* Description */}
        {resource.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{resource.description}</p>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2">
          {/* MIME Type */}
          {resource.mimeType && <Badge variant="outline">{resource.mimeType}</Badge>}
          <Badge variant="default">Remote</Badge>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="default"
            size="sm"
            onClick={() => onView(resource)}
            className="flex-1 gap-2"
          >
            <Eye className="w-4 h-4" />
            Read Content
          </Button>
        </div>
      </div>
    </Card>
  )
}

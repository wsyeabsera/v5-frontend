'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText } from 'lucide-react'

interface MCPResourceItemProps {
  resource: {
    uri: string
    name: string
    description?: string
    mimeType?: string
  }
}

export function MCPResourceItem({ resource }: MCPResourceItemProps) {
  return (
    <Card className="p-4 hover:border-primary/30 transition-all duration-200">
      <div className="space-y-3">
        {/* Name and URI */}
        <div>
          <div className="flex items-start gap-2">
            <FileText className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base mb-1 line-clamp-1">{resource.name}</h3>
              <p className="text-xs text-muted-foreground font-mono break-all line-clamp-2">
                {resource.uri}
              </p>
            </div>
          </div>
        </div>

        {/* Description */}
        {resource.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{resource.description}</p>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
          {resource.mimeType && <Badge variant="outline" className="text-xs">{resource.mimeType}</Badge>}
          <Badge variant="default" className="text-xs">Remote</Badge>
        </div>
      </div>
    </Card>
  )
}

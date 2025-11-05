'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { JsonViewer } from '@/components/ui/json-viewer'

interface ToolViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tool: {
    name: string
    description?: string
    inputSchema?: any
    source?: 'remote' | 'local'
    operationType?: 'query' | 'mutation'
    entityType?: 'facility' | 'shipment' | 'contaminant' | 'contract' | 'inspection' | 'other'
  } | null
}

export function ToolViewDialog({ open, onOpenChange, tool }: ToolViewDialogProps) {
  if (!tool) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {tool.name}
            <div className="flex gap-2">
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
          </DialogTitle>
          <DialogDescription>{tool.description || 'No description available'}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Description */}
            {tool.description && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              </div>
            )}

            {/* Input Schema */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Input Schema</h4>
              <JsonViewer
                data={tool.inputSchema || {}}
                maxHeight="400px"
                collapsible={true}
                defaultExpanded={false}
                searchable={true}
                showCopyButton={true}
              />
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}


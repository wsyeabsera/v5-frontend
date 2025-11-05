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

interface PromptViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prompt: {
    name: string
    description?: string
    arguments?: Array<{ name: string; description?: string; required?: boolean }>
    source?: 'remote' | 'local'
  } | null
}

export function PromptViewDialog({ open, onOpenChange, prompt }: PromptViewDialogProps) {
  if (!prompt) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {prompt.name}
            {prompt.source && (
              <Badge variant={prompt.source === 'remote' ? 'default' : 'secondary'}>
                {prompt.source}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>{prompt.description || 'No description available'}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Description */}
            {prompt.description && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">{prompt.description}</p>
              </div>
            )}

            {/* Arguments */}
            {prompt.arguments && prompt.arguments.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Arguments</h4>
                <div className="space-y-3">
                  {prompt.arguments.map((arg, index) => (
                    <div key={index} className="rounded-md border p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{arg.name}</span>
                        {arg.required && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                      {arg.description && (
                        <p className="text-xs text-muted-foreground">{arg.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}


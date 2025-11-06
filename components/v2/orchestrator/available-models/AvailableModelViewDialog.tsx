'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface AvailableModelViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  model?: any
}

export function AvailableModelViewDialog({
  open,
  onOpenChange,
  model,
}: AvailableModelViewDialogProps) {
  if (!model) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{model.modelName}</DialogTitle>
          <DialogDescription>Model details and configuration</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Provider</div>
            <Badge variant="default">{model.provider}</Badge>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Model Name</div>
            <div className="text-sm">{model.modelName}</div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Model ID</div>
            <div className="text-sm font-mono text-muted-foreground">
              {model.modelId || 'Not specified'}
            </div>
          </div>

          {model._id && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">ID</div>
                <div className="text-xs font-mono text-muted-foreground">{model._id}</div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}


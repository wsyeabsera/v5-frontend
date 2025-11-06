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
import { useOrchestratorAvailableModel } from '@/lib/queries-v2'
import { Loader2 } from 'lucide-react'

interface AgentConfigViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config?: any
}

export function AgentConfigViewDialog({
  open,
  onOpenChange,
  config,
}: AgentConfigViewDialogProps) {
  const { data: model, isLoading: modelLoading } = useOrchestratorAvailableModel(
    config?.availableModelId || ''
  )

  if (!config) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agent Config Details</DialogTitle>
          <DialogDescription>Configuration details and model information</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Status</div>
            <Badge variant={config.isEnabled ? 'default' : 'secondary'}>
              {config.isEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Max Token Count</div>
            <div className="text-sm">{config.maxTokenCount.toLocaleString()}</div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Available Model</div>
            {modelLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading model...</span>
              </div>
            ) : model ? (
              <div className="space-y-1">
                <div className="text-sm">{model.modelName}</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{model.provider}</Badge>
                  {model.modelId && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {model.modelId}
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Model not found</div>
            )}
          </div>

          {config._id && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">ID</div>
                <div className="text-xs font-mono text-muted-foreground">{config._id}</div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}


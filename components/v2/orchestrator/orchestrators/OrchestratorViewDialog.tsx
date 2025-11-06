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
import { ScrollArea } from '@/components/ui/scroll-area'
import { useOrchestratorAgentConfig } from '@/lib/queries-v2'
import { Loader2 } from 'lucide-react'

interface OrchestratorViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orchestrator?: any
}

function AgentConfigDisplay({ configId }: { configId: string }) {
  const { data: config, isLoading } = useOrchestratorAgentConfig(configId)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    )
  }

  if (!config) {
    return <span className="text-xs text-muted-foreground">Config not found</span>
  }

  return (
    <div className="text-xs">
      <span className="font-mono">{configId.substring(0, 8)}...</span>
      <Badge variant="outline" className="ml-2 text-xs">
        {config.isEnabled ? 'Enabled' : 'Disabled'}
      </Badge>
    </div>
  )
}

export function OrchestratorViewDialog({
  open,
  onOpenChange,
  orchestrator,
}: OrchestratorViewDialogProps) {
  if (!orchestrator) return null

  const config = orchestrator.config || {}
  const agentConfigs = config.agentConfigs || {}
  const timeouts = config.timeouts || {}

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{orchestrator.name}</DialogTitle>
          <DialogDescription>Orchestrator details and configuration</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4 py-4">
            {/* Basic Info */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Description</div>
              <div className="text-sm">{orchestrator.description || 'No description'}</div>
            </div>

            {orchestrator.status && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Status</div>
                  <Badge variant="outline">{orchestrator.status}</Badge>
                </div>
              </>
            )}

            {/* Agent Configs */}
            {Object.keys(agentConfigs).length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">Agent Configurations</div>
                  <div className="space-y-2">
                    {Object.entries(agentConfigs).map(([phase, configId]: [string, any]) => (
                      <div key={phase} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{phase} Phase</span>
                        <AgentConfigDisplay configId={configId} />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Timeouts */}
            {Object.keys(timeouts).length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">Timeouts (ms)</div>
                  <div className="space-y-2">
                    {Object.entries(timeouts).map(([phase, timeout]: [string, any]) => (
                      <div key={phase} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{phase}</span>
                        <span className="text-sm font-mono">{timeout.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Error Handling */}
            {config.errorHandling && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Error Handling</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{config.errorHandling}</Badge>
                    {config.maxRetries !== undefined && (
                      <span className="text-sm text-muted-foreground">
                        Max retries: {config.maxRetries}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Memory */}
            {config.enableMemory !== undefined && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Memory</div>
                  <Badge variant={config.enableMemory ? 'default' : 'secondary'}>
                    {config.enableMemory ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </>
            )}

            {/* ID */}
            {orchestrator._id && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">ID</div>
                  <div className="text-xs font-mono text-muted-foreground">{orchestrator._id}</div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}


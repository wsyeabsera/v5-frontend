'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Eye, Edit, Trash2, Play } from 'lucide-react'

interface OrchestratorCardProps {
  orchestrator: {
    _id: string
    name: string
    description?: string
    status?: string
    config?: {
      agentConfigs?: {
        thought?: string
        plan?: string
        execute?: string
        summary?: string
      }
      errorHandling?: string
      enableMemory?: boolean
    }
  }
  onView: (orchestrator: any) => void
  onEdit: (orchestrator: any) => void
  onDelete: (orchestrator: any) => void
  onExecute?: (orchestrator: any) => void
}

export function OrchestratorCard({
  orchestrator,
  onView,
  onEdit,
  onDelete,
  onExecute,
}: OrchestratorCardProps) {
  const hasConfig = !!orchestrator.config?.agentConfigs
  const agentConfigsCount = hasConfig
    ? Object.keys(orchestrator.config.agentConfigs || {}).length
    : 0

  return (
    <Card className="p-6 hover:border-primary/30 transition-all duration-200">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg">{orchestrator.name}</h3>
            {orchestrator.status && (
              <Badge variant="outline">{orchestrator.status}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {orchestrator.description || 'No description'}
          </p>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2">
          {hasConfig && (
            <Badge variant="outline">
              {agentConfigsCount} phase{agentConfigsCount !== 1 ? 's' : ''} configured
            </Badge>
          )}
          {orchestrator.config?.errorHandling && (
            <Badge variant="outline" className="bg-muted">
              Error: {orchestrator.config.errorHandling}
            </Badge>
          )}
          {orchestrator.config?.enableMemory && (
            <Badge variant="default">Memory Enabled</Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(orchestrator)}
            className="flex-1 gap-2"
          >
            <Eye className="w-4 h-4" />
            View
          </Button>
          {onExecute && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onExecute(orchestrator)}
              className="flex-1 gap-2"
            >
              <Play className="w-4 h-4" />
              Execute
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(orchestrator)}
            className="flex-1 gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(orchestrator)}
            className="gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}


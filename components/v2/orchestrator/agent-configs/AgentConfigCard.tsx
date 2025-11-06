'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Eye, Edit, Trash2 } from 'lucide-react'

interface AgentConfigCardProps {
  config: {
    _id: string
    availableModelId: string
    maxTokenCount: number
    isEnabled: boolean
    availableModel?: {
      provider: string
      modelName: string
    }
  }
  onView: (config: any) => void
  onEdit: (config: any) => void
  onDelete: (config: any) => void
}

export function AgentConfigCard({ config, onView, onEdit, onDelete }: AgentConfigCardProps) {
  return (
    <Card className="p-6 hover:border-primary/30 transition-all duration-200">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg">Agent Config</h3>
            <Badge variant={config.isEnabled ? 'default' : 'secondary'}>
              {config.isEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          {config.availableModel && (
            <p className="text-sm text-muted-foreground">
              {config.availableModel.provider} - {config.availableModel.modelName}
            </p>
          )}
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            Max Tokens: {config.maxTokenCount.toLocaleString()}
          </Badge>
          {config.availableModel && (
            <Badge variant="outline" className="bg-muted">
              {config.availableModel.provider}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(config)}
            className="flex-1 gap-2"
          >
            <Eye className="w-4 h-4" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(config)}
            className="flex-1 gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(config)}
            className="gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}


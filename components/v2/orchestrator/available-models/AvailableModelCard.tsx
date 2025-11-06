'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Eye, Edit, Trash2 } from 'lucide-react'

interface AvailableModelCardProps {
  model: {
    _id: string
    provider: string
    modelName: string
    modelId?: string
  }
  onView: (model: any) => void
  onEdit: (model: any) => void
  onDelete: (model: any) => void
}

export function AvailableModelCard({ model, onView, onEdit, onDelete }: AvailableModelCardProps) {
  return (
    <Card className="p-6 hover:border-primary/30 transition-all duration-200">
      <div className="space-y-4">
        {/* Name and Description */}
        <div>
          <h3 className="font-semibold text-lg mb-2">{model.modelName}</h3>
          <p className="text-sm text-muted-foreground">
            {model.modelId || 'No model ID specified'}
          </p>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">{model.provider}</Badge>
          {model.modelId && (
            <Badge variant="outline" className="font-mono text-xs">
              {model.modelId}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(model)}
            className="flex-1 gap-2"
          >
            <Eye className="w-4 h-4" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(model)}
            className="flex-1 gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(model)}
            className="gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}


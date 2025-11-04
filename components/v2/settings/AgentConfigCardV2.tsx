'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useDeleteAgentConfigV2, useUpdateAgentConfigV2, useAvailableModel } from '@/lib/queries-v2'
import { Pencil, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

interface AgentConfigCardV2Props {
  config: {
    _id: string
    availableModelId: string
    apiKey: string
    maxTokenCount: number
    isEnabled: boolean
    createdAt?: string
    updatedAt?: string
  }
  onEdit: (config: {
    _id: string
    availableModelId: string
    apiKey: string
    maxTokenCount: number
    isEnabled: boolean
  }) => void
}

export function AgentConfigCardV2({ config, onEdit }: AgentConfigCardV2Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const deleteMutation = useDeleteAgentConfigV2()
  const updateMutation = useUpdateAgentConfigV2()
  const { data: model } = useAvailableModel(config.availableModelId)

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(config._id)
    } catch (error) {
      console.error('Failed to delete agent config:', error)
    }
  }

  const handleToggleEnabled = async () => {
    try {
      await updateMutation.mutateAsync({
        id: config._id,
        updates: { isEnabled: !config.isEnabled },
      })
    } catch (error) {
      console.error('Failed to toggle enabled status:', error)
    }
  }

  const modelDisplayName = model
    ? `${model.provider} - ${model.modelName}`
    : 'Loading...'

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="border-border/50 hover:border-primary/30 transition-all duration-200">
        <CollapsibleTrigger asChild>
          <div className="p-6 cursor-pointer">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{modelDisplayName}</h3>
                  <Badge variant={config.isEnabled ? 'default' : 'secondary'}>
                    {config.isEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                {config.createdAt && (
                  <p className="text-xs text-muted-foreground">
                    Created: {new Date(config.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4">
                {isExpanded && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleEnabled()
                    }}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      config.isEnabled ? 'Disable' : 'Enable'
                    )}
                  </Button>
                )}
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-6 pb-6 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Model ID</p>
              <p className="text-sm font-mono">{config.availableModelId}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">API Key</p>
              <p className="text-sm font-mono">
                {config.apiKey.length > 12
                  ? `${config.apiKey.substring(0, 8)}...${config.apiKey.substring(config.apiKey.length - 4)}`
                  : '••••••••'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Max Token Count</p>
              <p className="text-sm">{config.maxTokenCount.toLocaleString()}</p>
            </div>
            {config.updatedAt && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
                <p className="text-sm">{new Date(config.updatedAt).toLocaleString()}</p>
              </div>
            )}
            <div className="flex items-center gap-2 pt-4 border-t border-border/40">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(config)}
                disabled={deleteMutation.isPending || updateMutation.isPending}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleteMutation.isPending || updateMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Configuration?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this agent configuration?
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

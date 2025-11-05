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
import { useThought } from '@/lib/queries-v2'
import { Loader2, Calendar } from 'lucide-react'
import { JsonViewer } from '@/components/ui/json-viewer'

interface ThoughtViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  thoughtId: string | null
}

export function ThoughtViewDialog({ open, onOpenChange, thoughtId }: ThoughtViewDialogProps) {
  const { data: thought, isLoading, error } = useThought(thoughtId || '')

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thought Details</DialogTitle>
          <DialogDescription>
            View the complete thought data including reasoning, approaches, and constraints.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Loading thought...</span>
          </div>
        )}

        {error && (
          <div className="p-6 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
            <div className="font-semibold text-red-900 dark:text-red-100">
              Failed to load thought
            </div>
            <div className="text-sm text-red-700 dark:text-red-300 mt-1">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </div>
          </div>
        )}

        {thought && !isLoading && (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-sm mb-2">User Query</h3>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  {thought.userQuery || 'No query provided'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {thought.agentConfigId && (
                  <div>
                    <span className="text-xs text-muted-foreground mr-2">Agent Config:</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {thought.agentConfigId}
                    </Badge>
                  </div>
                )}
                {thought.createdAt && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>Created: {new Date(thought.createdAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Thoughts Array */}
            {Array.isArray(thought.thoughts) && thought.thoughts.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">
                  Thoughts ({thought.thoughts.length})
                </h3>
                <div className="space-y-4">
                  {thought.thoughts.map((t: any, index: number) => (
                    <div
                      key={t.id || index}
                      className="border rounded-lg p-4 space-y-3 bg-muted/30"
                    >
                      {t.reasoning && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Reasoning</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {t.reasoning}
                          </p>
                        </div>
                      )}
                      {Array.isArray(t.approaches) && t.approaches.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Approaches</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {t.approaches.map((approach: string, i: number) => (
                              <li key={i}>{approach}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {Array.isArray(t.constraints) && t.constraints.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Constraints</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {t.constraints.map((constraint: string, i: number) => (
                              <li key={i}>{constraint}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {Array.isArray(t.assumptions) && t.assumptions.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Assumptions</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {t.assumptions.map((assumption: string, i: number) => (
                              <li key={i}>{assumption}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {Array.isArray(t.uncertainties) && t.uncertainties.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Uncertainties</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {t.uncertainties.map((uncertainty: string, i: number) => (
                              <li key={i}>{uncertainty}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {typeof t.confidence === 'number' && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Confidence</h4>
                          <Badge variant="secondary">
                            {(t.confidence * 100).toFixed(1)}%
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Raw Data */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Raw Data</h3>
              <JsonViewer data={thought} collapsible defaultExpanded={false} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}


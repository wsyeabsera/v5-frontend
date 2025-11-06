'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useTriggerBackfill, useBackfillStatus } from '@/lib/queries-v2'
import { Loader2, Play } from 'lucide-react'
// Toast will be handled via UI feedback - removing toast dependency for now
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

export function BackfillControls() {
  const [orchestratorId, setOrchestratorId] = useState('')
  const triggerBackfill = useTriggerBackfill()
  const { data: backfillStatus } = useBackfillStatus()
  const handleTriggerBackfill = async () => {
    try {
      await triggerBackfill.mutateAsync({
        orchestratorId: orchestratorId || undefined,
      })
      // Success feedback will be shown via UI state
    } catch (error: any) {
      // Error feedback will be shown via UI state
      console.error('Backfill error:', error)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Trigger Backfill</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="orchestrator-id">Orchestrator ID (optional)</Label>
            <Input
              id="orchestrator-id"
              placeholder="Leave empty for all orchestrators"
              value={orchestratorId}
              onChange={(e) => setOrchestratorId(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button
            onClick={handleTriggerBackfill}
            disabled={triggerBackfill.isPending}
          >
            {triggerBackfill.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Start Backfill
          </Button>
        </div>
      </Card>

      {backfillStatus && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Backfill Status</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={backfillStatus.status === 'completed' ? 'default' : 'outline'}>
                {backfillStatus.status || 'unknown'}
              </Badge>
            </div>
            {backfillStatus.progress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {backfillStatus.progress.processed || 0} / {backfillStatus.progress.total || 0}
                  </span>
                </div>
                <Progress
                  value={
                    backfillStatus.progress.total > 0
                      ? ((backfillStatus.progress.processed || 0) / backfillStatus.progress.total) * 100
                      : 0
                  }
                />
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}


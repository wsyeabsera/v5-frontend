'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useExtractPatterns, useOrchestrators } from '@/lib/queries-v2'
import { Loader2, Play } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function PatternExtraction() {
  const [orchestratorId, setOrchestratorId] = useState<string>('all')
  const extractPatterns = useExtractPatterns()
  const { data: orchestrators } = useOrchestrators()
  const { toast } = useToast()

  const handleExtract = async () => {
    try {
      await extractPatterns.mutateAsync({
        orchestratorId: orchestratorId === 'all' ? undefined : orchestratorId,
      })
      toast({
        title: 'Pattern Extraction Started',
        description: 'Pattern extraction has been initiated. Check the Patterns tab to see results.',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to extract patterns',
        variant: 'destructive',
      })
    }
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Extract Patterns</h3>
      <div className="space-y-4">
        <div>
          <Label htmlFor="orchestrator-id">Orchestrator (optional)</Label>
          <Select value={orchestratorId} onValueChange={(value) => setOrchestratorId(value)}>
            <SelectTrigger id="orchestrator-id" className="mt-1">
              <SelectValue placeholder="Select an orchestrator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orchestrators</SelectItem>
              {(orchestrators || []).map((orch: any) => {
                const id = orch._id || orch.id
                return (
                  <SelectItem key={id} value={id}>
                    {orch.name}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Select a specific orchestrator or leave empty to extract patterns from all orchestrators
          </p>
        </div>
        <Button onClick={handleExtract} disabled={extractPatterns.isPending} className="w-full">
          {extractPatterns.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Extracting...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Extract Patterns
            </>
          )}
        </Button>
        {extractPatterns.isPending && (
          <div className="text-sm text-muted-foreground">
            Pattern extraction is in progress. This may take a few moments...
          </div>
        )}
      </div>
    </Card>
  )
}


'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useClassifyQuery, useOrchestrators } from '@/lib/queries-v2'
import { Loader2, Play } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ClassificationTesterProps {
  onClassificationComplete?: (classification: any) => void
}

export function ClassificationTester({ onClassificationComplete }: ClassificationTesterProps) {
  const [query, setQuery] = useState('')
  const [orchestratorId, setOrchestratorId] = useState<string>('')
  const { data: orchestrators } = useOrchestrators()
  const classifyQuery = useClassifyQuery()
  const { toast } = useToast()

  const handleClassify = async () => {
    if (!query.trim() || !orchestratorId) {
      toast({
        title: 'Error',
        description: 'Please enter a query and select an orchestrator',
        variant: 'destructive',
      })
      return
    }

    try {
      const result = await classifyQuery.mutateAsync({ 
        query: query.trim(), 
        orchestratorId: orchestratorId 
      })
      // Include query and orchestratorId in the result for the Details tab
      const fullResult = {
        ...result,
        query: query.trim(),
        orchestratorId,
        timestamp: new Date().toISOString(),
      }
      if (onClassificationComplete) {
        onClassificationComplete(fullResult)
      }
      toast({
        title: 'Classification Complete',
        description: `Classified as ${result.category} (${result.complexity})`,
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to classify query',
        variant: 'destructive',
      })
    }
  }

  const classification = classifyQuery.data

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="orchestrator">Orchestrator</Label>
            <Select 
              value={orchestratorId} 
              onValueChange={(value) => {
                setOrchestratorId(value)
              }}
            >
              <SelectTrigger id="orchestrator" className="mt-1">
                <SelectValue placeholder="Select an orchestrator" />
              </SelectTrigger>
              <SelectContent>
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
          </div>

          <div>
            <Label htmlFor="query">Query to Classify</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="query"
                placeholder="Enter a query to classify..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleClassify()}
                className="flex-1"
              />
              <Button onClick={handleClassify} disabled={!query.trim() || !orchestratorId.trim() || classifyQuery.isPending}>
                {classifyQuery.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Classify
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {classifyQuery.isPending && (
        <Card className="p-12">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Classifying query...</span>
          </div>
        </Card>
      )}

      {classifyQuery.error && (
        <Card className="p-6 border-red-200 bg-red-50 dark:bg-red-950/20">
          <div className="text-red-600">Error: {classifyQuery.error.message}</div>
        </Card>
      )}

      {classification && (
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-4">Classification Result</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Badge className="mt-1 text-base px-3 py-1">{classification.category}</Badge>
                </div>
                <div>
                  <Label>Complexity</Label>
                  <Badge variant="outline" className="mt-1 text-base px-3 py-1">
                    {classification.complexity}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <Label>Confidence</Label>
                  <div className="mt-1">
                    <Progress value={classification.confidence || 0} className="h-2" />
                    <span className="text-sm text-muted-foreground mt-1 block">
                      {classification.confidence || 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {classification.reasoning && (
              <div>
                <Label>Reasoning</Label>
                <p className="text-sm mt-1 p-3 bg-muted rounded-md">{classification.reasoning}</p>
              </div>
            )}

            {classification.suggestedConfig && (
              <div>
                <Label>Suggested Configuration</Label>
                <pre className="text-xs mt-1 p-3 bg-muted rounded-md overflow-auto">
                  {JSON.stringify(classification.suggestedConfig, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}


'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface PatternDetailsProps {
  pattern: any
}

export function PatternDetails({ pattern }: PatternDetailsProps) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">
              {pattern.name || 'Pattern Details'}
            </h3>
            <Badge
              variant={
                pattern.patternType === 'success'
                  ? 'default'
                  : pattern.patternType === 'failure'
                    ? 'destructive'
                    : 'outline'
              }
            >
              {pattern.patternType || 'unknown'}
            </Badge>
          </div>

          {pattern.description && (
            <div>
              <Label>Description</Label>
              <p className="text-sm mt-1">{pattern.description}</p>
            </div>
          )}

          {pattern.statistics && (
            <div className="grid grid-cols-2 gap-4">
              {pattern.statistics.occurrenceCount !== undefined && (
                <div>
                  <Label>Occurrence Count</Label>
                  <p className="text-sm font-medium mt-1">{pattern.statistics.occurrenceCount}</p>
                </div>
              )}
              {pattern.statistics.successRate !== undefined && (
                <div>
                  <Label>Success Rate</Label>
                  <p className="text-sm font-medium mt-1">
                    {pattern.statistics.successRate.toFixed(1)}%
                  </p>
                </div>
              )}
              {pattern.statistics.averageConfidence !== undefined && (
                <div>
                  <Label>Avg Confidence</Label>
                  <p className="text-sm font-medium mt-1">
                    {pattern.statistics.averageConfidence.toFixed(1)}%
                  </p>
                </div>
              )}
              {pattern.statistics.averageLatency !== undefined && (
                <div>
                  <Label>Avg Latency</Label>
                  <p className="text-sm font-medium mt-1">
                    {pattern.statistics.averageLatency.toFixed(0)}ms
                  </p>
                </div>
              )}
            </div>
          )}

          {pattern.recommendations && (
            <div>
              <Label>Recommendations</Label>
              <pre className="text-xs mt-1 p-3 bg-muted rounded-md overflow-auto">
                {JSON.stringify(pattern.recommendations, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </Card>

      {pattern.examples && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Examples</h3>
          <Tabs defaultValue="queries">
            <TabsList>
              <TabsTrigger value="queries">Queries</TabsTrigger>
              <TabsTrigger value="executions">Executions</TabsTrigger>
            </TabsList>
            <TabsContent value="queries" className="mt-4">
              {pattern.examples.queries && pattern.examples.queries.length > 0 ? (
                <div className="space-y-2">
                  {pattern.examples.queries.map((query: string, index: number) => (
                    <div key={index} className="p-2 bg-muted rounded text-sm">
                      {query}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No query examples available</div>
              )}
            </TabsContent>
            <TabsContent value="executions" className="mt-4">
              {pattern.examples.executionIds && pattern.examples.executionIds.length > 0 ? (
                <div className="space-y-2">
                  {pattern.examples.executionIds.map((id: string, index: number) => (
                    <div key={index} className="p-2 bg-muted rounded text-sm font-mono">
                      {id}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No execution examples available</div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      )}
    </div>
  )
}


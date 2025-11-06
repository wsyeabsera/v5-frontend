'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface ClassificationDetailsProps {
  classification: any
}

export function ClassificationDetails({ classification }: ClassificationDetailsProps) {
  if (!classification) {
    return (
      <Card className="p-12">
        <div className="text-center text-muted-foreground">
          Select a classification from the history to view details
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-lg">Classification Details</h3>
          {classification.executionId && (
            <Link href={`/v2/orchestrator/orchestrations?executionId=${classification.executionId}`}>
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Execution
              </Button>
            </Link>
          )}
        </div>

        <div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <div className="mt-1">
                <Badge variant="outline" className="capitalize">
                  {classification.category || 'other'}
                </Badge>
              </div>
            </div>
            <div>
              <Label>Complexity</Label>
              <div className="mt-1">
                <Badge variant="outline" className="capitalize">
                  {classification.complexity || 'medium'}
                </Badge>
              </div>
            </div>
            <div>
              <Label>Confidence</Label>
              <div className="mt-1 space-y-1">
                <Progress value={classification.confidence || 0} className="h-2" />
                <span className="text-sm text-muted-foreground">
                  {classification.confidence || 0}%
                </span>
              </div>
            </div>
            {classification.timestamp && (
              <div>
                <Label>Timestamp</Label>
                <p className="text-sm mt-1">
                  {new Date(classification.timestamp).toLocaleString()}
                </p>
              </div>
            )}
            {classification.status && (
              <div>
                <Label>Status</Label>
                <div className="mt-1">
                  <Badge
                    variant={
                      classification.status === 'completed'
                        ? 'default'
                        : classification.status === 'failed'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {classification.status}
                  </Badge>
                </div>
              </div>
            )}
            {classification.executionId && (
              <div>
                <Label>Execution ID</Label>
                <p className="text-sm mt-1 font-mono text-xs break-all">
                  {classification.executionId}
                </p>
              </div>
            )}
          </div>
        </div>

        {classification.query && (
          <div>
            <Label>Query</Label>
            <p className="text-sm mt-1 p-3 bg-muted rounded-md break-words">
              {classification.query}
            </p>
          </div>
        )}

        {classification.reasoning && (
          <div>
            <Label>Reasoning</Label>
            <p className="text-sm mt-1 p-3 bg-muted rounded-md whitespace-pre-wrap break-words">
              {classification.reasoning}
            </p>
          </div>
        )}

        {classification.suggestedConfig && (
          <div>
            <Label>Suggested Configuration</Label>
            <pre className="text-xs mt-1 p-3 bg-muted rounded-md overflow-auto max-h-64">
              {JSON.stringify(classification.suggestedConfig, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Card>
  )
}


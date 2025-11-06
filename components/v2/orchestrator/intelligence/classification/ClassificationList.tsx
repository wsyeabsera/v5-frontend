'use client'

import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useOrchestrations } from '@/lib/queries-v2'

interface ClassificationListProps {
  searchQuery: string
  categoryFilter: string
  complexityFilter: string
  onSelect: (classification: any) => void
}

export function ClassificationList({
  searchQuery,
  categoryFilter,
  complexityFilter,
  onSelect,
}: ClassificationListProps) {
  // Get orchestrations and extract classifications
  const { data: orchestrations, isLoading } = useOrchestrations({ limit: 1000 })

  // Extract classifications from orchestrations
  const classifications = useMemo(() => {
    if (!orchestrations) return []
    
    return orchestrations
      .filter((orch: any) => orch.classification)
      .map((orch: any) => ({
        executionId: orch._id || orch.id,
        query: orch.userQuery,
        category: orch.classification?.category || 'other',
        complexity: orch.classification?.complexity || 'medium',
        confidence: orch.classification?.confidence || 0,
        timestamp: orch.startedAt || orch.createdAt,
        orchestratorId: orch.orchestratorId,
        status: orch.status,
      }))
      .sort((a: any, b: any) => {
        const dateA = new Date(a.timestamp).getTime()
        const dateB = new Date(b.timestamp).getTime()
        return dateB - dateA // Most recent first
      })
  }, [orchestrations])

  const filtered = useMemo(() => {
    return classifications.filter((c: any) => {
      if (searchQuery && !c.query?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (categoryFilter !== 'all' && c.category !== categoryFilter) {
        return false
      }
      if (complexityFilter !== 'all' && c.complexity !== complexityFilter) {
        return false
      }
      return true
    })
  }, [classifications, searchQuery, categoryFilter, complexityFilter])

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-[600px]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          {filtered.length} classification{filtered.length !== 1 ? 's' : ''} found
          {classifications.length !== filtered.length && (
            <span className="ml-2">
              (filtered from {classifications.length} total)
            </span>
          )}
        </p>
      </div>
      <ScrollArea className="h-[600px]">
        <div className="space-y-4 pr-4">
          {filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>No classifications found</p>
              <p className="text-xs mt-2">
                {classifications.length === 0
                  ? 'Classifications will appear here after orchestrations are executed'
                  : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            filtered.map((classification: any) => (
              <Card
                key={classification.executionId}
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSelect(classification)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="capitalize">
                        {classification.category}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {classification.complexity}
                      </Badge>
                      <Badge variant="outline">
                        {classification.confidence}% confidence
                      </Badge>
                      {classification.status && (
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
                      )}
                    </div>
                    <p className="font-medium break-words">{classification.query}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(classification.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Link
                    href={`/v2/orchestrator/orchestrations?executionId=${classification.executionId}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="ghost" size="sm" className="shrink-0">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  )
}


# Phase 1: Embeddings Status

## Overview

Build a page to monitor embedding generation status, view embedding statistics, and manage embedding backfill operations.

## Page: `app/v2/orchestrator/intelligence/embeddings/page.tsx`

```typescript
'use client'

import { EmbeddingsStatus } from '@/components/v2/orchestrator/intelligence/embeddings/EmbeddingsStatus'
import { Database } from 'lucide-react'

export default function EmbeddingsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Embeddings Status</h1>
        </div>
        <p className="text-muted-foreground">
          Monitor embedding generation status, view statistics, and manage embedding operations.
        </p>
      </div>

      <EmbeddingsStatus />
    </div>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/embeddings/EmbeddingsStatus.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { EmbeddingsTimeline } from './EmbeddingsTimeline'
import { BackfillControls } from './BackfillControls'
import { useEmbeddingsStatus, useTriggerBackfill } from '@/lib/queries-v2'
import { Loader2, RefreshCw, Database, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function EmbeddingsStatus() {
  const { data: status, isLoading, error, refetch } = useEmbeddingsStatus()
  const triggerBackfill = useTriggerBackfill()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6 border-red-200 bg-red-50 dark:bg-red-950/20">
        <div className="text-red-600">Error: {error.message}</div>
      </Card>
    )
  }

  const statusData = status || {
    totalExecutions: 0,
    embeddedCount: 0,
    pendingCount: 0,
    failedCount: 0,
    embeddingRate: 0,
    lastGenerated: null,
    indexStatus: 'unknown',
    dimension: 768,
  }

  const completionRate = statusData.totalExecutions > 0
    ? (statusData.embeddedCount / statusData.totalExecutions) * 100
    : 0

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Executions</p>
              <h3 className="text-3xl font-bold mt-2">{statusData.totalExecutions.toLocaleString()}</h3>
            </div>
            <Database className="w-8 h-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Embedded</p>
              <h3 className="text-3xl font-bold mt-2 text-green-600">
                {statusData.embeddedCount.toLocaleString()}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {completionRate.toFixed(1)}% complete
              </p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <h3 className="text-3xl font-bold mt-2 text-yellow-600">
                {statusData.pendingCount.toLocaleString()}
              </h3>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Failed</p>
              <h3 className="text-3xl font-bold mt-2 text-red-600">
                {statusData.failedCount.toLocaleString()}
              </h3>
            </div>
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="p-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Embedding Generation Progress</span>
            <span className="text-sm text-muted-foreground">
              {statusData.embeddedCount} / {statusData.totalExecutions}
            </span>
          </div>
          <Progress value={completionRate} className="h-3" />
        </div>
      </Card>

      {/* Index Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold mb-2">Pinecone Index Status</h3>
            <div className="flex items-center gap-2">
              <Badge variant={statusData.indexStatus === 'healthy' ? 'default' : 'destructive'}>
                {statusData.indexStatus}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Dimension: {statusData.dimension}
              </span>
            </div>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="timeline">Generation Timeline</TabsTrigger>
          <TabsTrigger value="backfill">Backfill Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <EmbeddingsTimeline />
        </TabsContent>

        <TabsContent value="backfill" className="space-y-4">
          <BackfillControls />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/embeddings/EmbeddingsTimeline.tsx`

```typescript
'use client'

import { useEmbeddingsTimeline } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export function EmbeddingsTimeline() {
  const { data: timeline, isLoading } = useEmbeddingsTimeline()

  if (isLoading) {
    return (
      <Card className="p-12">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </Card>
    )
  }

  // Timeline chart would go here
  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Embedding Generation Over Time</h3>
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        Timeline chart placeholder
      </div>
    </Card>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/embeddings/BackfillControls.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useTriggerBackfill, useBackfillStatus } from '@/lib/queries-v2'
import { Loader2, Play, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function BackfillControls() {
  const [orchestratorId, setOrchestratorId] = useState('')
  const triggerBackfill = useTriggerBackfill()
  const { data: backfillStatus } = useBackfillStatus()
  const { toast } = useToast()

  const handleTriggerBackfill = async () => {
    try {
      await triggerBackfill.mutateAsync({
        orchestratorId: orchestratorId || undefined,
      })
      toast({
        title: 'Backfill Started',
        description: 'Embedding backfill operation has been started',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
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
                {backfillStatus.status}
              </Badge>
            </div>
            {backfillStatus.progress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {backfillStatus.progress.processed} / {backfillStatus.progress.total}
                  </span>
                </div>
                <Progress
                  value={(backfillStatus.progress.processed / backfillStatus.progress.total) * 100}
                />
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
```

## API Client Extension: `lib/mcp-client-orchestrator.ts`

Add these methods:

```typescript
async getEmbeddingsStatus() {
  return this.request('get_embeddings_status', {})
}

async getEmbeddingsTimeline(timeRange?: string) {
  return this.request('get_embeddings_timeline', { timeRange })
}

async triggerBackfill(options?: { orchestratorId?: string }) {
  return this.request('trigger_embeddings_backfill', options || {})
}

async getBackfillStatus() {
  return this.request('get_backfill_status', {})
}
```

## Query Hooks: `lib/queries-v2.ts`

Add these hooks:

```typescript
export function useEmbeddingsStatus() {
  return useQuery({
    queryKey: ['intelligence', 'embeddings', 'status'],
    queryFn: () => mcpClientOrchestrator.getEmbeddingsStatus(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  })
}

export function useEmbeddingsTimeline(timeRange?: string) {
  return useQuery({
    queryKey: ['intelligence', 'embeddings', 'timeline', timeRange],
    queryFn: () => mcpClientOrchestrator.getEmbeddingsTimeline(timeRange),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useTriggerBackfill() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (options?: { orchestratorId?: string }) =>
      mcpClientOrchestrator.triggerBackfill(options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intelligence', 'embeddings'] })
    },
  })
}

export function useBackfillStatus() {
  return useQuery({
    queryKey: ['intelligence', 'embeddings', 'backfill-status'],
    queryFn: () => mcpClientOrchestrator.getBackfillStatus(),
    staleTime: 1000 * 10, // 10 seconds
    refetchInterval: 1000 * 10, // Refetch every 10 seconds when backfill is running
  })
}
```

## Sidebar Update: `components/layout/Sidebar.tsx`

Add to the Orchestrator group:

```typescript
{ name: 'Embeddings Status', href: '/v2/orchestrator/intelligence/embeddings', icon: Database },
```

## Notes

- Embeddings status is refreshed every 5 minutes
- Backfill status is polled every 10 seconds when active
- Users can trigger backfill for all orchestrators or a specific one
- Timeline shows embedding generation over time

## Next Blueprint

Read `04-PHASE-2-CLASSIFICATION.md` for Query Classification Monitor implementation.


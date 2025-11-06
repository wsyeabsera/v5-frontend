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
              <h3 className="text-3xl font-bold mt-2">{statusData.totalExecutions?.toLocaleString() || '0'}</h3>
            </div>
            <Database className="w-8 h-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Embedded</p>
              <h3 className="text-3xl font-bold mt-2 text-green-600">
                {statusData.embeddedCount?.toLocaleString() || '0'}
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
                {statusData.pendingCount?.toLocaleString() || '0'}
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
                {statusData.failedCount?.toLocaleString() || '0'}
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
              {statusData.embeddedCount || 0} / {statusData.totalExecutions || 0}
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
                {statusData.indexStatus || 'unknown'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Dimension: {statusData.dimension || 768}
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


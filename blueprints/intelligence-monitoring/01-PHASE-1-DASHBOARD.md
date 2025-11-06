# Phase 1: Intelligence Dashboard

## Overview

Build a comprehensive dashboard that provides an overview of all intelligence features, their health status, and key metrics.

## Page: `app/v2/orchestrator/intelligence/dashboard/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { IntelligenceDashboard } from '@/components/v2/orchestrator/intelligence/dashboard/IntelligenceDashboard'
import { DashboardLayout } from '@/components/v2/orchestrator/dashboard/DashboardLayout'
import { TimeRangeSelector, TimeRange } from '@/components/v2/orchestrator/dashboard/TimeRangeSelector'
import { Brain } from 'lucide-react'

export default function IntelligenceDashboardPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')

  return (
    <div className="container mx-auto py-8 px-4 max-w-[95vw]">
      <DashboardLayout
        title="Intelligence Dashboard"
        description="Overview of orchestrator intelligence features, health status, and performance metrics"
        timeRangeSelector={
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        }
      >
        <IntelligenceDashboard timeRange={timeRange} />
      </DashboardLayout>
    </div>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/dashboard/IntelligenceDashboard.tsx`

```typescript
'use client'

import { IntelligenceStats } from './IntelligenceStats'
import { IntelligenceHealth } from './IntelligenceHealth'
import { IntelligenceCharts } from './IntelligenceCharts'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RefreshCw, Download, Settings } from 'lucide-react'
import Link from 'next/link'
import { TimeRange } from '@/components/v2/orchestrator/dashboard/TimeRangeSelector'

interface IntelligenceDashboardProps {
  timeRange: TimeRange
}

export function IntelligenceDashboard({ timeRange }: IntelligenceDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/v2/orchestrator/intelligence/semantic-search">
          <Button variant="outline" className="gap-2">
            <Search className="w-4 h-4" />
            Semantic Search
          </Button>
        </Link>
        <Link href="/v2/orchestrator/intelligence/embeddings">
          <Button variant="outline" className="gap-2">
            <Database className="w-4 h-4" />
            Embeddings Status
          </Button>
        </Link>
        <Link href="/v2/orchestrator/intelligence/classification">
          <Button variant="outline" className="gap-2">
            <Tag className="w-4 h-4" />
            Query Classification
          </Button>
        </Link>
        <Button variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh Data
        </Button>
      </div>

      {/* Stats Cards */}
      <IntelligenceStats timeRange={timeRange} />

      {/* Health Status */}
      <IntelligenceHealth />

      {/* Charts */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <IntelligenceCharts timeRange={timeRange} type="overview" />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <IntelligenceCharts timeRange={timeRange} type="performance" />
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <IntelligenceCharts timeRange={timeRange} type="usage" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/dashboard/IntelligenceStats.tsx`

```typescript
'use client'

import { useIntelligenceStats } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Database, Search, Tag, Sparkles, Network, TrendingUp, TrendingDown } from 'lucide-react'
import { TimeRange } from '@/components/v2/orchestrator/dashboard/TimeRangeSelector'
import { Loader2 } from 'lucide-react'

interface IntelligenceStatsProps {
  timeRange: TimeRange
}

export function IntelligenceStats({ timeRange }: IntelligenceStatsProps) {
  const { data: stats, isLoading, error } = useIntelligenceStats(timeRange)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-red-600">Error loading stats: {error.message}</div>
      </Card>
    )
  }

  const statsData = stats || {
    totalEmbeddings: 0,
    totalPatterns: 0,
    totalMemories: 0,
    totalClassifications: 0,
    embeddingGenerationRate: 0,
    patternExtractionRate: 0,
    memoryEffectiveness: 0,
    classificationAccuracy: 0,
  }

  const statCards = [
    {
      title: 'Total Embeddings',
      value: statsData.totalEmbeddings.toLocaleString(),
      icon: Database,
      trend: statsData.embeddingGenerationRate,
      description: 'Vector embeddings generated',
    },
    {
      title: 'Patterns Extracted',
      value: statsData.totalPatterns.toLocaleString(),
      icon: Network,
      trend: statsData.patternExtractionRate,
      description: 'Execution patterns identified',
    },
    {
      title: 'Memories Created',
      value: statsData.totalMemories.toLocaleString(),
      icon: Sparkles,
      trend: statsData.memoryEffectiveness,
      description: 'Execution memories stored',
    },
    {
      title: 'Queries Classified',
      value: statsData.totalClassifications.toLocaleString(),
      icon: Tag,
      trend: statsData.classificationAccuracy,
      description: 'Queries analyzed and classified',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat) => {
        const Icon = stat.icon
        const TrendIcon = stat.trend > 0 ? TrendingUp : TrendingDown
        const trendColor = stat.trend > 0 ? 'text-green-600' : 'text-red-600'

        return (
          <Card key={stat.title} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <h3 className="text-3xl font-bold mt-2">{stat.value}</h3>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                {stat.trend !== 0 && (
                  <div className={`flex items-center gap-1 mt-2 ${trendColor}`}>
                    <TrendIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {Math.abs(stat.trend).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              <Icon className="w-8 h-8 text-muted-foreground" />
            </div>
          </Card>
        )
      })}
    </div>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/dashboard/IntelligenceHealth.tsx`

```typescript
'use client'

import { useIntelligenceHealth } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react'

export function IntelligenceHealth() {
  const { data: health, isLoading } = useIntelligenceHealth()

  if (isLoading) {
    return (
      <Card className="p-6">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </Card>
    )
  }

  const healthData = health || {
    pinecone: { status: 'unknown', message: 'Not checked' },
    ollama: { status: 'unknown', message: 'Not checked' },
    embeddings: { status: 'unknown', message: 'Not checked' },
    search: { status: 'unknown', message: 'Not checked' },
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'degraded':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-600">Healthy</Badge>
      case 'degraded':
        return <Badge variant="default" className="bg-yellow-600">Degraded</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const services = [
    { name: 'Pinecone', key: 'pinecone' },
    { name: 'Ollama', key: 'ollama' },
    { name: 'Embeddings', key: 'embeddings' },
    { name: 'Semantic Search', key: 'search' },
  ]

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-lg mb-4">System Health</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((service) => {
          const serviceHealth = healthData[service.key as keyof typeof healthData]
          return (
            <div key={service.key} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(serviceHealth.status)}
                <div>
                  <p className="font-medium text-sm">{service.name}</p>
                  <p className="text-xs text-muted-foreground">{serviceHealth.message}</p>
                </div>
              </div>
              {getStatusBadge(serviceHealth.status)}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/dashboard/IntelligenceCharts.tsx`

```typescript
'use client'

import { useIntelligenceMetrics } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { TimeRange } from '@/components/v2/orchestrator/dashboard/TimeRangeSelector'
import { Loader2 } from 'lucide-react'

interface IntelligenceChartsProps {
  timeRange: TimeRange
  type: 'overview' | 'performance' | 'usage'
}

export function IntelligenceCharts({ timeRange, type }: IntelligenceChartsProps) {
  const { data: metrics, isLoading } = useIntelligenceMetrics(timeRange, type)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  // Chart components would go here
  // For now, placeholder
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Embedding Generation Over Time</h3>
        {/* Chart component would go here */}
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          Chart placeholder
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Classification Distribution</h3>
        {/* Chart component would go here */}
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          Chart placeholder
        </div>
      </Card>
    </div>
  )
}
```

## API Client Extension: `lib/mcp-client-orchestrator.ts`

Add these methods to the `MCPClientOrchestrator` class:

```typescript
// Intelligence Dashboard methods
async getIntelligenceStats(timeRange?: string) {
  return this.request('get_intelligence_stats', { timeRange })
}

async getIntelligenceHealth() {
  return this.request('get_intelligence_health', {})
}

async getIntelligenceMetrics(timeRange?: string, type?: string) {
  return this.request('get_intelligence_metrics', { timeRange, type })
}
```

## Query Hooks: `lib/queries-v2.ts`

Add these hooks:

```typescript
export function useIntelligenceStats(timeRange: TimeRange) {
  return useQuery({
    queryKey: ['intelligence', 'stats', timeRange],
    queryFn: () => mcpClientOrchestrator.getIntelligenceStats(timeRange),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

export function useIntelligenceHealth() {
  return useQuery({
    queryKey: ['intelligence', 'health'],
    queryFn: () => mcpClientOrchestrator.getIntelligenceHealth(),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
  })
}

export function useIntelligenceMetrics(timeRange: TimeRange, type: string) {
  return useQuery({
    queryKey: ['intelligence', 'metrics', timeRange, type],
    queryFn: () => mcpClientOrchestrator.getIntelligenceMetrics(timeRange, type),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}
```

## Sidebar Update: `components/layout/Sidebar.tsx`

Add to the Orchestrator group:

```typescript
{
  group: 'Orchestrator',
  items: [
    // ... existing items
    { name: 'Intelligence Dashboard', href: '/v2/orchestrator/intelligence/dashboard', icon: Brain },
  ]
}
```

## Notes

- The dashboard provides a high-level overview of all intelligence features
- Health status checks should be lightweight and cached
- Stats should be aggregated from execution data
- Charts can use Recharts library if needed
- All data fetching uses TanStack Query for caching and refetching

## Next Blueprint

Read `02-PHASE-1-SEMANTIC-SEARCH.md` for Semantic Search Explorer implementation.


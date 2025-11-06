# Phase 3: Memory Analytics

## Overview

Enhanced memory bank page with analytics, effectiveness tracking, and usage patterns.

## Page: `app/v2/orchestrator/intelligence/memory-analytics/page.tsx`

```typescript
'use client'

import { MemoryAnalytics } from '@/components/v2/orchestrator/intelligence/memory-analytics/MemoryAnalytics'
import { Database } from 'lucide-react'

export default function MemoryAnalyticsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Memory Analytics</h1>
        </div>
        <p className="text-muted-foreground">
          View memory analytics, effectiveness tracking, and usage patterns.
        </p>
      </div>

      <MemoryAnalytics />
    </div>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/memory-analytics/MemoryAnalytics.tsx`

```typescript
'use client'

import { MemoryDashboard } from './MemoryDashboard'
import { MemoryEffectiveness } from './MemoryEffectiveness'
import { MemoryUsage } from './MemoryUsage'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function MemoryAnalytics() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="effectiveness">Effectiveness</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <MemoryDashboard />
        </TabsContent>

        <TabsContent value="effectiveness" className="space-y-4">
          <MemoryEffectiveness />
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <MemoryUsage />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/memory-analytics/MemoryDashboard.tsx`

```typescript
'use client'

import { useMemoryAnalytics } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

export function MemoryDashboard() {
  const { data: analytics, isLoading } = useMemoryAnalytics()

  if (isLoading) {
    return (
      <Card className="p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
      </Card>
    )
  }

  const stats = analytics || {
    totalMemories: 0,
    avgEffectiveness: 0,
    totalUsage: 0,
    categoryBreakdown: {},
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Total Memories</p>
          <h3 className="text-3xl font-bold mt-2">{stats.totalMemories}</h3>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Avg Effectiveness</p>
          <h3 className="text-3xl font-bold mt-2">{stats.avgEffectiveness.toFixed(1)}%</h3>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Total Usage</p>
          <h3 className="text-3xl font-bold mt-2">{stats.totalUsage}</h3>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Categories</p>
          <div className="flex gap-2 mt-2">
            {Object.entries(stats.categoryBreakdown).map(([category, count]: [string, any]) => (
              <Badge key={category} variant="outline">
                {category}: {count}
              </Badge>
            ))}
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Memory Distribution</h3>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Chart placeholder
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Effectiveness Trends</h3>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Chart placeholder
          </div>
        </Card>
      </div>
    </div>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/memory-analytics/MemoryEffectiveness.tsx`

```typescript
'use client'

import { useMemoryEffectiveness } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'

export function MemoryEffectiveness() {
  const { data: effectiveness, isLoading } = useMemoryEffectiveness()

  if (isLoading) {
    return (
      <Card className="p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Top Performing Memories</h3>
      <ScrollArea className="h-[600px]">
        <div className="space-y-4 pr-4">
          {(effectiveness || []).map((memory: any) => (
            <Card key={memory.memoryId} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge>{memory.category}</Badge>
                    <span className="text-sm font-medium">
                      Effectiveness: {memory.effectiveness.toFixed(1)}%
                    </span>
                  </div>
                  <h4 className="font-semibold">{memory.title}</h4>
                  <p className="text-sm text-muted-foreground">{memory.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Usage: {memory.usageCount}</span>
                    <span>Success Rate: {memory.successRate.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </Card>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/memory-analytics/MemoryUsage.tsx`

```typescript
'use client'

import { useMemoryUsage } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export function MemoryUsage() {
  const { data: usage, isLoading } = useMemoryUsage()

  if (isLoading) {
    return (
      <Card className="p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Usage Patterns</h3>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          Chart placeholder
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Retrieval Trends</h3>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          Chart placeholder
        </div>
      </Card>
    </div>
  )
}
```

## API Client & Query Hooks

Add to `lib/mcp-client-orchestrator.ts`:

```typescript
async getMemoryAnalytics() {
  return this.request('get_memory_analytics', {})
}

async getMemoryEffectiveness(filters?: { category?: string; minEffectiveness?: number }) {
  return this.request('get_memory_effectiveness', filters || {})
}

async getMemoryUsage() {
  return this.request('get_memory_usage', {})
}
```

Add to `lib/queries-v2.ts`:

```typescript
export function useMemoryAnalytics() {
  return useQuery({
    queryKey: ['intelligence', 'memory', 'analytics'],
    queryFn: () => mcpClientOrchestrator.getMemoryAnalytics(),
    staleTime: 1000 * 60 * 5,
  })
}

export function useMemoryEffectiveness(filters?: any) {
  return useQuery({
    queryKey: ['intelligence', 'memory', 'effectiveness', filters],
    queryFn: () => mcpClientOrchestrator.getMemoryEffectiveness(filters),
    staleTime: 1000 * 60 * 5,
  })
}

export function useMemoryUsage() {
  return useQuery({
    queryKey: ['intelligence', 'memory', 'usage'],
    queryFn: () => mcpClientOrchestrator.getMemoryUsage(),
    staleTime: 1000 * 60 * 5,
  })
}
```

## Sidebar Update

Add to Orchestrator group:
```typescript
{ name: 'Memory Analytics', href: '/v2/orchestrator/intelligence/memory-analytics', icon: Database },
```

## Next Blueprint

Read `09-PHASE-3-COMPARISON.md` for Intelligence Comparison implementation.


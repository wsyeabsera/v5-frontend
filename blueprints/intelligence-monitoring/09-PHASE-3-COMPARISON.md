# Phase 3: Intelligence Comparison

## Overview

Build a page to compare executions with and without intelligence features, analyze feature impact, and view performance comparisons.

## Page: `app/v2/orchestrator/intelligence/comparison/page.tsx`

```typescript
'use client'

import { IntelligenceComparison } from '@/components/v2/orchestrator/intelligence/comparison/IntelligenceComparison'
import { BarChart3 } from 'lucide-react'

export default function ComparisonPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Intelligence Comparison</h1>
        </div>
        <p className="text-muted-foreground">
          Compare executions with and without intelligence features, analyze feature impact, and view performance comparisons.
        </p>
      </div>

      <IntelligenceComparison />
    </div>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/comparison/IntelligenceComparison.tsx`

```typescript
'use client'

import { ComparisonView } from './ComparisonView'
import { FeatureImpact } from './FeatureImpact'
import { PerformanceComparison } from './PerformanceComparison'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function IntelligenceComparison() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="comparison" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
          <TabsTrigger value="comparison">A/B Comparison</TabsTrigger>
          <TabsTrigger value="impact">Feature Impact</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="space-y-4">
          <ComparisonView />
        </TabsContent>

        <TabsContent value="impact" className="space-y-4">
          <FeatureImpact />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <PerformanceComparison />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/comparison/ComparisonView.tsx`

```typescript
'use client'

import { useIntelligenceComparison } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

export function ComparisonView() {
  const { data: comparison, isLoading } = useIntelligenceComparison()

  if (isLoading) {
    return (
      <Card className="p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
      </Card>
    )
  }

  const data = comparison || {
    withIntelligence: { count: 0, successRate: 0, avgConfidence: 0, avgQuality: 0, avgLatency: 0 },
    withoutIntelligence: { count: 0, successRate: 0, avgConfidence: 0, avgQuality: 0, avgLatency: 0 },
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">With Intelligence</h3>
            <Badge variant="default">Enhanced</Badge>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Executions</p>
              <p className="text-2xl font-bold">{data.withIntelligence.count}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className="text-2xl font-bold">{data.withIntelligence.successRate.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Confidence</p>
              <p className="text-2xl font-bold">{data.withIntelligence.avgConfidence.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Quality</p>
              <p className="text-2xl font-bold">{data.withIntelligence.avgQuality.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Latency</p>
              <p className="text-2xl font-bold">{data.withIntelligence.avgLatency.toFixed(0)}ms</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Without Intelligence</h3>
            <Badge variant="outline">Baseline</Badge>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Executions</p>
              <p className="text-2xl font-bold">{data.withoutIntelligence.count}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className="text-2xl font-bold">{data.withoutIntelligence.successRate.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Confidence</p>
              <p className="text-2xl font-bold">{data.withoutIntelligence.avgConfidence.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Quality</p>
              <p className="text-2xl font-bold">{data.withoutIntelligence.avgQuality.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Latency</p>
              <p className="text-2xl font-bold">{data.withoutIntelligence.avgLatency.toFixed(0)}ms</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Improvement Metrics */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Improvement Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Success Rate</p>
            <p className={`text-xl font-bold ${
              data.withIntelligence.successRate > data.withoutIntelligence.successRate
                ? 'text-green-600' : 'text-red-600'
            }`}>
              {(
                data.withIntelligence.successRate - data.withoutIntelligence.successRate
              ).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Confidence</p>
            <p className={`text-xl font-bold ${
              data.withIntelligence.avgConfidence > data.withoutIntelligence.avgConfidence
                ? 'text-green-600' : 'text-red-600'
            }`}>
              {(
                data.withIntelligence.avgConfidence - data.withoutIntelligence.avgConfidence
              ).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Quality</p>
            <p className={`text-xl font-bold ${
              data.withIntelligence.avgQuality > data.withoutIntelligence.avgQuality
                ? 'text-green-600' : 'text-red-600'
            }`}>
              {(
                data.withIntelligence.avgQuality - data.withoutIntelligence.avgQuality
              ).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Latency</p>
            <p className={`text-xl font-bold ${
              data.withIntelligence.avgLatency < data.withoutIntelligence.avgLatency
                ? 'text-green-600' : 'text-red-600'
            }`}>
              {(
                data.withIntelligence.avgLatency - data.withoutIntelligence.avgLatency
              ).toFixed(0)}ms
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/comparison/FeatureImpact.tsx`

```typescript
'use client'

import { useFeatureImpact } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export function FeatureImpact() {
  const { data: impact, isLoading } = useFeatureImpact()

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
        <h3 className="font-semibold mb-4">Feature Impact Analysis</h3>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          Chart placeholder
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Feature Recommendations</h3>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          Chart placeholder
        </div>
      </Card>
    </div>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/comparison/PerformanceComparison.tsx`

```typescript
'use client'

import { usePerformanceComparison } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export function PerformanceComparison() {
  const { data: performance, isLoading } = usePerformanceComparison()

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
        <h3 className="font-semibold mb-4">Performance Trends</h3>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          Chart placeholder
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Metric Comparison</h3>
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
async getIntelligenceComparison(filters?: { orchestratorId?: string; dateRange?: string }) {
  return this.request('get_intelligence_comparison', filters || {})
}

async getFeatureImpact(filters?: { orchestratorId?: string }) {
  return this.request('get_feature_impact', filters || {})
}

async getPerformanceComparison(filters?: { orchestratorId?: string; dateRange?: string }) {
  return this.request('get_performance_comparison', filters || {})
}
```

Add to `lib/queries-v2.ts`:

```typescript
export function useIntelligenceComparison(filters?: any) {
  return useQuery({
    queryKey: ['intelligence', 'comparison', filters],
    queryFn: () => mcpClientOrchestrator.getIntelligenceComparison(filters),
    staleTime: 1000 * 60 * 5,
  })
}

export function useFeatureImpact(filters?: any) {
  return useQuery({
    queryKey: ['intelligence', 'feature-impact', filters],
    queryFn: () => mcpClientOrchestrator.getFeatureImpact(filters),
    staleTime: 1000 * 60 * 5,
  })
}

export function usePerformanceComparison(filters?: any) {
  return useQuery({
    queryKey: ['intelligence', 'performance-comparison', filters],
    queryFn: () => mcpClientOrchestrator.getPerformanceComparison(filters),
    staleTime: 1000 * 60 * 5,
  })
}
```

## Sidebar Update

Add to Orchestrator group:
```typescript
{ name: 'Intelligence Comparison', href: '/v2/orchestrator/intelligence/comparison', icon: BarChart3 },
```

## Summary

All 9 blueprints have been created covering:
- Phase 1: Dashboard, Semantic Search, Embeddings
- Phase 2: Classification, Prompt Enhancement, Patterns
- Phase 3: Few-Shot, Memory Analytics, Comparison

Each blueprint includes:
- Page component structure
- Component implementations
- API client extensions
- Query hooks
- Sidebar navigation updates

## Implementation Notes

1. All pages follow the existing frontend patterns
2. Components use shadcn/ui components
3. Data fetching uses TanStack Query
4. API calls go through MCPClientOrchestrator
5. All pages are responsive and follow the design system
6. Charts can be implemented using Recharts when needed


# Phase 2: Query Classification Monitor

## Overview

Build a page to monitor query classifications, view classification history, and analyze classification patterns and effectiveness.

## Page: `app/v2/orchestrator/intelligence/classification/page.tsx`

```typescript
'use client'

import { ClassificationMonitor } from '@/components/v2/orchestrator/intelligence/classification/ClassificationMonitor'
import { Tag } from 'lucide-react'

export default function ClassificationPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <Tag className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Query Classification Monitor</h1>
        </div>
        <p className="text-muted-foreground">
          Monitor query classifications, view classification history, and analyze classification patterns.
        </p>
      </div>

      <ClassificationMonitor />
    </div>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/classification/ClassificationMonitor.tsx`

```typescript
'use client'

import { useState } from 'react'
import { ClassificationList } from './ClassificationList'
import { ClassificationCharts } from './ClassificationCharts'
import { ClassificationDetails } from './ClassificationDetails'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Filter } from 'lucide-react'

export function ClassificationMonitor() {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [complexityFilter, setComplexityFilter] = useState<string>('all')
  const [selectedClassification, setSelectedClassification] = useState<any>(null)

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="search">Search</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="search"
                placeholder="Search queries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger id="category" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="analytical">Analytical</SelectItem>
                <SelectItem value="creative">Creative</SelectItem>
                <SelectItem value="procedural">Procedural</SelectItem>
                <SelectItem value="debugging">Debugging</SelectItem>
                <SelectItem value="generation">Generation</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="complexity">Complexity</Label>
            <Select value={complexityFilter} onValueChange={setComplexityFilter}>
              <SelectTrigger id="complexity" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Complexities</SelectItem>
                <SelectItem value="simple">Simple</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="complex">Complex</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
          <TabsTrigger value="list">Classification History</TabsTrigger>
          <TabsTrigger value="charts">Analytics</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <ClassificationList
            searchQuery={searchQuery}
            categoryFilter={categoryFilter}
            complexityFilter={complexityFilter}
            onSelect={setSelectedClassification}
          />
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          <ClassificationCharts
            categoryFilter={categoryFilter}
            complexityFilter={complexityFilter}
          />
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {selectedClassification ? (
            <ClassificationDetails classification={selectedClassification} />
          ) : (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                Select a classification to view details
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/classification/ClassificationList.tsx`

```typescript
'use client'

import { useClassificationHistory } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

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
  const filters: any = {}
  if (categoryFilter !== 'all') filters.category = categoryFilter
  if (complexityFilter !== 'all') filters.complexity = complexityFilter

  const { data: classifications, isLoading, error } = useClassificationHistory(filters)

  if (isLoading) {
    return (
      <Card className="p-12">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6 border-red-200 bg-red-50 dark:bg-red-950/20">
        <div className="text-red-600">Error: {error.message}</div>
      </Card>
    )
  }

  const filtered = (classifications || []).filter((c: any) => {
    if (searchQuery) {
      return c.query?.toLowerCase().includes(searchQuery.toLowerCase())
    }
    return true
  })

  return (
    <Card className="p-6">
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          {filtered.length} classification{filtered.length !== 1 ? 's' : ''} found
        </p>
      </div>
      <ScrollArea className="h-[600px]">
        <div className="space-y-4 pr-4">
          {filtered.map((classification: any) => (
            <Card
              key={classification.executionId}
              className="p-4 cursor-pointer hover:bg-muted/50"
              onClick={() => onSelect(classification)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{classification.category}</Badge>
                    <Badge variant="outline">{classification.complexity}</Badge>
                    <Badge variant="outline">
                      Confidence: {classification.confidence}%
                    </Badge>
                  </div>
                  <p className="font-medium">{classification.query}</p>
                  {classification.reasoning && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {classification.reasoning}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(classification.timestamp).toLocaleString()}
                  </p>
                </div>
                <Link
                  href={`/v2/orchestrator/orchestrations?executionId=${classification.executionId}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </Card>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/classification/ClassificationCharts.tsx`

```typescript
'use client'

import { useClassificationAnalytics } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface ClassificationChartsProps {
  categoryFilter: string
  complexityFilter: string
}

export function ClassificationCharts({
  categoryFilter,
  complexityFilter,
}: ClassificationChartsProps) {
  const filters: any = {}
  if (categoryFilter !== 'all') filters.category = categoryFilter
  if (complexityFilter !== 'all') filters.complexity = complexityFilter

  const { data: analytics, isLoading } = useClassificationAnalytics(filters)

  if (isLoading) {
    return (
      <Card className="p-12">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Category Distribution</h3>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          Chart placeholder
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Complexity Distribution</h3>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          Chart placeholder
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Confidence Trends</h3>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          Chart placeholder
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Classification Over Time</h3>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          Chart placeholder
        </div>
      </Card>
    </div>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/classification/ClassificationDetails.tsx`

```typescript
'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'

interface ClassificationDetailsProps {
  classification: any
}

export function ClassificationDetails({ classification }: ClassificationDetailsProps) {
  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-lg mb-4">Classification Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Badge className="mt-1">{classification.category}</Badge>
            </div>
            <div>
              <Label>Complexity</Label>
              <Badge className="mt-1">{classification.complexity}</Badge>
            </div>
            <div>
              <Label>Confidence</Label>
              <div className="mt-1">
                <Progress value={classification.confidence} className="h-2" />
                <span className="text-sm text-muted-foreground">
                  {classification.confidence}%
                </span>
              </div>
            </div>
            <div>
              <Label>Timestamp</Label>
              <p className="text-sm mt-1">
                {new Date(classification.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div>
          <Label>Query</Label>
          <p className="text-sm mt-1 p-3 bg-muted rounded-md">
            {classification.query}
          </p>
        </div>

        {classification.reasoning && (
          <div>
            <Label>Reasoning</Label>
            <p className="text-sm mt-1 p-3 bg-muted rounded-md">
              {classification.reasoning}
            </p>
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
  )
}
```

## API Client Extension: `lib/mcp-client-orchestrator.ts`

Add these methods:

```typescript
async getClassificationHistory(filters?: {
  category?: string
  complexity?: string
  orchestratorId?: string
  limit?: number
}) {
  return this.request('get_classification_history', filters || {})
}

async getClassificationAnalytics(filters?: {
  category?: string
  complexity?: string
  orchestratorId?: string
}) {
  return this.request('get_classification_analytics', filters || {})
}
```

## Query Hooks: `lib/queries-v2.ts`

Add these hooks:

```typescript
export function useClassificationHistory(filters?: any) {
  return useQuery({
    queryKey: ['intelligence', 'classification', 'history', filters],
    queryFn: () => mcpClientOrchestrator.getClassificationHistory(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

export function useClassificationAnalytics(filters?: any) {
  return useQuery({
    queryKey: ['intelligence', 'classification', 'analytics', filters],
    queryFn: () => mcpClientOrchestrator.getClassificationAnalytics(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
```

## Sidebar Update: `components/layout/Sidebar.tsx`

Add to the Orchestrator group:

```typescript
{ name: 'Query Classification', href: '/v2/orchestrator/intelligence/classification', icon: Tag },
```

## Notes

- Classification history is filtered by category and complexity
- Analytics show distribution and trends
- Details view shows full classification information
- Links to execution details for each classification

## Next Blueprint

Read `05-PHASE-2-PROMPT-ENHANCEMENT.md` for Prompt Enhancement Viewer implementation.


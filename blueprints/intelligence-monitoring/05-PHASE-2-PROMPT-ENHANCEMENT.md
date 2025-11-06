# Phase 2: Prompt Enhancement Viewer

## Overview

Build a page to view prompt enhancement history, compare before/after prompts, and analyze enhancement effectiveness.

## Page: `app/v2/orchestrator/intelligence/prompt-enhancement/page.tsx`

```typescript
'use client'

import { PromptEnhancementViewer } from '@/components/v2/orchestrator/intelligence/prompt-enhancement/PromptEnhancementViewer'
import { Sparkles } from 'lucide-react'

export default function PromptEnhancementPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Prompt Enhancement Viewer</h1>
        </div>
        <p className="text-muted-foreground">
          View prompt enhancement history, compare before/after prompts, and analyze enhancement effectiveness.
        </p>
      </div>

      <PromptEnhancementViewer />
    </div>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/prompt-enhancement/PromptEnhancementViewer.tsx`

```typescript
'use client'

import { useState } from 'react'
import { EnhancementHistory } from './EnhancementHistory'
import { EnhancementComparison } from './EnhancementComparison'
import { EnhancementMetrics } from './EnhancementMetrics'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

export function PromptEnhancementViewer() {
  const [phaseFilter, setPhaseFilter] = useState<string>('all')
  const [selectedEnhancement, setSelectedEnhancement] = useState<any>(null)

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div>
            <Label htmlFor="phase">Phase</Label>
            <Select value={phaseFilter} onValueChange={setPhaseFilter}>
              <SelectTrigger id="phase" className="w-[200px] mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Phases</SelectItem>
                <SelectItem value="thought">Thought</SelectItem>
                <SelectItem value="plan">Plan</SelectItem>
                <SelectItem value="execution">Execution</SelectItem>
                <SelectItem value="summary">Summary</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
          <TabsTrigger value="history">Enhancement History</TabsTrigger>
          <TabsTrigger value="comparison">Before/After</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <EnhancementHistory
            phaseFilter={phaseFilter}
            onSelect={setSelectedEnhancement}
          />
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          {selectedEnhancement ? (
            <EnhancementComparison enhancement={selectedEnhancement} />
          ) : (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                Select an enhancement to view comparison
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <EnhancementMetrics phaseFilter={phaseFilter} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/prompt-enhancement/EnhancementHistory.tsx`

```typescript
'use client'

import { usePromptEnhancementHistory } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'

interface EnhancementHistoryProps {
  phaseFilter: string
  onSelect: (enhancement: any) => void
}

export function EnhancementHistory({ phaseFilter, onSelect }: EnhancementHistoryProps) {
  const filters: any = {}
  if (phaseFilter !== 'all') filters.phase = phaseFilter

  const { data: history, isLoading } = usePromptEnhancementHistory(filters)

  if (isLoading) {
    return (
      <Card className="p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <ScrollArea className="h-[600px]">
        <div className="space-y-4 pr-4">
          {(history || []).map((enhancement: any) => (
            <Card
              key={enhancement.id}
              className="p-4 cursor-pointer hover:bg-muted/50"
              onClick={() => onSelect(enhancement)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge>{enhancement.phase}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {enhancement.originalLength} → {enhancement.enhancedLength} chars
                    </span>
                  </div>
                  <p className="font-medium line-clamp-2">{enhancement.userQuery}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(enhancement.timestamp).toLocaleString()}
                  </p>
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

## Component: `components/v2/orchestrator/intelligence/prompt-enhancement/EnhancementComparison.tsx`

```typescript
'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'

interface EnhancementComparisonProps {
  enhancement: any
}

export function EnhancementComparison({ enhancement }: EnhancementComparisonProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Original Prompt</h3>
          <Badge variant="outline">{enhancement.originalLength} chars</Badge>
        </div>
        <ScrollArea className="h-[500px]">
          <pre className="text-sm whitespace-pre-wrap font-mono">
            {enhancement.originalPrompt}
          </pre>
        </ScrollArea>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Enhanced Prompt</h3>
          <Badge>{enhancement.enhancedLength} chars</Badge>
        </div>
        <ScrollArea className="h-[500px]">
          <pre className="text-sm whitespace-pre-wrap font-mono">
            {enhancement.enhancedPrompt}
          </pre>
        </ScrollArea>
      </Card>
    </div>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/prompt-enhancement/EnhancementMetrics.tsx`

```typescript
'use client'

import { usePromptEnhancementMetrics } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface EnhancementMetricsProps {
  phaseFilter: string
}

export function EnhancementMetrics({ phaseFilter }: EnhancementMetricsProps) {
  const filters: any = {}
  if (phaseFilter !== 'all') filters.phase = phaseFilter

  const { data: metrics, isLoading } = usePromptEnhancementMetrics(filters)

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
        <h3 className="font-semibold mb-4">Enhancement Length Changes</h3>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          Chart placeholder
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Enhancement Sources</h3>
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
async getPromptEnhancementHistory(filters?: { phase?: string; orchestratorId?: string }) {
  return this.request('get_prompt_enhancement_history', filters || {})
}

async getPromptEnhancementMetrics(filters?: { phase?: string; orchestratorId?: string }) {
  return this.request('get_prompt_enhancement_metrics', filters || {})
}
```

Add to `lib/queries-v2.ts`:

```typescript
export function usePromptEnhancementHistory(filters?: any) {
  return useQuery({
    queryKey: ['intelligence', 'prompt-enhancement', 'history', filters],
    queryFn: () => mcpClientOrchestrator.getPromptEnhancementHistory(filters),
    staleTime: 1000 * 60 * 2,
  })
}

export function usePromptEnhancementMetrics(filters?: any) {
  return useQuery({
    queryKey: ['intelligence', 'prompt-enhancement', 'metrics', filters],
    queryFn: () => mcpClientOrchestrator.getPromptEnhancementMetrics(filters),
    staleTime: 1000 * 60 * 5,
  })
}
```

## Sidebar Update

Add to Orchestrator group:
```typescript
{ name: 'Prompt Enhancement', href: '/v2/orchestrator/intelligence/prompt-enhancement', icon: Sparkles },
```

## Next Blueprint

Read `06-PHASE-2-PATTERNS.md` for Pattern Insights implementation.


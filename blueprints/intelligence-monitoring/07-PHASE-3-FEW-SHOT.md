# Phase 3: Few-Shot Learning Monitor

## Overview

Build a page to monitor few-shot learning examples, view example usage, and analyze example effectiveness.

## Page: `app/v2/orchestrator/intelligence/few-shot/page.tsx`

```typescript
'use client'

import { FewShotMonitor } from '@/components/v2/orchestrator/intelligence/few-shot/FewShotMonitor'
import { BookOpen } from 'lucide-react'

export default function FewShotPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Few-Shot Learning Monitor</h1>
        </div>
        <p className="text-muted-foreground">
          Monitor few-shot learning examples, view example usage, and analyze example effectiveness.
        </p>
      </div>

      <FewShotMonitor />
    </div>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/few-shot/FewShotMonitor.tsx`

```typescript
'use client'

import { useState } from 'react'
import { ExampleLibrary } from './ExampleLibrary'
import { ExampleEffectiveness } from './ExampleEffectiveness'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

export function FewShotMonitor() {
  const [phaseFilter, setPhaseFilter] = useState<string>('all')

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
      <Tabs defaultValue="library" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="library">Example Library</TabsTrigger>
          <TabsTrigger value="effectiveness">Effectiveness</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-4">
          <ExampleLibrary phaseFilter={phaseFilter} />
        </TabsContent>

        <TabsContent value="effectiveness" className="space-y-4">
          <ExampleEffectiveness phaseFilter={phaseFilter} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/few-shot/ExampleLibrary.tsx`

```typescript
'use client'

import { useFewShotExamples } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'

interface ExampleLibraryProps {
  phaseFilter: string
}

export function ExampleLibrary({ phaseFilter }: ExampleLibraryProps) {
  const filters: any = {}
  if (phaseFilter !== 'all') filters.phase = phaseFilter

  const { data: examples, isLoading } = useFewShotExamples(filters)

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
          {(examples || []).map((example: any, index: number) => (
            <Card key={index} className="p-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge>Similarity: {(example.similarity * 100).toFixed(1)}%</Badge>
                  {example.confidence && (
                    <Badge variant="outline">Confidence: {example.confidence}%</Badge>
                  )}
                </div>
                <p className="font-medium">{example.query}</p>
                {example.thought && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {typeof example.thought === 'string' ? example.thought : JSON.stringify(example.thought)}
                  </p>
                )}
                {example.plan && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {typeof example.plan === 'string' ? example.plan : JSON.stringify(example.plan)}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </Card>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/few-shot/ExampleEffectiveness.tsx`

```typescript
'use client'

import { useFewShotEffectiveness } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface ExampleEffectivenessProps {
  phaseFilter: string
}

export function ExampleEffectiveness({ phaseFilter }: ExampleEffectivenessProps) {
  const filters: any = {}
  if (phaseFilter !== 'all') filters.phase = phaseFilter

  const { data: effectiveness, isLoading } = useFewShotEffectiveness(filters)

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
        <h3 className="font-semibold mb-4">Example Usage</h3>
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
  )
}
```

## API Client & Query Hooks

Add to `lib/mcp-client-orchestrator.ts`:

```typescript
async getFewShotExamples(filters?: { phase?: string; orchestratorId?: string }) {
  return this.request('get_few_shot_examples', filters || {})
}

async getFewShotEffectiveness(filters?: { phase?: string; orchestratorId?: string }) {
  return this.request('get_few_shot_effectiveness', filters || {})
}
```

Add to `lib/queries-v2.ts`:

```typescript
export function useFewShotExamples(filters?: any) {
  return useQuery({
    queryKey: ['intelligence', 'few-shot', 'examples', filters],
    queryFn: () => mcpClientOrchestrator.getFewShotExamples(filters),
    staleTime: 1000 * 60 * 5,
  })
}

export function useFewShotEffectiveness(filters?: any) {
  return useQuery({
    queryKey: ['intelligence', 'few-shot', 'effectiveness', filters],
    queryFn: () => mcpClientOrchestrator.getFewShotEffectiveness(filters),
    staleTime: 1000 * 60 * 5,
  })
}
```

## Sidebar Update

Add to Orchestrator group:
```typescript
{ name: 'Few-Shot Learning', href: '/v2/orchestrator/intelligence/few-shot', icon: BookOpen },
```

## Next Blueprint

Read `08-PHASE-3-MEMORY-ANALYTICS.md` for Memory Analytics implementation.


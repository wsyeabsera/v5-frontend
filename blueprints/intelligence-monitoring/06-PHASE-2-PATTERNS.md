# Phase 2: Pattern Insights

## Overview

Enhanced pattern recognition page that shows extracted patterns, pattern details, statistics, and recommendations.

## Page: `app/v2/orchestrator/intelligence/patterns/page.tsx`

```typescript
'use client'

import { PatternInsights } from '@/components/v2/orchestrator/intelligence/patterns/PatternInsights'
import { Network } from 'lucide-react'

export default function PatternsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <Network className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Pattern Insights</h1>
        </div>
        <p className="text-muted-foreground">
          View extracted execution patterns, analyze pattern statistics, and get recommendations.
        </p>
      </div>

      <PatternInsights />
    </div>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/patterns/PatternInsights.tsx`

```typescript
'use client'

import { useState } from 'react'
import { PatternList } from './PatternList'
import { PatternDetails } from './PatternDetails'
import { PatternExtraction } from './PatternExtraction'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { RefreshCw } from 'lucide-react'

export function PatternInsights() {
  const [patternTypeFilter, setPatternTypeFilter] = useState<string>('all')
  const [selectedPattern, setSelectedPattern] = useState<any>(null)

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div>
            <Label htmlFor="pattern-type">Pattern Type</Label>
            <Select value={patternTypeFilter} onValueChange={setPatternTypeFilter}>
              <SelectTrigger id="pattern-type" className="w-[200px] mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failure">Failure</SelectItem>
                <SelectItem value="optimization">Optimization</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
          <TabsTrigger value="list">Patterns</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="extraction">Extract Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <PatternList
            patternTypeFilter={patternTypeFilter}
            onSelect={setSelectedPattern}
          />
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {selectedPattern ? (
            <PatternDetails pattern={selectedPattern} />
          ) : (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                Select a pattern to view details
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="extraction" className="space-y-4">
          <PatternExtraction />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/patterns/PatternList.tsx`

```typescript
'use client'

import { usePatterns } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'

interface PatternListProps {
  patternTypeFilter: string
  onSelect: (pattern: any) => void
}

export function PatternList({ patternTypeFilter, onSelect }: PatternListProps) {
  const filters: any = {}
  if (patternTypeFilter !== 'all') filters.patternType = patternTypeFilter

  const { data: patterns, isLoading } = usePatterns(filters)

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
          {(patterns || []).map((pattern: any) => (
            <Card
              key={pattern.name}
              className="p-4 cursor-pointer hover:bg-muted/50"
              onClick={() => onSelect(pattern)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      pattern.patternType === 'success' ? 'default' :
                      pattern.patternType === 'failure' ? 'destructive' : 'outline'
                    }>
                      {pattern.patternType}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {pattern.statistics.occurrenceCount} occurrences
                    </span>
                  </div>
                  <h3 className="font-semibold">{pattern.name}</h3>
                  {pattern.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {pattern.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Success Rate: {pattern.statistics.successRate.toFixed(1)}%</span>
                    <span>Avg Confidence: {pattern.statistics.averageConfidence.toFixed(1)}%</span>
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

## Component: `components/v2/orchestrator/intelligence/patterns/PatternDetails.tsx`

```typescript
'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface PatternDetailsProps {
  pattern: any
}

export function PatternDetails({ pattern }: PatternDetailsProps) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">{pattern.name}</h3>
            <Badge variant={
              pattern.patternType === 'success' ? 'default' :
              pattern.patternType === 'failure' ? 'destructive' : 'outline'
            }>
              {pattern.patternType}
            </Badge>
          </div>

          {pattern.description && (
            <div>
              <Label>Description</Label>
              <p className="text-sm mt-1">{pattern.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Occurrence Count</Label>
              <p className="text-sm font-medium mt-1">{pattern.statistics.occurrenceCount}</p>
            </div>
            <div>
              <Label>Success Rate</Label>
              <p className="text-sm font-medium mt-1">
                {pattern.statistics.successRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <Label>Avg Confidence</Label>
              <p className="text-sm font-medium mt-1">
                {pattern.statistics.averageConfidence.toFixed(1)}%
              </p>
            </div>
            <div>
              <Label>Avg Latency</Label>
              <p className="text-sm font-medium mt-1">
                {pattern.statistics.averageLatency.toFixed(0)}ms
              </p>
            </div>
          </div>

          {pattern.recommendations && (
            <div>
              <Label>Recommendations</Label>
              <pre className="text-xs mt-1 p-3 bg-muted rounded-md overflow-auto">
                {JSON.stringify(pattern.recommendations, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Examples</h3>
        <Tabs defaultValue="queries">
          <TabsList>
            <TabsTrigger value="queries">Queries</TabsTrigger>
            <TabsTrigger value="executions">Executions</TabsTrigger>
          </TabsList>
          <TabsContent value="queries">
            <div className="space-y-2 mt-4">
              {pattern.examples.queries.map((query: string, index: number) => (
                <div key={index} className="p-2 bg-muted rounded text-sm">
                  {query}
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="executions">
            <div className="space-y-2 mt-4">
              {pattern.examples.executionIds.map((id: string, index: number) => (
                <div key={index} className="p-2 bg-muted rounded text-sm font-mono">
                  {id}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/patterns/PatternExtraction.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useExtractPatterns } from '@/lib/queries-v2'
import { Loader2, Play } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function PatternExtraction() {
  const [orchestratorId, setOrchestratorId] = useState('')
  const extractPatterns = useExtractPatterns()
  const { toast } = useToast()

  const handleExtract = async () => {
    try {
      await extractPatterns.mutateAsync({
        orchestratorId: orchestratorId || undefined,
      })
      toast({
        title: 'Pattern Extraction Started',
        description: 'Pattern extraction has been initiated',
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
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Extract Patterns</h3>
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
          onClick={handleExtract}
          disabled={extractPatterns.isPending}
        >
          {extractPatterns.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-2" />
          )}
          Extract Patterns
        </Button>
      </div>
    </Card>
  )
}
```

## API Client & Query Hooks

Add to `lib/mcp-client-orchestrator.ts`:

```typescript
async listPatterns(filters?: { orchestratorId?: string; patternType?: string }) {
  return this.request('list_patterns', filters || {})
}

async extractPatterns(options?: { orchestratorId?: string; startDate?: string; endDate?: string }) {
  return this.request('extract_patterns', options || {})
}
```

Add to `lib/queries-v2.ts`:

```typescript
export function usePatterns(filters?: any) {
  return useQuery({
    queryKey: ['intelligence', 'patterns', filters],
    queryFn: () => mcpClientOrchestrator.listPatterns(filters),
    staleTime: 1000 * 60 * 5,
  })
}

export function useExtractPatterns() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (options?: any) => mcpClientOrchestrator.extractPatterns(options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intelligence', 'patterns'] })
    },
  })
}
```

## Sidebar Update

Add to Orchestrator group:
```typescript
{ name: 'Pattern Insights', href: '/v2/orchestrator/intelligence/patterns', icon: Network },
```

## Next Blueprint

Read `07-PHASE-3-FEW-SHOT.md` for Few-Shot Learning Monitor implementation.


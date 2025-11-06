# Phase 1: Semantic Search Explorer

## Overview

Build a comprehensive semantic search interface that allows users to search for similar executions, test search capabilities, and visualize similarity results.

## Page: `app/v2/orchestrator/intelligence/semantic-search/page.tsx`

```typescript
'use client'

import { SemanticSearchPanel } from '@/components/v2/orchestrator/intelligence/semantic-search/SemanticSearchPanel'
import { Search } from 'lucide-react'

export default function SemanticSearchPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <Search className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Semantic Search Explorer</h1>
        </div>
        <p className="text-muted-foreground">
          Search for similar past executions using semantic similarity. Find executions by query, thought, plan, summary, or combined content.
        </p>
      </div>

      <SemanticSearchPanel />
    </div>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/semantic-search/SemanticSearchPanel.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { SearchResults } from './SearchResults'
import { SearchFilters } from './SearchFilters'
import { SimilarityVisualization } from './SimilarityVisualization'
import { useSemanticSearch } from '@/lib/queries-v2'
import { Search, Loader2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function SemanticSearchPanel() {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({
    orchestratorId: '',
    status: '' as 'completed' | 'failed' | 'paused' | '',
    minConfidence: 0,
    minQuality: 0,
    searchType: 'combined' as 'query' | 'thought' | 'plan' | 'summary' | 'combined',
    limit: 10,
  })
  const [searchEnabled, setSearchEnabled] = useState(false)

  const { data: results, isLoading, error, refetch } = useSemanticSearch(
    searchEnabled ? query : '',
    filters,
    { enabled: searchEnabled && query.length > 0 }
  )

  const handleSearch = () => {
    if (query.trim().length > 0) {
      setSearchEnabled(true)
      refetch()
    }
  }

  const handleReset = () => {
    setQuery('')
    setFilters({
      orchestratorId: '',
      status: '',
      minConfidence: 0,
      minQuality: 0,
      searchType: 'combined',
      limit: 10,
    })
    setSearchEnabled(false)
  }

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="search-query">Search Query</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="search-query"
                placeholder="Enter a query to find similar executions..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={!query.trim() || isLoading}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Search
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </div>

          {/* Filters */}
          <SearchFilters filters={filters} onFiltersChange={setFilters} />
        </div>
      </Card>

      {/* Results */}
      {searchEnabled && (
        <Tabs defaultValue="results" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-2 mb-6">
            <TabsTrigger value="results">Search Results</TabsTrigger>
            <TabsTrigger value="visualization">Similarity Visualization</TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="space-y-4">
            {error && (
              <Card className="p-6 border-red-200 bg-red-50 dark:bg-red-950/20">
                <div className="text-red-600">Error: {error.message}</div>
              </Card>
            )}
            {isLoading && (
              <Card className="p-12">
                <div className="flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-3 text-muted-foreground">Searching...</span>
                </div>
              </Card>
            )}
            {results && <SearchResults results={results} query={query} />}
          </TabsContent>

          <TabsContent value="visualization" className="space-y-4">
            {results && <SimilarityVisualization results={results} query={query} />}
          </TabsContent>
        </Tabs>
      )}

      {/* Empty State */}
      {!searchEnabled && (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Enter a search query to find similar executions</p>
          </div>
        </Card>
      )}
    </div>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/semantic-search/SearchFilters.tsx`

```typescript
'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Card } from '@/components/ui/card'
import { useOrchestrators } from '@/lib/queries-v2'

interface SearchFiltersProps {
  filters: {
    orchestratorId: string
    status: 'completed' | 'failed' | 'paused' | ''
    minConfidence: number
    minQuality: number
    searchType: 'query' | 'thought' | 'plan' | 'summary' | 'combined'
    limit: number
  }
  onFiltersChange: (filters: any) => void
}

export function SearchFilters({ filters, onFiltersChange }: SearchFiltersProps) {
  const { data: orchestrators } = useOrchestrators()
  const orchestratorList = Array.isArray(orchestrators) ? orchestrators : []

  return (
    <Card className="p-4 bg-muted/50">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Orchestrator Filter */}
        <div>
          <Label htmlFor="orchestrator-filter">Orchestrator</Label>
          <Select
            value={filters.orchestratorId}
            onValueChange={(value) => onFiltersChange({ ...filters, orchestratorId: value })}
          >
            <SelectTrigger id="orchestrator-filter" className="mt-1">
              <SelectValue placeholder="All orchestrators" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              {orchestratorList.map((orch: any) => (
                <SelectItem key={orch._id} value={orch._id}>
                  {orch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div>
          <Label htmlFor="status-filter">Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => onFiltersChange({ ...filters, status: value as any })}
          >
            <SelectTrigger id="status-filter" className="mt-1">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search Type */}
        <div>
          <Label htmlFor="search-type">Search Type</Label>
          <Select
            value={filters.searchType}
            onValueChange={(value) => onFiltersChange({ ...filters, searchType: value as any })}
          >
            <SelectTrigger id="search-type" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="combined">Combined</SelectItem>
              <SelectItem value="query">Query</SelectItem>
              <SelectItem value="thought">Thought</SelectItem>
              <SelectItem value="plan">Plan</SelectItem>
              <SelectItem value="summary">Summary</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Min Confidence */}
        <div>
          <Label>Min Confidence: {filters.minConfidence}%</Label>
          <Slider
            value={[filters.minConfidence]}
            onValueChange={([value]) => onFiltersChange({ ...filters, minConfidence: value })}
            min={0}
            max={100}
            step={5}
            className="mt-2"
          />
        </div>

        {/* Min Quality */}
        <div>
          <Label>Min Quality: {filters.minQuality}%</Label>
          <Slider
            value={[filters.minQuality]}
            onValueChange={([value]) => onFiltersChange({ ...filters, minQuality: value })}
            min={0}
            max={100}
            step={5}
            className="mt-2"
          />
        </div>

        {/* Limit */}
        <div>
          <Label htmlFor="limit">Results Limit</Label>
          <Input
            id="limit"
            type="number"
            min={1}
            max={50}
            value={filters.limit}
            onChange={(e) => onFiltersChange({ ...filters, limit: parseInt(e.target.value) || 10 })}
            className="mt-1"
          />
        </div>
      </div>
    </Card>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/semantic-search/SearchResults.tsx`

```typescript
'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ExternalLink, Calendar, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { Progress } from '@/components/ui/progress'

interface SearchResultsProps {
  results: {
    total: number
    results: Array<{
      executionId: string
      similarity: number
      matchedPart: string
      userQuery: string
      status: string
      confidence?: number
      quality?: number
      summary?: string
      startedAt: string
      completedAt?: string
    }>
  }
  query: string
}

export function SearchResults({ results, query }: SearchResultsProps) {
  if (!results || results.total === 0) {
    return (
      <Card className="p-12">
        <div className="text-center text-muted-foreground">
          <p>No similar executions found</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Found {results.total} similar execution{results.total !== 1 ? 's' : ''}
        </p>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-4 pr-4">
          {results.results.map((result) => (
            <Card key={result.executionId} className="p-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={result.status === 'completed' ? 'default' : 'destructive'}>
                        {result.status}
                      </Badge>
                      <Badge variant="outline">{result.matchedPart}</Badge>
                    </div>
                    <h3 className="font-semibold text-lg mb-1">{result.userQuery}</h3>
                    {result.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {result.summary}
                      </p>
                    )}
                  </div>
                  <Link href={`/v2/orchestrator/orchestrations?executionId=${result.executionId}`}>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>

                {/* Similarity Score */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Similarity</span>
                    <span className="font-medium">
                      {(result.similarity * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={result.similarity * 100} className="h-2" />
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  {result.confidence !== undefined && (
                    <div>
                      <p className="text-xs text-muted-foreground">Confidence</p>
                      <p className="text-sm font-medium">{result.confidence}%</p>
                    </div>
                  )}
                  {result.quality !== undefined && (
                    <div>
                      <p className="text-xs text-muted-foreground">Quality</p>
                      <p className="text-sm font-medium">{result.quality}%</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Started</p>
                    <p className="text-sm font-medium">
                      {new Date(result.startedAt).toLocaleString()}
                    </p>
                  </div>
                  {result.completedAt && (
                    <div>
                      <p className="text-xs text-muted-foreground">Completed</p>
                      <p className="text-sm font-medium">
                        {new Date(result.completedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
```

## Component: `components/v2/orchestrator/intelligence/semantic-search/SimilarityVisualization.tsx`

```typescript
'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface SimilarityVisualizationProps {
  results: {
    total: number
    results: Array<{
      executionId: string
      similarity: number
      matchedPart: string
      userQuery: string
      status: string
    }>
  }
  query: string
}

export function SimilarityVisualization({ results, query }: SimilarityVisualizationProps) {
  // Sort by similarity descending
  const sortedResults = [...results.results].sort((a, b) => b.similarity - a.similarity)

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Similarity Distribution</h3>
      <div className="space-y-4">
        {sortedResults.map((result, index) => (
          <div key={result.executionId} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">#{index + 1}</span>
                <Badge variant="outline" className="text-xs">
                  {result.matchedPart}
                </Badge>
                <span className="text-sm text-muted-foreground truncate max-w-md">
                  {result.userQuery}
                </span>
              </div>
              <span className="text-sm font-medium">
                {(result.similarity * 100).toFixed(1)}%
              </span>
            </div>
            <Progress value={result.similarity * 100} className="h-2" />
          </div>
        ))}
      </div>
    </Card>
  )
}
```

## API Client Extension: `lib/mcp-client-orchestrator.ts`

Add this method:

```typescript
async searchSimilarExecutions(
  query: string,
  filters?: {
    orchestratorId?: string
    status?: 'completed' | 'failed' | 'paused'
    minConfidence?: number
    minQuality?: number
    searchType?: 'query' | 'thought' | 'plan' | 'summary' | 'combined'
    limit?: number
  }
) {
  const params: any = { query }
  if (filters) {
    Object.assign(params, filters)
  }
  return this.request('search_similar_executions', params)
}
```

## Query Hooks: `lib/queries-v2.ts`

Add this hook:

```typescript
export function useSemanticSearch(
  query: string,
  filters?: any,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['intelligence', 'semantic-search', query, filters],
    queryFn: () => mcpClientOrchestrator.searchSimilarExecutions(query, filters),
    enabled: options?.enabled !== false && query.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
```

## Sidebar Update: `components/layout/Sidebar.tsx`

Add to the Orchestrator group:

```typescript
{ name: 'Semantic Search', href: '/v2/orchestrator/intelligence/semantic-search', icon: Search },
```

## Notes

- Search is performed on-demand (not automatic)
- Results are cached for 5 minutes
- Similarity scores are displayed as percentages
- Users can filter by orchestrator, status, confidence, quality
- Results link to execution details

## Next Blueprint

Read `03-PHASE-1-EMBEDDINGS.md` for Embeddings Status implementation.


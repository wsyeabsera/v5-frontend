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

  // Map filters to match backend API
  const searchFilters = {
    orchestratorId: filters.orchestratorId || undefined,
    status: filters.status || undefined,
    minConfidence: filters.minConfidence > 0 ? filters.minConfidence : undefined,
    minQuality: filters.minQuality > 0 ? filters.minQuality : undefined,
    searchType: filters.searchType,
    limit: filters.limit,
  }

  const { data: results, isLoading, error, refetch } = useSemanticSearch(
    searchEnabled ? query : '',
    searchFilters,
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
                  <span className="ml-3 text-sm text-muted-foreground">Searching...</span>
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


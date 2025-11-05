'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useSearchTools } from '@/lib/queries-v2'
import { ToolSearchResults } from './ToolSearchResults'
import { ToolViewDialog } from '@/components/v2/tools/ToolViewDialog'
import { Loader2, Search } from 'lucide-react'

export function ToolSearchPanel() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [topK, setTopK] = useState(3)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedTool, setSelectedTool] = useState<any>(null)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const { data: results, isLoading, error } = useSearchTools(debouncedQuery, topK)

  const handleView = (tool: any) => {
    setSelectedTool(tool)
    setViewDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="search-query">Search Query</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="search-query"
                placeholder="Enter your search query..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="topk" className="text-sm whitespace-nowrap">
                Top K:
              </Label>
              <Input
                id="topk"
                type="number"
                min={1}
                max={10}
                value={topK}
                onChange={(e) => setTopK(Math.max(1, Math.min(10, parseInt(e.target.value) || 3)))}
                className="w-20"
              />
            </div>
          </div>
        </div>
      </div>

      {isLoading && debouncedQuery && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">Searching...</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
          <p className="text-sm text-red-600 dark:text-red-400">
            {error instanceof Error ? error.message : 'Search failed'}
          </p>
        </div>
      )}

      {!isLoading && debouncedQuery && results && (
        <div>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Found {Array.isArray(results) ? results.length : 0} result
              {(Array.isArray(results) ? results.length : 0) !== 1 ? 's' : ''}
            </p>
          </div>
          <ToolSearchResults
            results={Array.isArray(results) ? results : []}
            onView={handleView}
          />
        </div>
      )}

      {!debouncedQuery && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Enter a search query to find relevant tools</p>
        </div>
      )}

      <ToolViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        tool={selectedTool}
      />
    </div>
  )
}


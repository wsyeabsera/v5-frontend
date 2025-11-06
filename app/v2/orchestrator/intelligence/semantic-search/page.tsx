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


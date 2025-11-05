'use client'

import { PromptSearchPanel } from '@/components/v2/search-prompts/PromptSearchPanel'
import { Search } from 'lucide-react'

export default function PromptSearchPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <Search className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Search Prompts</h1>
        </div>
        <p className="text-muted-foreground">
          Search for MCP prompts using semantic search. Find the most relevant prompts for your use case.
        </p>
      </div>

      <PromptSearchPanel />
    </div>
  )
}


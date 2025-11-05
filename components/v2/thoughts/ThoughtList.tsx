'use client'

import { useState } from 'react'
import { useThoughts } from '@/lib/queries-v2'
import { ThoughtCard } from './ThoughtCard'
import { ThoughtViewDialog } from './ThoughtViewDialog'
import { ThoughtFilters } from './ThoughtFilters'
import { GenerateThoughtDialog } from './GenerateThoughtDialog'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, Plus } from 'lucide-react'

export function ThoughtList() {
  const [filters, setFilters] = useState<{
    userQuery?: string
    agentConfigId?: string
    limit?: number
    skip?: number
  }>({ limit: 50, skip: 0 })
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedThoughtId, setSelectedThoughtId] = useState<string | null>(null)

  const { data: thoughtsData, isLoading, error } = useThoughts(
    Object.keys(filters).length > 0 ? filters : undefined
  )

  // Extract thoughts array and pagination info from response
  const thoughts = Array.isArray(thoughtsData) 
    ? thoughtsData 
    : thoughtsData?.thoughts || []
  const pagination = thoughtsData && typeof thoughtsData === 'object' && !Array.isArray(thoughtsData)
    ? {
        total: thoughtsData.total || thoughts.length,
        limit: thoughtsData.limit || filters.limit || 50,
        skip: thoughtsData.skip || filters.skip || 0,
        hasMore: thoughtsData.hasMore || false,
      }
    : null

  const handleGenerate = () => {
    setGenerateDialogOpen(true)
  }

  const handleView = (thoughtId: string) => {
    setSelectedThoughtId(thoughtId)
    setViewDialogOpen(true)
  }

  const handleViewDialogClose = (open: boolean) => {
    setViewDialogOpen(open)
    if (!open) {
      setSelectedThoughtId(null)
    }
  }

  const handleGenerateSuccess = () => {
    setGenerateDialogOpen(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Loading thoughts...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
        <div>
          <div className="font-semibold text-red-900 dark:text-red-100">Failed to load thoughts</div>
          <div className="text-sm text-red-700 dark:text-red-300 mt-1">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Thoughts</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {thoughts.length} thought{thoughts.length !== 1 ? 's' : ''} found
            {pagination && ` (${pagination.total} total)`}
          </p>
        </div>
        <Button onClick={handleGenerate} className="gap-2">
          <Plus className="w-4 h-4" />
          Generate Thought
        </Button>
      </div>

      <ThoughtFilters filters={filters} onFiltersChange={setFilters} />

      {thoughts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-lg bg-muted/30 border border-dashed border-border">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-muted-foreground" />
            <div className="text-center">
              <div className="font-semibold text-lg mb-1">No thoughts found</div>
              <div className="text-sm text-muted-foreground">
                {Object.keys(filters).length > 0 && filters.userQuery === undefined && filters.agentConfigId === undefined
                  ? 'Try adjusting your filters or generate a new thought'
                  : 'Generate your first thought to get started'}
              </div>
            </div>
          </div>
          <Button onClick={handleGenerate} size="lg" className="mt-4 gap-2">
            <Plus className="w-5 h-5" />
            Generate Your First Thought
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {thoughts.map((thought: any, index: number) => (
            <div
              key={thought._id || thought.id || index}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <ThoughtCard thought={thought} onView={handleView} />
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => {
              setFilters({
                ...filters,
                skip: (filters.skip || 0) + (filters.limit || 50),
              })
            }}
          >
            Load More
          </Button>
        </div>
      )}

      <GenerateThoughtDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        onSuccess={handleGenerateSuccess}
      />

      <ThoughtViewDialog
        open={viewDialogOpen}
        onOpenChange={handleViewDialogClose}
        thoughtId={selectedThoughtId}
      />
    </div>
  )
}


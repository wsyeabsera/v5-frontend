'use client'

import { useState } from 'react'
import { useRequests } from '@/lib/queries-v2'
import { RequestCard } from './RequestCard'
import { RequestDialog } from './RequestDialog'
import { RequestFilters } from './RequestFilters'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, Plus } from 'lucide-react'

export function RequestList() {
  const [filters, setFilters] = useState<{
    categories?: string[]
    tags?: string[]
    version?: string
  }>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRequest, setEditingRequest] = useState<{
    _id: string
    query: string
    categories: string[]
    tags: string[]
    version: string
  } | null>(null)

  const { data: requests, isLoading, error } = useRequests(
    Object.keys(filters).length > 0 ? filters : undefined
  )

  const handleCreate = () => {
    setEditingRequest(null)
    setDialogOpen(true)
  }

  const handleEdit = (request: {
    _id: string
    query: string
    categories: string[]
    tags: string[]
    version: string
  }) => {
    setEditingRequest(request)
    setDialogOpen(true)
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingRequest(null)
    }
  }

  // Extract unique categories and tags for filter suggestions
  const allRequests = requests || []
  const availableCategories: string[] = Array.from(
    new Set(allRequests.flatMap((r: any) => (r.categories || []) as string[]))
  )
  const availableTags: string[] = Array.from(
    new Set(allRequests.flatMap((r: any) => (r.tags || []) as string[]))
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Loading requests...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
        <div>
          <div className="font-semibold text-red-900 dark:text-red-100">Failed to load requests</div>
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
          <h2 className="text-2xl font-semibold">Requests</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {allRequests.length} request{allRequests.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Request
        </Button>
      </div>

      <RequestFilters
        filters={filters}
        onFiltersChange={setFilters}
        availableCategories={availableCategories}
        availableTags={availableTags}
      />

      {allRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-lg bg-muted/30 border border-dashed border-border">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-muted-foreground" />
            <div className="text-center">
              <div className="font-semibold text-lg mb-1">No requests found</div>
              <div className="text-sm text-muted-foreground">
                {Object.keys(filters).length > 0
                  ? 'Try adjusting your filters or create a new request'
                  : 'Create your first request to get started'}
              </div>
            </div>
          </div>
          <Button onClick={handleCreate} size="lg" className="mt-4 gap-2">
            <Plus className="w-5 h-5" />
            Create Your First Request
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allRequests.map((request: any, index: number) => (
            <div
              key={request._id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <RequestCard request={request} onEdit={handleEdit} />
            </div>
          ))}
        </div>
      )}

      <RequestDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        request={editingRequest || undefined}
        onSuccess={() => {
          setDialogOpen(false)
          setEditingRequest(null)
        }}
      />
    </div>
  )
}

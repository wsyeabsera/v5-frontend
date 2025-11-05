'use client'

import { useState, useMemo } from 'react'
import { useResources } from '@/lib/queries-v2'
import { ResourceCard } from './ResourceCard'
import { ResourceDialog } from './ResourceDialog'
import { ResourceFilters } from './ResourceFilters'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, Plus } from 'lucide-react'

export function ResourceList() {
  const [filters, setFilters] = useState<{
    source?: 'remote' | 'local' | 'all'
    mimeType?: string
  }>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingResource, setEditingResource] = useState<{
    uri: string
    name: string
    description?: string
    mimeType?: string
    source?: 'remote' | 'local'
  } | null>(null)

  // Determine source filter for API call
  const sourceFilter = filters.source && filters.source !== 'all' ? filters.source : undefined
  const { data: resources, isLoading, error } = useResources(sourceFilter)

  // Filter resources client-side for mimeType
  const filteredResources = useMemo(() => {
    if (!resources) return []
    
    let result = Array.isArray(resources) ? resources : []

    if (filters.mimeType) {
      result = result.filter((resource: any) => resource.mimeType === filters.mimeType)
    }

    return result
  }, [resources, filters.mimeType])

  // Extract unique MIME types for filter suggestions
  const availableMimeTypes: string[] = useMemo(() => {
    if (!resources) return []
    const allResources = Array.isArray(resources) ? resources : []
    return Array.from(
      new Set(allResources.map((r: any) => r.mimeType).filter((m: any) => m))
    ) as string[]
  }, [resources])

  const handleCreate = () => {
    setEditingResource(null)
    setDialogOpen(true)
  }

  const handleEdit = (resource: {
    uri: string
    name: string
    description?: string
    mimeType?: string
    source?: 'remote' | 'local'
  }) => {
    setEditingResource(resource)
    setDialogOpen(true)
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingResource(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Loading resources...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
        <div>
          <div className="font-semibold text-red-900 dark:text-red-100">Failed to load resources</div>
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
          <h2 className="text-2xl font-semibold">Resources</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredResources.length} resource{filteredResources.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Resource
        </Button>
      </div>

      <ResourceFilters
        filters={filters}
        onFiltersChange={setFilters}
        availableMimeTypes={availableMimeTypes}
      />

      {filteredResources.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-lg bg-muted/30 border border-dashed border-border">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-muted-foreground" />
            <div className="text-center">
              <div className="font-semibold text-lg mb-1">No resources found</div>
              <div className="text-sm text-muted-foreground">
                {Object.keys(filters).length > 0
                  ? 'Try adjusting your filters or create a new resource'
                  : 'Create your first resource to get started'}
              </div>
            </div>
          </div>
          <Button onClick={handleCreate} size="lg" className="mt-4 gap-2">
            <Plus className="w-5 h-5" />
            Create Your First Resource
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredResources.map((resource: any, index: number) => (
            <div
              key={resource.uri}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <ResourceCard resource={resource} onEdit={handleEdit} />
            </div>
          ))}
        </div>
      )}

      <ResourceDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        resource={editingResource || undefined}
        onSuccess={() => {
          setDialogOpen(false)
          setEditingResource(null)
        }}
      />
    </div>
  )
}


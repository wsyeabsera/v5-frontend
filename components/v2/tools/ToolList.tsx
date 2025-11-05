'use client'

import { useState, useMemo } from 'react'
import { useTools } from '@/lib/queries-v2'
import { ToolCard } from './ToolCard'
import { ToolViewDialog } from './ToolViewDialog'
import { ToolExecuteDialog } from './ToolExecuteDialog'
import { ToolFilters } from './ToolFilters'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle } from 'lucide-react'

export function ToolList() {
  const [filters, setFilters] = useState<{
    source?: 'remote' | 'local' | 'all'
    operationType?: 'query' | 'mutation'
    entityType?: 'facility' | 'shipment' | 'contaminant' | 'contract' | 'inspection' | 'other'
  }>({})
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false)
  const [selectedTool, setSelectedTool] = useState<any>(null)

  // Determine source filter for API call
  const sourceFilter = filters.source && filters.source !== 'all' ? filters.source : undefined
  const { data: tools, isLoading, error } = useTools(sourceFilter)

  // Filter tools client-side for operationType and entityType
  const filteredTools = useMemo(() => {
    if (!tools) return []
    
    let result = Array.isArray(tools) ? tools : []

    if (filters.operationType) {
      result = result.filter((tool: any) => tool.operationType === filters.operationType)
    }

    if (filters.entityType) {
      result = result.filter((tool: any) => tool.entityType === filters.entityType)
    }

    return result
  }, [tools, filters.operationType, filters.entityType])

  const handleView = (tool: any) => {
    setSelectedTool(tool)
    setViewDialogOpen(true)
  }

  const handleExecute = (tool: any) => {
    setSelectedTool(tool)
    setExecuteDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Loading tools...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
        <div>
          <div className="font-semibold text-red-900 dark:text-red-100">Failed to load tools</div>
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
          <h2 className="text-2xl font-semibold">Tools</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredTools.length} tool{filteredTools.length !== 1 ? 's' : ''} found
          </p>
        </div>
      </div>

      <ToolFilters filters={filters} onFiltersChange={setFilters} />

      {filteredTools.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-lg bg-muted/30 border border-dashed border-border">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-muted-foreground" />
            <div className="text-center">
              <div className="font-semibold text-lg mb-1">No tools found</div>
              <div className="text-sm text-muted-foreground">
                {Object.keys(filters).length > 0
                  ? 'Try adjusting your filters'
                  : 'No tools available'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTools.map((tool: any, index: number) => (
            <div
              key={tool.name || index}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <ToolCard tool={tool} onView={handleView} onExecute={handleExecute} />
            </div>
          ))}
        </div>
      )}

      <ToolViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        tool={selectedTool}
      />

      <ToolExecuteDialog
        open={executeDialogOpen}
        onOpenChange={setExecuteDialogOpen}
        tool={selectedTool}
      />
    </div>
  )
}


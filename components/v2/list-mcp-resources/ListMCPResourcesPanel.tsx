'use client'

import { useMCPResources } from '@/lib/queries-v2'
import { MCPResourceItem } from './MCPResourceItem'
import { Loader2, AlertCircle } from 'lucide-react'
import { useMemo } from 'react'

export function ListMCPResourcesPanel() {
  const { data: resources, isLoading, error } = useMCPResources()

  const resourceList = useMemo(() => {
    if (!resources) return []
    // Handle both array and object with resources array
    if (Array.isArray(resources)) return resources
    if (resources.resources && Array.isArray(resources.resources)) return resources.resources
    return []
  }, [resources])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Loading MCP resources...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
        <div>
          <div className="font-semibold text-red-900 dark:text-red-100">Failed to load MCP resources</div>
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
          <h2 className="text-2xl font-semibold">MCP Resources</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {resourceList.length} resource{resourceList.length !== 1 ? 's' : ''} found
          </p>
        </div>
      </div>

      {resourceList.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-lg bg-muted/30 border border-dashed border-border">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-muted-foreground" />
            <div className="text-center">
              <div className="font-semibold text-lg mb-1">No MCP resources found</div>
              <div className="text-sm text-muted-foreground">
                No resources available from the remote MCP server
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resourceList.map((resource: any, index: number) => (
            <MCPResourceItem key={resource.uri || index} resource={resource} />
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useMemo } from 'react'
import { RequestContext } from '@/types'
import { RequestList } from '@/components/requests/RequestList'
import { RequestFilters, RequestFiltersState } from '@/components/requests/RequestFilters'
import { RequestDetailModal } from '@/components/requests/RequestDetailModal'
import { CreateRequestDialog } from '@/components/requests/CreateRequestDialog'
import { Button } from '@/components/ui/button'
import { getAllRequests, deleteRequest, deleteAllRequests } from '@/lib/api/requests-api'
import { Plus, RefreshCw, X, Trash2 } from 'lucide-react'
import { DeleteAllDialog } from '@/components/ui/delete-all-dialog'

export default function RequestsPage() {
  const [requests, setRequests] = useState<RequestContext[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<RequestContext | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false)
  const [filters, setFilters] = useState<RequestFiltersState>({
    search: '',
    status: 'all',
    agentName: 'all',
  })

  const loadRequests = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Fetch from API - requests are already sorted by createdAt descending
      const allRequests = await getAllRequests()
      setRequests(allRequests)
    } catch (error: any) {
      console.error('Failed to load requests:', error)
      const errorMessage = error?.message || 'Failed to load requests. Please check your connection and try again.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  // Get unique agent names from all requests
  const availableAgents = useMemo(() => {
    const agentsSet = new Set<string>()
    requests.forEach((req) => {
      req.agentChain.forEach((agent) => agentsSet.add(agent))
    })
    return Array.from(agentsSet).sort()
  }, [requests])

  // Filter requests based on filters
  const filteredRequests = useMemo(() => {
    let filtered = [...requests]

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(
        (req) =>
          req.requestId.toLowerCase().includes(searchLower) ||
          (req.userQuery &&
            req.userQuery.toLowerCase().includes(searchLower))
      )
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter((req) => req.status === filters.status)
    }

    // Agent name filter
    if (filters.agentName && filters.agentName !== 'all') {
      filtered = filtered.filter((req) =>
        req.agentChain.includes(filters.agentName as string)
      )
    }

    return filtered
  }, [requests, filters])

  const handleRequestClick = (request: RequestContext) => {
    setSelectedRequest(request)
    setIsDetailOpen(true)
  }

  const handleDelete = async (requestId: string) => {
    try {
      await deleteRequest(requestId)
      await loadRequests()
      if (selectedRequest?.requestId === requestId) {
        setIsDetailOpen(false)
        setSelectedRequest(null)
      }
    } catch (error) {
      console.error('Failed to delete request:', error)
      throw error
    }
  }

  const handleDeleteAll = async () => {
    try {
      const result = await deleteAllRequests()
      setError(null)
      await loadRequests()
      // Show success message
      alert(`Successfully deleted ${result.count} request${result.count !== 1 ? 's' : ''}`)
    } catch (error: any) {
      console.error('Failed to delete all requests:', error)
      setError(error?.message || 'Failed to delete all requests')
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-1">Requests</h1>
            <p className="text-[13px] text-muted-foreground">
              View and manage request execution chains
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadRequests}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
            {requests.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteAllOpen(true)}
                disabled={isLoading}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete All
              </Button>
            )}
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Request
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="h-auto p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Filters */}
        <RequestFilters
          filters={filters}
          onFiltersChange={setFilters}
          availableAgents={availableAgents}
        />

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            Showing {filteredRequests.length} of {requests.length} requests
          </span>
        </div>

        {/* Request List */}
        <RequestList
          requests={filteredRequests}
          onRequestClick={handleRequestClick}
          isLoading={isLoading}
          emptyMessage={
            requests.length === 0
              ? 'No requests yet. Create one to get started.'
              : 'No requests match your filters.'
          }
        />

        {/* Detail Modal */}
        <RequestDetailModal
          request={selectedRequest}
          open={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false)
            setSelectedRequest(null)
          }}
          onDelete={handleDelete}
        />

        {/* Create Dialog */}
        <CreateRequestDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSuccess={loadRequests}
        />

        {/* Delete All Dialog */}
        <DeleteAllDialog
          open={isDeleteAllOpen}
          onOpenChange={setIsDeleteAllOpen}
          onConfirm={handleDeleteAll}
          title="Delete All Requests"
          description="Are you sure you want to delete all requests? This action cannot be undone."
          itemCount={requests.length}
          itemName="requests"
        />
      </div>
    </div>
  )
}


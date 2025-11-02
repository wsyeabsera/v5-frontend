'use client'

import { useState, useEffect, useMemo } from 'react'
import { RequestContext } from '@/types'
import { RequestList } from '@/components/requests/RequestList'
import { RequestFilters, RequestFiltersState } from '@/components/requests/RequestFilters'
import { RequestDetailModal } from '@/components/requests/RequestDetailModal'
import { CreateRequestDialog } from '@/components/requests/CreateRequestDialog'
import { Button } from '@/components/ui/button'
import { getRequestIdStorage } from '@/lib/storage/request-id-storage'
import { Plus, RefreshCw } from 'lucide-react'

export default function RequestsPage() {
  const [requests, setRequests] = useState<RequestContext[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<RequestContext | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [filters, setFilters] = useState<RequestFiltersState>({
    search: '',
    status: 'all',
    agentName: '',
  })

  const storage = getRequestIdStorage()

  const loadRequests = async () => {
    setIsLoading(true)
    try {
      const allRequests = await storage.getAll()
      // Sort by createdAt descending (newest first)
      const sorted = allRequests.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      )
      setRequests(sorted)
    } catch (error) {
      console.error('Failed to load requests:', error)
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
    if (filters.agentName) {
      filtered = filtered.filter((req) =>
        req.agentChain.includes(filters.agentName)
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
      await storage.delete(requestId)
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
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Request
            </Button>
          </div>
        </div>

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
      </div>
    </div>
  )
}


'use client'

import { RequestContext } from '@/types'
import { RequestCard } from './RequestCard'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock } from 'lucide-react'

interface RequestListProps {
  requests: RequestContext[]
  onRequestClick: (request: RequestContext) => void
  isLoading?: boolean
  emptyMessage?: string
}

export function RequestList({
  requests,
  onRequestClick,
  isLoading = false,
  emptyMessage = 'No requests found',
}: RequestListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4 animate-pulse" />
          <span className="text-sm">Loading requests...</span>
        </div>
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }
  return (
    <ScrollArea className="h-[calc(100vh-300px)]">
      <div className="space-y-2 pr-4">
        {requests && requests.length > 0 && requests.map((request) => (
          <RequestCard
            key={request.requestId}
            request={request}
            onClick={() => onRequestClick(request)}
          />
        ))}
      </div>
    </ScrollArea>
  )
}


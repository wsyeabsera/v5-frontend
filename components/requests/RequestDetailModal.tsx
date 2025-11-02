'use client'

import { useState } from 'react'
import { RequestContext } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AgentChainView } from './AgentChainView'
import { Copy, Trash2 } from 'lucide-react'

interface RequestDetailModalProps {
  request: RequestContext | null
  open: boolean
  onClose: () => void
  onDelete?: (requestId: string) => Promise<void>
  onUpdate?: (request: RequestContext) => Promise<void>
}

export function RequestDetailModal({
  request,
  open,
  onClose,
  onDelete,
  onUpdate,
}: RequestDetailModalProps) {
  const [showJson, setShowJson] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  if (!request) return null

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(request.requestId)
      // Could add toast notification here
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    if (!confirm('Are you sure you want to delete this request?')) return

    setIsDeleting(true)
    try {
      await onDelete(request.requestId)
      onClose()
    } catch (err) {
      console.error('Failed to delete:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Request Details
            <Badge
              variant={
                request.status === 'completed'
                  ? 'default'
                  : request.status === 'failed'
                  ? 'destructive'
                  : request.status === 'in-progress'
                  ? 'secondary'
                  : 'outline'
              }
            >
              {request.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Request ID: {request.requestId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Request ID Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Request ID</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyId}
                  className="gap-2"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-mono break-all">{request.requestId}</p>
            </CardContent>
          </Card>

          {/* User Query */}
          {request.userQuery && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">User Query</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{request.userQuery}</p>
              </CardContent>
            </Card>
          )}

          {/* Agent Chain */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Agent Chain ({request.agentChain.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AgentChainView agentChain={request.agentChain} />
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created:</span>
                <span>{formatDate(request.createdAt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <Badge
                  variant={
                    request.status === 'completed'
                      ? 'default'
                      : request.status === 'failed'
                      ? 'destructive'
                      : request.status === 'in-progress'
                      ? 'secondary'
                      : 'outline'
                  }
                >
                  {request.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* JSON View Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowJson(!showJson)}
            >
              {showJson ? 'Hide' : 'Show'} JSON
            </Button>
          </div>

          {/* JSON View */}
          {showJson && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Raw JSON</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                  {JSON.stringify(request, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t">
            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


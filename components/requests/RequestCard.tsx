'use client'

import { RequestContext } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RequestCardProps {
  request: RequestContext
  onClick?: () => void
  className?: string
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const then = new Date(date)
  const diff = now.getTime() - then.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function getStatusVariant(status: RequestContext['status']): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed':
      return 'default'
    case 'in-progress':
      return 'secondary'
    case 'failed':
      return 'destructive'
    case 'pending':
      return 'outline'
    default:
      return 'outline'
  }
}

function formatRequestId(id: string): string {
  return `${id.substring(0, 8)}...${id.substring(id.length - 4)}`
}

export function RequestCard({ request, onClick, className }: RequestCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:border-accent hover:shadow-sm',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header with ID and Status */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-muted-foreground">
                {formatRequestId(request.requestId)}
              </span>
              <Badge variant={getStatusVariant(request.status)} className="text-[10px]">
                {request.status}
              </Badge>
            </div>

            {/* User Query */}
            {request.userQuery && (
              <p className="text-sm font-medium line-clamp-2">
                {request.userQuery}
              </p>
            )}

            {/* Agent Chain Preview */}
            {request.agentChain && request.agentChain.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-muted-foreground">Agents:</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {request.agentChain.slice(0, 3).map((agent, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-[10px] py-0 px-1.5 font-normal"
                    >
                      {agent}
                    </Badge>
                  ))}
                  {request.agentChain.length > 3 && (
                    <span className="text-[11px] text-muted-foreground">
                      +{request.agentChain.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Timestamp */}
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{formatRelativeTime(request.createdAt)}</span>
            </div>
          </div>

          {/* Chevron indicator */}
          {onClick && (
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}


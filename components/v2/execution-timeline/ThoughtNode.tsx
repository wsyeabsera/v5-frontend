'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Brain, Calendar, ExternalLink, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { GeneratePlanButton } from '@/components/v2/thoughts/GeneratePlanButton'

interface ThoughtNodeProps {
  thought: {
    _id?: string
    id?: string
    userQuery?: string
    thoughts?: any[]
    agentConfigId?: string
    createdAt?: string
  }
  onView?: (thoughtId: string) => void
}

export function ThoughtNode({ thought, onView }: ThoughtNodeProps) {
  const [copied, setCopied] = useState(false)
  const thoughtId = thought._id || thought.id || ''
  const thoughtCount = Array.isArray(thought.thoughts) ? thought.thoughts.length : 0

  const handleCopyId = async () => {
    if (!thoughtId) return
    try {
      await navigator.clipboard.writeText(thoughtId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy ID:', err)
    }
  }

  return (
    <Card className="p-4 border-l-4 border-l-blue-500 hover:border-l-blue-600 transition-all duration-200 hover:shadow-md">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/30">
              <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Thought</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="font-mono text-xs">
                  {thoughtId.substring(0, 8)}...
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={handleCopyId}
                  title="Copy ID"
                >
                  {copied ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* User Query */}
        {thought.userQuery && (
          <div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {thought.userQuery}
            </p>
          </div>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {thoughtCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {thoughtCount} thought{thoughtCount !== 1 ? 's' : ''}
            </Badge>
          )}
          {thought.agentConfigId && (
            <Badge variant="outline" className="font-mono text-xs">
              Agent: {thought.agentConfigId.substring(0, 8)}...
            </Badge>
          )}
          {thought.createdAt && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{new Date(thought.createdAt).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          {onView && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => thoughtId && onView(thoughtId)}
              className="flex-1"
            >
              View Details
            </Button>
          )}
          {thoughtId && (
            <GeneratePlanButton
              thoughtId={thoughtId}
              agentConfigId={thought.agentConfigId}
            />
          )}
          <Link href={`/v2/thoughts`} target="_blank">
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="w-3 h-3" />
              Open
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}


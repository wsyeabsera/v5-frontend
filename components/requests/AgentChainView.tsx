'use client'

import { RequestContext } from '@/types'
import { Badge } from '@/components/ui/badge'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AgentChainViewProps {
  agentChain: string[]
  className?: string
}

export function AgentChainView({ agentChain, className }: AgentChainViewProps) {
  if (agentChain.length === 0) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)}>
        No agents in chain yet
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {agentChain.map((agent, index) => (
        <div key={index} className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs py-1">
            {agent}
          </Badge>
          {index < agentChain.length - 1 && (
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
          )}
        </div>
      ))}
    </div>
  )
}


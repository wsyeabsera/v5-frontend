'use client'

import { RequestContext } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles, Brain, ListChecks, ExternalLink, CheckCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface AgentChainViewProps {
  agentChain: string[]
  className?: string
  requestId?: string
}

const agentInfo: Record<string, { name: string; icon: any; href: string; color: string }> = {
  'complexity-detector': {
    name: 'Complexity Detector',
    icon: Sparkles,
    href: '/agents/complexity-detector',
    color: 'blue',
  },
  'thought-agent': {
    name: 'Thought Agent',
    icon: Brain,
    href: '/agents/thought-agent',
    color: 'purple',
  },
  'planner-agent': {
    name: 'Planner Agent',
    icon: ListChecks,
    href: '/agents/planner-agent',
    color: 'green',
  },
}

export function AgentChainView({ agentChain, className, requestId }: AgentChainViewProps) {
  if (agentChain.length === 0) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)}>
        No agents in chain yet
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {agentChain.map((agent, index) => {
        const info = agentInfo[agent]
        const Icon = info?.icon || Sparkles
        const agentName = info?.name || agent
        const href = requestId ? `${info?.href || '#'}/${requestId}` : info?.href || '#'
        
        return (
          <div
            key={index}
            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/5 transition-colors group"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="flex-shrink-0">
                <div className={`p-2 rounded-lg ${
                  info?.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' :
                  info?.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30' :
                  info?.color === 'green' ? 'bg-green-100 dark:bg-green-900/30' :
                  'bg-muted'
                }`}>
                  <Icon className={`w-4 h-4 ${
                    info?.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                    info?.color === 'purple' ? 'text-purple-600 dark:text-purple-400' :
                    info?.color === 'green' ? 'text-green-600 dark:text-green-400' :
                    'text-muted-foreground'
                  }`} />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{agentName}</span>
                  <Badge variant="secondary" className="text-xs">
                    Step {index + 1}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle className="w-3 h-3" />
                    <span>Completed</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {agent}
                </p>
              </div>
            </div>
            <Link href={href}>
              <Button variant="outline" size="sm" className="gap-2">
                View in Agent
                <ExternalLink className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        )
      })}
    </div>
  )
}


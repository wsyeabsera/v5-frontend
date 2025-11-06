'use client'

import { AgentConfigList } from '@/components/v2/orchestrator/agent-configs/AgentConfigList'
import { Settings } from 'lucide-react'

export default function AgentConfigsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Agent Configs</h1>
        </div>
        <p className="text-muted-foreground">
          Configure AI agents with model settings, API keys, and token limits. These configs are used
          by orchestrators for different phases (thought, plan, execute, summary).
        </p>
      </div>

      <AgentConfigList />
    </div>
  )
}


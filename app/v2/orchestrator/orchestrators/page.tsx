'use client'

import { OrchestratorList } from '@/components/v2/orchestrator/orchestrators/OrchestratorList'
import { Network } from 'lucide-react'

export default function OrchestratorsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <Network className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Orchestrators</h1>
        </div>
        <p className="text-muted-foreground">
          Manage orchestrators that coordinate AI agent workflows. Each orchestrator defines agent
          configs for different phases (thought, plan, execute, summary) and execution settings.
        </p>
      </div>

      <OrchestratorList />
    </div>
  )
}


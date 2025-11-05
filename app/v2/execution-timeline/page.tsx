'use client'

import { ExecutionTimelineView } from '@/components/v2/execution-timeline/ExecutionTimelineView'
import { GitBranch } from 'lucide-react'

export default function ExecutionTimelinePage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <GitBranch className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Execution Timeline</h1>
        </div>
        <p className="text-muted-foreground">
          Visualize the complete execution flow from thoughts to plans to tasks.
        </p>
      </div>

      <ExecutionTimelineView />
    </div>
  )
}


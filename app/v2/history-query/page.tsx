'use client'

import { HistoryQueryPanel } from '@/components/v2/history-query/HistoryQueryPanel'
import { History } from 'lucide-react'

export default function HistoryQueryPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <History className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">History Query</h1>
        </div>
        <p className="text-muted-foreground">
          Query past executions to find similar tasks, successful plans, tool performance, and agent insights.
        </p>
      </div>

      <HistoryQueryPanel />
    </div>
  )
}


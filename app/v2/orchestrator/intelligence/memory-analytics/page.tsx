'use client'

import { MemoryAnalytics } from '@/components/v2/orchestrator/intelligence/memory-analytics/MemoryAnalytics'
import { Database } from 'lucide-react'

export default function MemoryAnalyticsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Memory Analytics</h1>
        </div>
        <p className="text-muted-foreground">
          View memory analytics, effectiveness tracking, and usage patterns.
        </p>
      </div>

      <MemoryAnalytics />
    </div>
  )
}


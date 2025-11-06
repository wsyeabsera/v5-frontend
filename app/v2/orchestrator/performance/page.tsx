'use client'

import { PerformanceMetricsList } from '@/components/v2/orchestrator/performance/PerformanceMetricsList'
import { BarChart3 } from 'lucide-react'

export default function PerformancePage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-[95vw]">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Performance Metrics</h1>
        </div>
        <p className="text-muted-foreground">
          View performance metrics for orchestrator executions, including latency, token usage, and
          quality scores.
        </p>
      </div>

      <PerformanceMetricsList />
    </div>
  )
}


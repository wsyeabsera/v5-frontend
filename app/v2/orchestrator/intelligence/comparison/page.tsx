'use client'

import { IntelligenceComparison } from '@/components/v2/orchestrator/intelligence/comparison/IntelligenceComparison'
import { BarChart3 } from 'lucide-react'

export default function ComparisonPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Intelligence Comparison</h1>
        </div>
        <p className="text-muted-foreground">
          Compare executions with and without intelligence features, analyze feature impact, and view performance comparisons.
        </p>
      </div>

      <IntelligenceComparison />
    </div>
  )
}


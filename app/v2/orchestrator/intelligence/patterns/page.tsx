'use client'

import { PatternInsights } from '@/components/v2/orchestrator/intelligence/patterns/PatternInsights'
import { Network } from 'lucide-react'

export default function PatternsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <Network className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Pattern Insights</h1>
        </div>
        <p className="text-muted-foreground">
          View extracted execution patterns, analyze pattern statistics, and get recommendations.
        </p>
      </div>

      <PatternInsights />
    </div>
  )
}


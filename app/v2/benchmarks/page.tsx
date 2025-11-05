'use client'

import { BenchmarkPanel } from '@/components/v2/benchmarks/BenchmarkPanel'
import { BarChart3 } from 'lucide-react'

export default function BenchmarksPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Benchmark Suite</h1>
        </div>
        <p className="text-muted-foreground">
          Create, run, and monitor benchmark tests. Track performance and detect regressions.
        </p>
      </div>

      <BenchmarkPanel />
    </div>
  )
}


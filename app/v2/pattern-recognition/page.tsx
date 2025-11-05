'use client'

import { PatternRecognitionPanel } from '@/components/v2/pattern-recognition/PatternRecognitionPanel'
import { Network } from 'lucide-react'

export default function PatternRecognitionPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <Network className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Pattern Recognition</h1>
        </div>
        <p className="text-muted-foreground">
          Query stored patterns from memory. Discover successful query patterns, plan sequences, tool orderings, and error patterns.
        </p>
      </div>

      <PatternRecognitionPanel />
    </div>
  )
}


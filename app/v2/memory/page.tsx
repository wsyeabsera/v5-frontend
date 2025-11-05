'use client'

import { MemoryPanel } from '@/components/v2/memory/MemoryPanel'
import { Database } from 'lucide-react'

export default function MemoryPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Memory System</h1>
        </div>
        <p className="text-muted-foreground">
          Store and retrieve learnings from task executions. The memory system enables persistent learning and pattern recognition.
        </p>
      </div>

      <MemoryPanel />
    </div>
  )
}


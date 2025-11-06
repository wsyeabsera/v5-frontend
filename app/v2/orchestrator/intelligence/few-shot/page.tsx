'use client'

import { FewShotMonitor } from '@/components/v2/orchestrator/intelligence/few-shot/FewShotMonitor'
import { BookOpen } from 'lucide-react'

export default function FewShotPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Few-Shot Learning Monitor</h1>
        </div>
        <p className="text-muted-foreground">
          Monitor few-shot learning examples, view example usage, and analyze example effectiveness.
        </p>
      </div>

      <FewShotMonitor />
    </div>
  )
}


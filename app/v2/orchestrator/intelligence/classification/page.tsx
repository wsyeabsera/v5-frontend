'use client'

import { ClassificationMonitor } from '@/components/v2/orchestrator/intelligence/classification/ClassificationMonitor'
import { Tag } from 'lucide-react'

export default function ClassificationPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <Tag className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Query Classification Monitor</h1>
        </div>
        <p className="text-muted-foreground">
          Monitor query classifications, view classification history, and analyze classification patterns.
        </p>
      </div>

      <ClassificationMonitor />
    </div>
  )
}


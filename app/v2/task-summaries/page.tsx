'use client'

import { TaskSummaryList } from '@/components/v2/task-summaries/TaskSummaryList'
import { FileText } from 'lucide-react'

export default function TaskSummariesPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Task Summaries</h1>
        </div>
        <p className="text-muted-foreground">
          Generate and view intelligent summaries of completed and failed task executions.
        </p>
      </div>

      <TaskSummaryList />
    </div>
  )
}


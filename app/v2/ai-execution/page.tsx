'use client'

import { AIExecutionForm } from '@/components/v2/ai-execution/AIExecutionForm'
import { Zap } from 'lucide-react'

export default function AIExecutionPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <Zap className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">AI Execution</h1>
        </div>
        <p className="text-muted-foreground">
          Execute AI calls using your configured agent configurations. Build messages, adjust parameters, and get results instantly.
        </p>
      </div>

      <AIExecutionForm />
    </div>
  )
}

'use client'

import { AvailableModelList } from '@/components/v2/orchestrator/available-models/AvailableModelList'
import { Database } from 'lucide-react'

export default function AvailableModelsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Available Models</h1>
        </div>
        <p className="text-muted-foreground">
          Manage available AI models that can be used by agent configurations. Each model represents
          a provider and model combination (e.g., Anthropic Claude, OpenAI GPT-4).
        </p>
      </div>

      <AvailableModelList />
    </div>
  )
}


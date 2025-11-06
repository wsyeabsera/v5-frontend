'use client'

import { PromptEnhancementViewer } from '@/components/v2/orchestrator/intelligence/prompt-enhancement/PromptEnhancementViewer'
import { Sparkles } from 'lucide-react'

export default function PromptEnhancementPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Prompt Enhancement Viewer</h1>
        </div>
        <p className="text-muted-foreground">
          View prompt enhancement history, compare before/after prompts, and analyze enhancement effectiveness.
        </p>
      </div>

      <PromptEnhancementViewer />
    </div>
  )
}


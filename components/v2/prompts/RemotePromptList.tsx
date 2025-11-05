'use client'

import { useState } from 'react'
import { usePrompts } from '@/lib/queries-v2'
import { PromptCard } from './PromptCard'
import { PromptViewDialog } from './PromptViewDialog'
import { Loader2, AlertCircle } from 'lucide-react'

export function RemotePromptList() {
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null)

  const { data: prompts, isLoading, error } = usePrompts('remote')

  const filteredPrompts = Array.isArray(prompts) ? prompts : []

  const handleView = (prompt: any) => {
    setSelectedPrompt(prompt)
    setViewDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Loading remote prompts...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
        <div>
          <div className="font-semibold text-red-900 dark:text-red-100">Failed to load remote prompts</div>
          <div className="text-sm text-red-700 dark:text-red-300 mt-1">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Remote Prompts</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredPrompts.length} prompt{filteredPrompts.length !== 1 ? 's' : ''} found
          </p>
        </div>
      </div>

      {filteredPrompts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-lg bg-muted/30 border border-dashed border-border">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-muted-foreground" />
            <div className="text-center">
              <div className="font-semibold text-lg mb-1">No remote prompts found</div>
              <div className="text-sm text-muted-foreground">
                No prompts available from the remote MCP server
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPrompts.map((prompt: any, index: number) => (
            <div
              key={prompt.name || index}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <PromptCard prompt={prompt} onView={handleView} />
            </div>
          ))}
        </div>
      )}

      <PromptViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        prompt={selectedPrompt}
      />
    </div>
  )
}


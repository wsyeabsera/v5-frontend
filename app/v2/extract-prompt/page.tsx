'use client'

import { ExtractPromptPanel } from '@/components/v2/extract-prompt/ExtractPromptPanel'
import { FileText } from 'lucide-react'

export default function ExtractPromptPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Extract Prompt</h1>
        </div>
        <p className="text-muted-foreground">
          Extract and resolve prompts from the local database or remote MCP server. Enter a prompt name and optional arguments to resolve template variables.
        </p>
      </div>

      <ExtractPromptPanel />
    </div>
  )
}


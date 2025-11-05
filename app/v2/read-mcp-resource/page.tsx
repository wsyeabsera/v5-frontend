'use client'

import { ReadMCPResourcePanel } from '@/components/v2/read-mcp-resource/ReadMCPResourcePanel'
import { FileText } from 'lucide-react'

export default function ReadMCPResourcePage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Read MCP Resource</h1>
        </div>
        <p className="text-muted-foreground">
          Fetch and display content from a specific MCP resource by URI.
        </p>
      </div>

      <ReadMCPResourcePanel />
    </div>
  )
}

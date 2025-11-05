'use client'

import { ToolList } from '@/components/v2/tools/ToolList'
import { InitToolsButton } from '@/components/v2/tools/InitToolsButton'
import { Wrench } from 'lucide-react'

export default function ToolsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <Wrench className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Tool Management</h1>
        </div>
        <p className="text-muted-foreground">
          View and execute MCP tools. Tools are read-only and can be synchronized from the remote server.
        </p>
      </div>

      <div className="mb-6 flex justify-end">
        <InitToolsButton />
      </div>

      <ToolList />
    </div>
  )
}


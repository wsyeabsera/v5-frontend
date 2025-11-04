'use client'

import { RequestList } from '@/components/v2/requests/RequestList'
import { FileText } from 'lucide-react'

export default function RequestsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Request Management</h1>
        </div>
        <p className="text-muted-foreground">
          Store, organize, and manage user requests with categories, tags, and versions for better tracking and analysis.
        </p>
      </div>

      <RequestList />
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { ResourceContentDisplay } from './ResourceContentDisplay'
import { Search, Loader2 } from 'lucide-react'

export function ReadMCPResourcePanel() {
  const [uri, setUri] = useState('')
  const [fetchUri, setFetchUri] = useState<string | null>(null)

  const handleFetch = () => {
    if (uri.trim()) {
      setFetchUri(uri.trim())
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && uri.trim()) {
      handleFetch()
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resource-uri">Resource URI</Label>
            <div className="flex gap-2">
              <Input
                id="resource-uri"
                placeholder="e.g., facility://list, stats://overview, activity://recent"
                value={uri}
                onChange={(e) => setUri(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button
                onClick={handleFetch}
                disabled={!uri.trim()}
                className="gap-2"
              >
                <Search className="w-4 h-4" />
                Fetch Resource
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter a resource URI to fetch its content from the remote MCP server.
            </p>
          </div>
        </div>
      </Card>

      {fetchUri && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Resource Content</h2>
          <ResourceContentDisplay uri={fetchUri} />
        </div>
      )}
    </div>
  )
}

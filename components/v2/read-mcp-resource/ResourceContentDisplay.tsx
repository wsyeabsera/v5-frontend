'use client'

import { useMCPResource } from '@/lib/queries-v2'
import { Loader2, AlertCircle, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { JsonViewer } from '@/components/ui/json-viewer'

interface ResourceContentDisplayProps {
  uri: string
}

export function ResourceContentDisplay({ uri }: ResourceContentDisplayProps) {
  const { data: resourceContent, isLoading, error } = useMCPResource(uri)

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* URI Header */}
        <div className="flex items-start gap-3 pb-4 border-b">
          <FileText className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-1">Resource URI</h3>
            <p className="text-sm text-muted-foreground font-mono break-all">{uri}</p>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">
              Loading resource content...
            </span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 p-6 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div>
              <div className="font-semibold text-red-900 dark:text-red-100">
                Failed to load resource
              </div>
              <div className="text-sm text-red-700 dark:text-red-300 mt-1">
                {error instanceof Error ? error.message : 'Unknown error occurred'}
              </div>
            </div>
          </div>
        ) : resourceContent ? (
          <div className="space-y-4">
            {/* Handle different content formats */}
            {resourceContent.contents && Array.isArray(resourceContent.contents) ? (
              resourceContent.contents.map((content: any, index: number) => (
                <div key={index} className="space-y-3">
                  <div className="flex items-center gap-2">
                    {content.uri && (
                      <div className="text-xs text-muted-foreground font-mono">
                        {content.uri}
                      </div>
                    )}
                    {content.mimeType && (
                      <Badge variant="outline" className="text-xs">
                        {content.mimeType}
                      </Badge>
                    )}
                  </div>
                  {content.text && (
                    <JsonViewer
                      data={content.text}
                      maxHeight="500px"
                      collapsible={true}
                      defaultExpanded={false}
                      searchable={true}
                      showCopyButton={true}
                    />
                  )}
                </div>
              ))
            ) : typeof resourceContent === 'string' ? (
              <JsonViewer
                data={resourceContent}
                maxHeight="500px"
                collapsible={false}
                searchable={true}
                showCopyButton={true}
              />
            ) : (
              <JsonViewer
                data={resourceContent}
                maxHeight="500px"
                collapsible={true}
                defaultExpanded={false}
                searchable={true}
                showCopyButton={true}
              />
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground p-12">
            No content available
          </div>
        )}
      </div>
    </Card>
  )
}

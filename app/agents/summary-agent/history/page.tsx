'use client'

import { useState, useEffect } from 'react'
import { SummaryAgentOutput } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, RefreshCw, History, Trash2, FileText, Clock, ExternalLink } from 'lucide-react'
import { DeleteAllDialog } from '@/components/ui/delete-all-dialog'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function SummaryAgentHistoryPage() {
  const [summaries, setSummaries] = useState<SummaryAgentOutput[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSummary, setSelectedSummary] = useState<SummaryAgentOutput | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false)

  const loadHistory = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/agents/summary-agent/history')
      if (!response.ok) {
        throw new Error('Failed to load summary history')
      }

      const data = await response.json()
      // Ensure timestamps are Date objects
      const processedData = data.map((d: any) => ({
        ...d,
        timestamp: new Date(d.timestamp),
        requestContext: d.requestContext
          ? {
              ...d.requestContext,
              createdAt: new Date(d.requestContext.createdAt),
            }
          : undefined,
      }))
      setSummaries(processedData)
    } catch (err: any) {
      setError(err.message || 'Failed to load summary history')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const handleViewDetails = (summary: SummaryAgentOutput) => {
    setSelectedSummary(summary)
    setIsDetailOpen(true)
  }

  const handleDeleteAll = async () => {
    try {
      const response = await fetch('/api/agents/summary-agent/history', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete all summary history')
      }

      const result = await response.json()
      setError(null)
      await loadHistory()
      alert(`Successfully deleted ${result.count} summar${result.count !== 1 ? 'ies' : 'y'}`)
    } catch (err: any) {
      setError(err.message || 'Failed to delete all summary history')
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Breadcrumbs items={[
          { label: 'Agent Pipeline', href: '/agents/pipeline' },
          { label: 'Summary Agent', href: '/agents/summary-agent' },
          { label: 'History' },
        ]} />
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/agents/summary-agent">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="mb-1 flex items-center gap-2">
                <History className="w-5 h-5" />
                Summary Agent History
              </h1>
              <p className="text-[13px] text-muted-foreground">
                View all past summary agent outputs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadHistory}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {summaries.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteAllOpen(true)}
                disabled={isLoading}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete All
              </Button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            Showing {summaries.length} summar{summaries.length !== 1 ? 'ies' : 'y'}
          </span>
        </div>

        {/* History List */}
        <Card>
          <CardHeader>
            <CardTitle>Summary History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : summaries.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                No summaries found.
              </div>
            ) : (
              <div className="space-y-4">
                {summaries.map((summary) => (
                  <div
                    key={summary.requestId}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                            {summary.requestId}
                          </code>
                          {summary.summaryVersion && (
                            <Badge variant="outline" className="text-xs">
                              v{summary.summaryVersion}
                            </Badge>
                          )}
                        </div>
                        {summary.requestContext?.userQuery && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                            {summary.requestContext.userQuery}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(summary.timestamp).toLocaleString()}
                          </div>
                          {summary.requestContext && (
                            <div className="flex items-center gap-1">
                              <span>Chain:</span>
                              <Badge variant="secondary" className="text-xs">
                                {summary.requestContext.agentChain.join(' → ')}
                              </Badge>
                            </div>
                          )}
                        </div>
                        {summary.summary && (
                          <p className="text-sm line-clamp-2 text-muted-foreground">
                            {summary.summary.substring(0, 200)}...
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/agents/summary-agent/${summary.requestId}`}>
                          <Button variant="ghost" size="sm" className="gap-2">
                            <ExternalLink className="w-4 h-4" />
                            View
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(summary)}
                          className="gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Summary Details</DialogTitle>
            </DialogHeader>
            {selectedSummary && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Request ID:</span>
                    <code className="ml-2 px-2 py-1 bg-muted rounded text-xs">
                      {selectedSummary.requestId}
                    </code>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Timestamp:</span>
                    <span className="ml-2">{new Date(selectedSummary.timestamp).toLocaleString()}</span>
                  </div>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedSummary.summary}
                  </ReactMarkdown>
                </div>
                {selectedSummary.keyTakeaways && selectedSummary.keyTakeaways.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Key Takeaways</h3>
                    <ul className="space-y-1">
                      {selectedSummary.keyTakeaways.map((takeaway, index) => (
                        <li key={index} className="text-sm">• {takeaway}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete All Dialog */}
        <DeleteAllDialog
          open={isDeleteAllOpen}
          onOpenChange={setIsDeleteAllOpen}
          onConfirm={handleDeleteAll}
          title="Delete All Summary History"
          description="Are you sure you want to delete all summary agent history? This action cannot be undone."
          itemCount={summaries.length}
          itemName="summaries"
        />
      </div>
    </div>
  )
}


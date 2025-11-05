'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getTaskSummaries, deleteSummary, type CachedSummary } from '@/lib/utils/summary-storage'
import { SummaryContentView } from './SummaryContentView'
import { Calendar, Trash2, FileText, Copy, Check, Download, RefreshCw } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface SummaryHistoryProps {
  taskId: string
  onRegenerate?: (format: CachedSummary['format'], includeInsights: boolean, includeRecommendations: boolean) => void
}

export function SummaryHistory({ taskId, onRegenerate }: SummaryHistoryProps) {
  const [summaries, setSummaries] = useState<CachedSummary[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedSummary, setSelectedSummary] = useState<CachedSummary | null>(null)

  const loadSummaries = () => {
    const loaded = getTaskSummaries(taskId)
    setSummaries(loaded)
    if (loaded.length > 0 && (!selectedSummary || !loaded.find(s => s.generatedAt === selectedSummary.generatedAt))) {
      setSelectedSummary(loaded[0])
    }
  }

  useEffect(() => {
    loadSummaries()
    // Refresh every 2 seconds when dialog is open (in case summaries are generated elsewhere)
    const interval = setInterval(loadSummaries, 2000)
    return () => clearInterval(interval)
  }, [taskId])

  const handleDelete = (summary: CachedSummary) => {
    deleteSummary(summary.taskId, summary.generatedAt, summary.format)
    loadSummaries()
  }

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDownload = (summary: CachedSummary) => {
    const blob = new Blob([summary.summary], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `task-summary-${taskId}-${summary.format}-${new Date(summary.generatedAt).toISOString().split('T')[0]}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleRefresh = () => {
    loadSummaries()
  }

  if (summaries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-muted/30">
        <FileText className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Summary History</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          No summaries have been generated for this task yet. Generate a summary to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full min-h-0 max-h-full">
      {/* Summary List */}
      <div className="lg:col-span-1 space-y-2 flex flex-col min-h-0 max-h-full">
        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          <h3 className="font-semibold text-sm">History ({summaries.length})</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="h-7 w-7 p-0"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1 min-h-0 max-h-full">
          <div className="space-y-2 pr-4">
            {summaries.map((summary) => (
              <Card
                key={`${summary.generatedAt}-${summary.format}`}
                className={`p-3 cursor-pointer transition-all hover:border-primary/50 ${
                  selectedSummary?.generatedAt === summary.generatedAt
                    ? 'border-primary bg-primary/5'
                    : ''
                }`}
                onClick={() => setSelectedSummary(summary)}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {summary.format}
                    </Badge>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Summary?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this summary? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(summary)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(summary.generatedAt).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    {summary.includeInsights && (
                      <Badge variant="secondary" className="text-xs">Insights</Badge>
                    )}
                    {summary.includeRecommendations && (
                      <Badge variant="secondary" className="text-xs">Recommendations</Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Summary Content */}
      <div className="lg:col-span-2 flex flex-col min-h-0 max-h-full">
        {selectedSummary ? (
          <Card className="flex-1 flex flex-col min-h-0 max-h-full overflow-hidden border-2 shadow-lg">
            <div className="p-4 border-b bg-muted/30 flex items-center justify-between flex-shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{selectedSummary.format}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {new Date(selectedSummary.generatedAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {selectedSummary.includeInsights && (
                    <Badge variant="secondary" className="text-xs">Insights</Badge>
                  )}
                  {selectedSummary.includeRecommendations && (
                    <Badge variant="secondary" className="text-xs">Recommendations</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(selectedSummary.summary, selectedSummary.generatedAt)}
                  className="gap-2"
                >
                  {copiedId === selectedSummary.generatedAt ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(selectedSummary)}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
                {onRegenerate && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() =>
                      onRegenerate(
                        selectedSummary.format,
                        selectedSummary.includeInsights,
                        selectedSummary.includeRecommendations
                      )
                    }
                    className="gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerate
                  </Button>
                )}
              </div>
            </div>
            <SummaryContentView content={selectedSummary.summary} />
          </Card>
        ) : (
          <div className="flex items-center justify-center h-full border rounded-lg bg-muted/30">
            <p className="text-muted-foreground">Select a summary to view</p>
          </div>
        )}
      </div>
    </div>
  )
}


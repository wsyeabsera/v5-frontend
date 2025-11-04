'use client'

import { useState, useEffect } from 'react'
import { ConfidenceScorerOutput } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, RefreshCw, History, Trash2, Eye, BarChart, Loader2, Frown, CheckCircle, AlertCircle, XCircle, TrendingUp } from 'lucide-react'
import { DeleteAllDialog } from '@/components/ui/delete-all-dialog'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'

export default function ConfidenceScorerHistoryPage() {
  const [outputs, setOutputs] = useState<ConfidenceScorerOutput[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOutput, setSelectedOutput] = useState<ConfidenceScorerOutput | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false)

  const loadHistory = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/agents/confidence-scorer/history')
      if (!response.ok) {
        throw new Error('Failed to load confidence scorer history')
      }

      const data = await response.json()
      const processedData = data.map((d: any) => ({
        ...d,
        timestamp: new Date(d.timestamp),
        agentScores: (d.agentScores || []).map((score: any) => ({
          ...score,
          timestamp: score.timestamp instanceof Date ? score.timestamp : new Date(score.timestamp),
        })),
        requestContext: d.requestContext
          ? {
              ...d.requestContext,
              createdAt: d.requestContext.createdAt instanceof Date 
                ? d.requestContext.createdAt 
                : new Date(d.requestContext.createdAt),
            }
          : undefined,
      }))
      setOutputs(processedData)
    } catch (err: any) {
      setError(err.message || 'Failed to load confidence scorer history')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const handleViewDetails = (output: ConfidenceScorerOutput) => {
    setSelectedOutput(output)
    setIsDetailOpen(true)
  }

  const handleDeleteAll = async () => {
    try {
      const response = await fetch('/api/agents/confidence-scorer/history', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete all confidence scorer history')
      }

      const result = await response.json()
      setError(null)
      await loadHistory()
      alert(`Successfully deleted ${result.count} confidence output${result.count !== 1 ? 's' : ''}`)
    } catch (err: any) {
      setError(err.message || 'Failed to delete all confidence scorer history')
    }
  }

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'execute':
        return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900">Execute</Badge>
      case 'review':
        return <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900">Review</Badge>
      case 'rethink':
        return <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900">Rethink</Badge>
      case 'escalate':
        return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900">Escalate</Badge>
      default:
        return <Badge variant="secondary">{decision}</Badge>
    }
  }

  const getDecisionIcon = (decision: string) => {
    switch (decision) {
      case 'execute':
        return <CheckCircle className="w-4 h-4" />
      case 'review':
        return <AlertCircle className="w-4 h-4" />
      case 'rethink':
        return <XCircle className="w-4 h-4" />
      case 'escalate':
        return <AlertCircle className="w-4 h-4" />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Breadcrumbs items={[
          { label: 'Agent Pipeline', href: '/agents/pipeline' },
          { label: 'Confidence Scorer', href: '/agents/confidence-scorer' },
          { label: 'History' },
        ]} />
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/agents/confidence-scorer">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="mb-1 flex items-center gap-2">
                <History className="w-5 h-5" />
                Confidence Scorer History
              </h1>
              <p className="text-[13px] text-muted-foreground">
                View all past confidence scorer outputs
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
            {outputs.length > 0 && (
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
            Showing {outputs.length} output{outputs.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* History List */}
        <Card>
          <CardHeader>
            <CardTitle>Confidence Scorer History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p>Loading confidence scorer history...</p>
              </div>
            ) : outputs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Frown className="h-8 w-8 mb-4" />
                <p>No confidence scorer history found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {outputs.map((output) => (
                  <Card key={output.requestId} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="default" className="gap-2">
                              <BarChart className="w-3 h-3" />
                              Confidence Scorer
                            </Badge>
                            {getDecisionBadge(output.decision)}
                            <Badge variant="outline">
                              Confidence: {(output.overallConfidence * 100).toFixed(0)}%
                            </Badge>
                            <Badge variant="secondary">
                              {output.agentScores.length} Agent{output.agentScores.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {output.reasoning}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(output)}
                            className="gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            Details
                          </Button>
                          <Link href={`/requests?search=${output.requestId}`}>
                            <Button variant="outline" size="sm" className="gap-2">
                              Request
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Confidence Scorer Details</DialogTitle>
            </DialogHeader>
            {selectedOutput && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium">Overall Confidence:</span>
                    <div className="mt-2 space-y-2">
                      <Progress value={selectedOutput.overallConfidence * 100} className="h-3" />
                      <span className="text-xs text-muted-foreground">
                        {(selectedOutput.overallConfidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Decision:</span>
                    <div className="mt-2">
                      {getDecisionBadge(selectedOutput.decision)}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Agent Scores ({selectedOutput.agentScores.length})
                  </h4>
                  <div className="space-y-3">
                    {selectedOutput.agentScores.map((score, idx) => (
                      <div key={idx} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{score.agentName}</span>
                          <span className="text-sm font-mono">
                            {(score.score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={score.score * 100} className="h-2" />
                        <p className="text-xs text-muted-foreground">{score.reasoning}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Thresholds Used</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Execute:</span>
                      <span className="font-mono">{selectedOutput.thresholdUsed.execute}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Review:</span>
                      <span className="font-mono">{selectedOutput.thresholdUsed.review}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rethink:</span>
                      <span className="font-mono">{selectedOutput.thresholdUsed.rethink}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Escalate:</span>
                      <span className="font-mono">{selectedOutput.thresholdUsed.escalate}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Reasoning</h4>
                  <p className="text-sm text-muted-foreground">{selectedOutput.reasoning}</p>
                </div>

                {selectedOutput.requestContext && (
                  <div>
                    <h4 className="font-medium mb-2">Request Context</h4>
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="text-muted-foreground">Request ID:</span>
                        <code className="ml-2 font-mono text-xs">{selectedOutput.requestId}</code>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Agent Chain:</span>
                        <span className="ml-2">{selectedOutput.requestContext.agentChain.join(' → ')}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {selectedOutput.requestContext.status}
                        </Badge>
                      </div>
                    </div>
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
          title="Delete All Confidence Scorer History"
          description="Are you sure you want to delete all confidence scorer history? This action cannot be undone."
          itemCount={outputs.length}
          itemName="outputs"
        />
      </div>
    </div>
  )
}


'use client'

import { useState, useEffect } from 'react'
import { ExecutorAgentOutput } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, RefreshCw, History, Trash2, Eye, Play, CheckCircle, XCircle, Loader2, Frown, Clock } from 'lucide-react'
import { DeleteAllDialog } from '@/components/ui/delete-all-dialog'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function ExecutorAgentHistoryPage() {
  const [executions, setExecutions] = useState<ExecutorAgentOutput[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedExecution, setSelectedExecution] = useState<ExecutorAgentOutput | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false)

  const loadHistory = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/agents/executor-agent/history')
      if (!response.ok) {
        throw new Error('Failed to load executor history')
      }

      const data = await response.json()
      const processedData = data.map((d: any) => ({
        ...d,
        timestamp: new Date(d.timestamp),
        executionResult: {
          ...d.executionResult,
          steps: (d.executionResult.steps || []).map((step: any) => ({
            ...step,
            timestamp: new Date(step.timestamp),
          })),
          partialResults: d.executionResult.partialResults || {},
          errors: d.executionResult.errors || [],
          questionsAsked: d.executionResult.questionsAsked || [],
          adaptations: d.executionResult.adaptations || [],
        },
        requestContext: d.requestContext
          ? {
              ...d.requestContext,
              createdAt: new Date(d.requestContext.createdAt),
            }
          : undefined,
      }))
      setExecutions(processedData)
    } catch (err: any) {
      setError(err.message || 'Failed to load executor history')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const handleViewDetails = (execution: ExecutorAgentOutput) => {
    setSelectedExecution(execution)
    setIsDetailOpen(true)
  }

  const handleDeleteAll = async () => {
    try {
      const response = await fetch('/api/agents/executor-agent/history', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete all executor history')
      }

      const result = await response.json()
      setError(null)
      await loadHistory()
      alert(`Successfully deleted ${result.count} execution${result.count !== 1 ? 's' : ''}`)
    } catch (err: any) {
      setError(err.message || 'Failed to delete all executor history')
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Breadcrumbs items={[
          { label: 'Agent Pipeline', href: '/agents/pipeline' },
          { label: 'Executor Agent', href: '/agents/executor-agent' },
          { label: 'History' },
        ]} />
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/agents/executor-agent">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="mb-1 flex items-center gap-2">
                <History className="w-5 h-5" />
                Executor Agent History
              </h1>
              <p className="text-[13px] text-muted-foreground">
                View all past execution results
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
            {executions.length > 0 && (
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
            Showing {executions.length} execution{executions.length !== 1 ? 's' : ''}
          </span>
          <span>•</span>
          <span>
            {executions.filter(e => e.executionResult.overallSuccess).length} successful
          </span>
          <span>•</span>
          <span>
            {executions.filter(e => !e.executionResult.overallSuccess).length} failed
          </span>
        </div>

        {/* History List */}
        <Card>
          <CardHeader>
            <CardTitle>Execution History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p>Loading execution history...</p>
              </div>
            ) : executions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Frown className="h-8 w-8 mb-4" />
                <p>No execution history found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {executions.map((execution) => (
                  <Card key={`${execution.requestId}-${execution.executionVersion}`} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="default" className="gap-2">
                              <Play className="w-3 h-3" />
                              Executor Agent
                            </Badge>
                            {execution.executionResult.overallSuccess ? (
                              <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Success
                              </Badge>
                            ) : (
                              <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900">
                                <XCircle className="w-3 h-3 mr-1" />
                                Failed
                              </Badge>
                            )}
                            <Badge variant="outline">
                              Version {execution.executionVersion || 1}
                            </Badge>
                            <Badge variant="outline">
                              {execution.executionResult.steps.filter(s => s.success).length} / {execution.executionResult.steps.length} steps
                            </Badge>
                            {execution.executionResult.errors.length > 0 && (
                              <Badge variant="secondary" className="text-destructive">
                                {execution.executionResult.errors.length} Error{execution.executionResult.errors.length !== 1 ? 's' : ''}
                              </Badge>
                            )}
                            {execution.executionResult.questionsAsked.length > 0 && (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900">
                                {execution.executionResult.questionsAsked.length} Question{execution.executionResult.questionsAsked.length !== 1 ? 's' : ''}
                              </Badge>
                            )}
                            {execution.executionResult.adaptations.length > 0 && (
                              <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900">
                                {execution.executionResult.adaptations.length} Adaptation{execution.executionResult.adaptations.length !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {execution.executionResult.totalDuration}ms
                            </div>
                            <span>•</span>
                            <span>
                              {new Date(execution.timestamp).toLocaleString()}
                            </span>
                            {execution.critiqueAvailable && (
                              <>
                                <span>•</span>
                                <Badge variant="outline" className="text-xs">
                                  Critique: {execution.critiqueRecommendation}
                                </Badge>
                              </>
                            )}
                          </div>
                          {execution.requestContext?.userQuery && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                              {execution.requestContext.userQuery}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(execution)}
                            className="gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            Details
                          </Button>
                          <Link href={`/agents/executor-agent?requestId=${execution.requestId}`}>
                            <Button variant="outline" size="sm" className="gap-2">
                              View
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
              <DialogTitle>Execution Details</DialogTitle>
            </DialogHeader>
            {selectedExecution && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium">Status:</span>
                    <div className="mt-2">
                      {selectedExecution.executionResult.overallSuccess ? (
                        <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Success
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900">
                          <XCircle className="w-3 h-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Duration:</span>
                    <div className="mt-2 flex items-center gap-1">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{selectedExecution.executionResult.totalDuration}ms</span>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-sm font-medium">Steps:</span>
                  <div className="mt-2 space-y-2">
                    {selectedExecution.executionResult.steps.map((step, idx) => (
                      <div key={idx} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          {step.success ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className="font-medium">Step {step.stepOrder}</span>
                          {step.toolCalled && (
                            <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                              {step.toolCalled}
                            </code>
                          )}
                        </div>
                        {step.error && (
                          <p className="text-sm text-destructive">{step.error}</p>
                        )}
                        {step.result && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-3">
                            {typeof step.result === 'string' ? step.result : JSON.stringify(step.result).substring(0, 200)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {selectedExecution.executionResult.errors.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">Errors:</span>
                    <div className="mt-2 space-y-1">
                      {selectedExecution.executionResult.errors.map((error, idx) => (
                        <p key={idx} className="text-sm text-destructive">{error}</p>
                      ))}
                    </div>
                  </div>
                )}

                {selectedExecution.executionResult.adaptations.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">Adaptations:</span>
                    <div className="mt-2 space-y-2">
                      {selectedExecution.executionResult.adaptations.map((adaptation, idx) => (
                        <div key={idx} className="p-3 border rounded-lg text-sm">
                          <div className="font-medium mb-1">Step {adaptation.stepId}</div>
                          <div className="text-muted-foreground">
                            {adaptation.originalAction} → {adaptation.adaptedAction}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Reason: {adaptation.reason}
                          </div>
                        </div>
                      ))}
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
          title="Delete All Execution History"
          description="Are you sure you want to delete all executor agent history? This action cannot be undone."
          itemCount={executions.length}
          itemName="executions"
        />
      </div>
    </div>
  )
}


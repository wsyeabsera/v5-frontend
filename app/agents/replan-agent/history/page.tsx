'use client'

import { useState, useEffect } from 'react'
import { ReplanAgentOutput } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, RefreshCw, History, Trash2, Eye, RotateCcw, Loader2, Frown, Plus, Minus, Edit, CheckCircle, AlertCircle } from 'lucide-react'
import { DeleteAllDialog } from '@/components/ui/delete-all-dialog'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'

export default function ReplanAgentHistoryPage() {
  const [outputs, setOutputs] = useState<ReplanAgentOutput[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOutput, setSelectedOutput] = useState<ReplanAgentOutput | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false)

  const loadHistory = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/agents/replan-agent/history')
      if (!response.ok) {
        throw new Error('Failed to load replan agent history')
      }

      const data = await response.json()
      const processedData = data.map((d: any) => ({
        ...d,
        timestamp: new Date(d.timestamp),
        plan: {
          ...d.plan,
          createdAt: d.plan.createdAt instanceof Date ? d.plan.createdAt : new Date(d.plan.createdAt),
          steps: d.plan.steps.map((step: any) => ({
            ...step,
            status: step.status || 'pending',
          })),
        },
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
      setError(err.message || 'Failed to load replan agent history')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const handleViewDetails = (output: ReplanAgentOutput) => {
    setSelectedOutput(output)
    setIsDetailOpen(true)
  }

  const handleDeleteAll = async () => {
    try {
      const response = await fetch('/api/agents/replan-agent/history', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete all replan agent history')
      }

      const result = await response.json()
      setError(null)
      await loadHistory()
      alert(`Successfully deleted ${result.count} replan output${result.count !== 1 ? 's' : ''}`)
    } catch (err: any) {
      setError(err.message || 'Failed to delete all replan agent history')
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500'
    if (confidence >= 0.6) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Breadcrumbs items={[
          { label: 'Agent Pipeline', href: '/agents/pipeline' },
          { label: 'Replan Agent', href: '/agents/replan-agent' },
          { label: 'History' },
        ]} />
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/agents/replan-agent">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="mb-1 flex items-center gap-2">
                <History className="w-5 h-5" />
                Replan Agent History
              </h1>
              <p className="text-[13px] text-muted-foreground">
                View all past replan agent outputs
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
            <CardTitle>Replan Agent History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p>Loading replan agent history...</p>
              </div>
            ) : outputs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Frown className="h-8 w-8 mb-4" />
                <p>No replan agent history found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {outputs.map((output) => {
                  const changes = output.changesFromOriginal
                  return (
                    <Card key={`${output.requestId}-${output.planVersion}`} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="default" className="gap-2">
                                <RotateCcw className="w-3 h-3" />
                                Replan Agent
                              </Badge>
                              <Badge variant="outline">
                                Version {output.planVersion}
                              </Badge>
                              <Badge variant="outline">
                                Confidence: {(output.confidence * 100).toFixed(0)}%
                              </Badge>
                              {changes.stepsAdded > 0 && (
                                <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900">
                                  <Plus className="w-3 h-3 mr-1" />
                                  +{changes.stepsAdded}
                                </Badge>
                              )}
                              {changes.stepsRemoved > 0 && (
                                <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900">
                                  <Minus className="w-3 h-3 mr-1" />
                                  -{changes.stepsRemoved}
                                </Badge>
                              )}
                              {changes.stepsModified > 0 && (
                                <Badge variant="outline" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900">
                                  <Edit className="w-3 h-3 mr-1" />
                                  {changes.stepsModified} Modified
                                </Badge>
                              )}
                              <Badge variant="secondary">
                                {output.plan.steps.length} Step{output.plan.steps.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={output.confidence * 100} 
                                className={`h-2 flex-1 ${getConfidenceColor(output.confidence)}`}
                              />
                              <span className="text-xs text-muted-foreground">
                                {(output.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {output.rationale}
                            </p>
                            {output.plan.goal && (
                              <p className="text-xs text-muted-foreground line-clamp-1 italic">
                                Goal: {output.plan.goal}
                              </p>
                            )}
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
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Replan Agent Details</DialogTitle>
            </DialogHeader>
            {selectedOutput && (
              <div className="space-y-6">
                {/* Plan Summary */}
                <div>
                  <span className="text-sm font-medium">Plan Confidence:</span>
                  <div className="mt-2 space-y-2">
                    <Progress 
                      value={selectedOutput.confidence * 100} 
                      className={`h-3 ${getConfidenceColor(selectedOutput.confidence)}`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {(selectedOutput.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Plan Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium">Plan Version:</span>
                    <div className="mt-2">
                      <Badge variant="outline">
                        Version {selectedOutput.planVersion}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Steps:</span>
                    <div className="mt-2">
                      <Badge variant="outline">
                        {selectedOutput.plan.steps.length} Step{selectedOutput.plan.steps.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Goal */}
                <div>
                  <h4 className="font-medium mb-2">Goal</h4>
                  <p className="text-sm text-muted-foreground">{selectedOutput.plan.goal}</p>
                </div>

                {/* Changes Summary */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Edit className="w-4 h-4" />
                    Changes from Original
                  </h4>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Plus className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {selectedOutput.changesFromOriginal.stepsAdded}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">Added</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Minus className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {selectedOutput.changesFromOriginal.stepsRemoved}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">Removed</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Edit className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {selectedOutput.changesFromOriginal.stepsModified}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">Modified</p>
                    </div>
                  </div>
                  {selectedOutput.changesFromOriginal.improvements.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Improvements:</p>
                      <ul className="space-y-1">
                        {selectedOutput.changesFromOriginal.improvements.map((improvement, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground">
                            • {improvement}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Plan Steps */}
                <div>
                  <h4 className="font-medium mb-2">Plan Steps ({selectedOutput.plan.steps.length})</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedOutput.plan.steps.map((step) => (
                      <div key={step.id} className="p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Step {step.order}
                            </Badge>
                            <code className="text-xs font-mono bg-background px-2 py-1 rounded">
                              {step.action}
                            </code>
                          </div>
                          {selectedOutput.changesFromOriginal.addedSteps?.includes(step.id) && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900 text-xs">
                              <Plus className="w-3 h-3 mr-1" />
                              New
                            </Badge>
                          )}
                          {selectedOutput.changesFromOriginal.modifiedSteps?.includes(step.id) && (
                            <Badge variant="outline" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900 text-xs">
                              <Edit className="w-3 h-3 mr-1" />
                              Modified
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                        {step.parameters && Object.keys(step.parameters).length > 0 && (
                          <div className="mt-2 p-2 rounded bg-background border text-xs">
                            <code className="font-mono whitespace-pre-wrap">
                              {JSON.stringify(step.parameters, null, 2)}
                            </code>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feedback Addressing */}
                <div>
                  <h4 className="font-medium mb-2">Feedback Addressed</h4>
                  <div className="space-y-3">
                    {/* Meta Guidance */}
                    {selectedOutput.addressesMetaGuidance.replanStrategyAddressed && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Meta Agent Guidance:</p>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {selectedOutput.addressesMetaGuidance.orchestratorDirectivesAddressed.length > 0 && (
                            <div>✓ {selectedOutput.addressesMetaGuidance.orchestratorDirectivesAddressed.length} directive(s)</div>
                          )}
                          {selectedOutput.addressesMetaGuidance.focusAreasAddressed.length > 0 && (
                            <div>✓ {selectedOutput.addressesMetaGuidance.focusAreasAddressed.length} focus area(s)</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Critic Issues */}
                    {selectedOutput.addressesCriticIssues.issuesResolved.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Critic Agent Issues:</p>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div>✓ {selectedOutput.addressesCriticIssues.issuesResolved.length} issue(s) resolved</div>
                          {selectedOutput.addressesCriticIssues.suggestionsImplemented.length > 0 && (
                            <div>✓ {selectedOutput.addressesCriticIssues.suggestionsImplemented.length} suggestion(s) implemented</div>
                          )}
                          {selectedOutput.addressesCriticIssues.validationWarningsResolved.length > 0 && (
                            <div>✓ {selectedOutput.addressesCriticIssues.validationWarningsResolved.length} validation warning(s) resolved</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Thought Recommendations */}
                    {selectedOutput.addressesThoughtRecommendations.recommendedToolsUsed.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Thought Agent Recommendations:</p>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div>✓ {selectedOutput.addressesThoughtRecommendations.recommendedToolsUsed.length} recommended tool(s) used</div>
                          {selectedOutput.addressesThoughtRecommendations.keyInsightsIncorporated.length > 0 && (
                            <div>✓ {selectedOutput.addressesThoughtRecommendations.keyInsightsIncorporated.length} insight(s) incorporated</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rationale */}
                <div>
                  <h4 className="font-medium mb-2">Rationale</h4>
                  <p className="text-sm text-muted-foreground">{selectedOutput.rationale}</p>
                </div>

                {/* Request Context */}
                {selectedOutput.requestContext && (
                  <div>
                    <h4 className="font-medium mb-2">Request Context</h4>
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="text-muted-foreground">Request ID:</span>
                        <code className="ml-2 font-mono text-xs">{selectedOutput.requestId}</code>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Original Plan ID:</span>
                        <code className="ml-2 font-mono text-xs">{selectedOutput.originalPlanId}</code>
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
          title="Delete All Replan Agent History"
          description="Are you sure you want to delete all replan agent history? This action cannot be undone."
          itemCount={outputs.length}
          itemName="outputs"
        />
      </div>
    </div>
  )
}


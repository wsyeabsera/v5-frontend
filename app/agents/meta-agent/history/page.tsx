'use client'

import { useState, useEffect } from 'react'
import { MetaAgentOutput } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, RefreshCw, History, Trash2, Eye, Brain, Loader2, Frown, CheckCircle, AlertCircle, RotateCcw, AlertTriangle } from 'lucide-react'
import { DeleteAllDialog } from '@/components/ui/delete-all-dialog'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'

export default function MetaAgentHistoryPage() {
  const [outputs, setOutputs] = useState<MetaAgentOutput[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOutput, setSelectedOutput] = useState<MetaAgentOutput | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false)

  const loadHistory = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/agents/meta-agent/history')
      if (!response.ok) {
        throw new Error('Failed to load meta agent history')
      }

      const data = await response.json()
      const processedData = data.map((d: any) => ({
        ...d,
        timestamp: new Date(d.timestamp),
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
      setError(err.message || 'Failed to load meta agent history')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const handleViewDetails = (output: MetaAgentOutput) => {
    setSelectedOutput(output)
    setIsDetailOpen(true)
  }

  const handleDeleteAll = async () => {
    try {
      const response = await fetch('/api/agents/meta-agent/history', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete all meta agent history')
      }

      const result = await response.json()
      setError(null)
      await loadHistory()
      alert(`Successfully deleted ${result.count} meta output${result.count !== 1 ? 's' : ''}`)
    } catch (err: any) {
      setError(err.message || 'Failed to delete all meta agent history')
    }
  }

  const getQualityColor = (quality: number) => {
    if (quality >= 0.8) return 'bg-green-500'
    if (quality >= 0.6) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getReplanBadge = (shouldReplan: boolean) => {
    if (shouldReplan) {
      return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900">Replan Needed</Badge>
    }
    return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900">No Replan</Badge>
  }

  const getDeepenBadge = (shouldDeepen: boolean) => {
    if (shouldDeepen) {
      return <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900">Deepen Reasoning</Badge>
    }
    return <Badge variant="secondary">Sufficient Depth</Badge>
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Breadcrumbs items={[
          { label: 'Agent Pipeline', href: '/agents/pipeline' },
          { label: 'Meta Agent', href: '/agents/meta-agent' },
          { label: 'History' },
        ]} />
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/agents/meta-agent">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="mb-1 flex items-center gap-2">
                <History className="w-5 h-5" />
                Meta Agent History
              </h1>
              <p className="text-[13px] text-muted-foreground">
                View all past meta agent outputs
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
            <CardTitle>Meta Agent History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p>Loading meta agent history...</p>
              </div>
            ) : outputs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Frown className="h-8 w-8 mb-4" />
                <p>No meta agent history found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {outputs.map((output) => {
                  const patternAnalysis = output.patternAnalysis
                  const patternCount = patternAnalysis?.detectedPatterns?.length || 0
                  const inconsistencyCount = patternAnalysis?.inconsistencies?.length || 0
                  const directiveCount = output.orchestratorDirectives?.length || 0
                  const focusAreaCount = output.focusAreas?.length || 0

                  return (
                    <Card key={output.requestId} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="default" className="gap-2">
                                <Brain className="w-3 h-3" />
                                Meta Agent
                              </Badge>
                              {getReplanBadge(output.shouldReplan)}
                              {getDeepenBadge(output.shouldDeepenReasoning)}
                              <Badge variant="outline">
                                Quality: {(output.reasoningQuality * 100).toFixed(0)}%
                              </Badge>
                              {patternCount > 0 && (
                                <Badge variant="secondary">
                                  {patternCount} Pattern{patternCount !== 1 ? 's' : ''}
                                </Badge>
                              )}
                              {inconsistencyCount > 0 && (
                                <Badge variant="destructive">
                                  {inconsistencyCount} Issue{inconsistencyCount !== 1 ? 's' : ''}
                                </Badge>
                              )}
                              {directiveCount > 0 && (
                                <Badge variant="secondary">
                                  {directiveCount} Directive{directiveCount !== 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={output.reasoningQuality * 100} 
                                className={`h-2 flex-1 ${getQualityColor(output.reasoningQuality)}`}
                              />
                              <span className="text-xs text-muted-foreground">
                                {(output.reasoningQuality * 100).toFixed(0)}%
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {output.assessment}
                            </p>
                            {output.replanStrategy && (
                              <p className="text-xs text-muted-foreground line-clamp-1 italic">
                                Replan: {output.replanStrategy}
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
              <DialogTitle>Meta Agent Details</DialogTitle>
            </DialogHeader>
            {selectedOutput && (
              <div className="space-y-6">
                {/* Reasoning Quality */}
                <div>
                  <span className="text-sm font-medium">Reasoning Quality:</span>
                  <div className="mt-2 space-y-2">
                    <Progress 
                      value={selectedOutput.reasoningQuality * 100} 
                      className={`h-3 ${getQualityColor(selectedOutput.reasoningQuality)}`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {(selectedOutput.reasoningQuality * 100).toFixed(0)}%
                    </span>
                  </div>
                  {selectedOutput.reasoningQualityBreakdown && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Logic:</span>
                        <Progress value={selectedOutput.reasoningQualityBreakdown.logic * 100} className="h-2 w-32" />
                        <span className="text-xs">{(selectedOutput.reasoningQualityBreakdown.logic * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Completeness:</span>
                        <Progress value={selectedOutput.reasoningQualityBreakdown.completeness * 100} className="h-2 w-32" />
                        <span className="text-xs">{(selectedOutput.reasoningQualityBreakdown.completeness * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Alignment:</span>
                        <Progress value={selectedOutput.reasoningQualityBreakdown.alignment * 100} className="h-2 w-32" />
                        <span className="text-xs">{(selectedOutput.reasoningQualityBreakdown.alignment * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Flags */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium">Should Replan:</span>
                    <div className="mt-2">
                      {getReplanBadge(selectedOutput.shouldReplan)}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Should Deepen Reasoning:</span>
                    <div className="mt-2">
                      {getDeepenBadge(selectedOutput.shouldDeepenReasoning)}
                    </div>
                  </div>
                </div>

                {/* Replan Strategy */}
                {selectedOutput.replanStrategy && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <RotateCcw className="w-4 h-4" />
                      Replan Strategy
                    </h4>
                    <p className="text-sm text-muted-foreground">{selectedOutput.replanStrategy}</p>
                  </div>
                )}

                {/* Focus Areas */}
                {selectedOutput.focusAreas && selectedOutput.focusAreas.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Focus Areas ({selectedOutput.focusAreas.length})</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {selectedOutput.focusAreas.map((area, idx) => (
                        <li key={idx}>{area}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Pattern Analysis */}
                {selectedOutput.patternAnalysis && (
                  <div>
                    <h4 className="font-medium mb-2">Pattern Analysis</h4>
                    <div className="space-y-3">
                      {selectedOutput.patternAnalysis.detectedPatterns && selectedOutput.patternAnalysis.detectedPatterns.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">Detected Patterns:</span>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mt-1">
                            {selectedOutput.patternAnalysis.detectedPatterns.map((pattern, idx) => (
                              <li key={idx}>{pattern}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedOutput.patternAnalysis.inconsistencies && selectedOutput.patternAnalysis.inconsistencies.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-orange-600 dark:text-orange-400">Inconsistencies:</span>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mt-1">
                            {selectedOutput.patternAnalysis.inconsistencies.map((inc, idx) => (
                              <li key={idx}>{inc}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedOutput.patternAnalysis.strengths && selectedOutput.patternAnalysis.strengths.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">Strengths:</span>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mt-1">
                            {selectedOutput.patternAnalysis.strengths.map((strength, idx) => (
                              <li key={idx}>{strength}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedOutput.patternAnalysis.weaknesses && selectedOutput.patternAnalysis.weaknesses.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-red-600 dark:text-red-400">Weaknesses:</span>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mt-1">
                            {selectedOutput.patternAnalysis.weaknesses.map((weakness, idx) => (
                              <li key={idx}>{weakness}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Orchestrator Directives */}
                {selectedOutput.orchestratorDirectives && selectedOutput.orchestratorDirectives.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Orchestrator Directives ({selectedOutput.orchestratorDirectives.length})
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {selectedOutput.orchestratorDirectives.map((directive, idx) => (
                        <li key={idx}>{directive}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommended Actions */}
                {selectedOutput.recommendedActions && selectedOutput.recommendedActions.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Recommended Actions</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {selectedOutput.recommendedActions.map((action, idx) => (
                        <li key={idx}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Assessment */}
                <div>
                  <h4 className="font-medium mb-2">Assessment</h4>
                  <p className="text-sm text-muted-foreground">{selectedOutput.assessment}</p>
                </div>

                {/* Reasoning Depth Recommendation */}
                {selectedOutput.reasoningDepthRecommendation && (
                  <div>
                    <span className="text-sm font-medium">Reasoning Depth Recommendation:</span>
                    <Badge variant="outline" className="ml-2">
                      {selectedOutput.reasoningDepthRecommendation} pass{selectedOutput.reasoningDepthRecommendation !== 1 ? 'es' : ''}
                    </Badge>
                  </div>
                )}

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
          title="Delete All Meta Agent History"
          description="Are you sure you want to delete all meta agent history? This action cannot be undone."
          itemCount={outputs.length}
          itemName="outputs"
        />
      </div>
    </div>
  )
}


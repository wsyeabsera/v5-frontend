'use client'

import { useState, useEffect, Suspense } from 'react'
import { ReplanAgentOutput, AgentConfig, RequestContext } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { PipelineBanner } from '@/components/agents/PipelineBanner'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { getRequestsWithMetaAgent } from '@/lib/api/requests-api'
import { useStore } from '@/lib/store'
import { useAgentConfigs, useModels } from '@/lib/queries'
import { Loader2, Settings, Check, RotateCcw, Clock, History, ChevronDown, Inbox, AlertTriangle, CheckCircle, ArrowRight, Plus, Minus, Edit } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Progress } from '@/components/ui/progress'

function ReplanAgentContent() {
  const searchParams = useSearchParams()
  const urlRequestId = searchParams.get('requestId')
  
  const [requests, setRequests] = useState<(RequestContext & { replanOutputExists: boolean })[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ReplanAgentOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [configOpen, setConfigOpen] = useState(false)
  
  const { data: agentConfigsData } = useAgentConfigs()
  const { data: modelsData } = useModels()

  // Filter enabled agent configs
  const enabledConfigs = (agentConfigsData || []).filter((config: AgentConfig) => config.enabled)
  
  // Default to replan-agent if it exists
  useEffect(() => {
    if (!selectedAgentId && enabledConfigs.length > 0) {
      const replanAgent = enabledConfigs.find((c: AgentConfig) => c.agentId === 'replan-agent')
      if (replanAgent) {
        setSelectedAgentId('replan-agent')
      } else {
        setSelectedAgentId(enabledConfigs[0]?.agentId || '')
      }
    }
  }, [agentConfigsData, selectedAgentId, enabledConfigs.length])

  // Load requests on mount
  useEffect(() => {
    loadRequests()
  }, [])

  // Auto-select request from URL if present
  useEffect(() => {
    if (urlRequestId && requests.length > 0) {
      const request = requests.find(r => r.requestId === urlRequestId)
      if (request) {
        handleRequestSelect(request)
      }
    }
  }, [urlRequestId, requests])

  const loadRequests = async () => {
    setLoadingRequests(true)
    setError(null)
    try {
      const data = await getRequestsWithMetaAgent()
      setRequests(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load requests')
    } finally {
      setLoadingRequests(false)
    }
  }

  // Get selected config
  const selectedConfig = enabledConfigs.find((c: AgentConfig) => c.agentId === selectedAgentId)
  
  // Get model info for selected config
  const models = modelsData?.models || []
  const selectedModel = selectedConfig?.modelId 
    ? models.find((m: any) => m.id === selectedConfig.modelId)
    : null

  // Get model test results for badge display
  const { modelTestResults } = useStore()

  // Load config open state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('replan-agent-config-open')
    if (saved !== null) {
      setConfigOpen(JSON.parse(saved))
    }
  }, [])

  // Save config open state to localStorage
  useEffect(() => {
    localStorage.setItem('replan-agent-config-open', JSON.stringify(configOpen))
  }, [configOpen])

  const handleRequestSelect = async (request: RequestContext & { replanOutputExists: boolean }) => {
    setSelectedRequestId(request.requestId)
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Try to fetch existing replan output first
      const existingResponse = await fetch(`/api/agents/replan-agent?requestId=${request.requestId}`)
      if (existingResponse.ok) {
        const existingData = await existingResponse.json()
        setResult(existingData)
        setLoading(false)
        return
      }

      // If no existing output, generate replan
      const response = await fetch('/api/agents/replan-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: request.requestId,
          agentId: selectedAgentId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate replan')
      }

      const data = await response.json()
      setResult(data)
      
      // Update the request's replan output status
      setRequests(prev => prev.map(r => 
        r.requestId === request.requestId 
          ? { ...r, replanOutputExists: true }
          : r
      ))
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500'
    if (confidence >= 0.6) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Breadcrumbs items={[
          { label: 'Agent Pipeline', href: '/agents/pipeline' },
          { label: 'Replan Agent' },
        ]} />
        <PipelineBanner currentAgent="replan-agent" />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Replan Agent</h1>
            <p className="text-[13px] text-muted-foreground">
              Generate improved plans by learning from Meta, Critic, and Thought agent feedback
            </p>
          </div>
          <Link href="/agents/replan-agent/history">
            <Button variant="outline" size="sm" className="gap-2">
              <History className="w-4 h-4" />
              View History
            </Button>
          </Link>
        </div>

        {/* Split-screen Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-240px)]">
          {/* Left Column: Request List - independently scrollable */}
          <div className="space-y-6 overflow-y-auto pr-2">
            {/* Agent Config Selector - Collapsible */}
            <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Agent Configuration
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {selectedConfig && (
                          <Badge variant="outline" className="text-xs">
                            {selectedConfig.name}
                          </Badge>
                        )}
                        <ChevronDown className={`w-4 h-4 transition-transform ${configOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="agentConfig" className="text-sm font-medium">Select Agent Configuration</label>
                      <Select
                        value={selectedAgentId}
                        onValueChange={setSelectedAgentId}
                        disabled={loading || enabledConfigs.length === 0}
                      >
                        <SelectTrigger id="agentConfig">
                          <SelectValue placeholder="Select an agent configuration">
                            {selectedConfig && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{selectedConfig.name}</span>
                                {selectedConfig.modelId && modelTestResults[selectedConfig.modelId]?.status === 'success' && (
                                  <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900">
                                    <Check className="w-3 h-3 mr-1" />
                                    Verified
                                  </Badge>
                                )}
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {enabledConfigs.length === 0 ? (
                            <div className="p-4 text-sm text-muted-foreground text-center">
                              No enabled agent configurations available. Configure agents in Settings.
                            </div>
                          ) : (
                            enabledConfigs.map((config: AgentConfig) => {
                              const model = models.find((m: any) => m.id === config.modelId)
                              const isTested = config.modelId ? modelTestResults[config.modelId]?.status === 'success' : false
                              return (
                                <SelectItem key={config.agentId} value={config.agentId}>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{config.name}</span>
                                    {isTested && (
                                      <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900 ml-auto">
                                        <Check className="w-3 h-3 mr-1" />
                                        Tested
                                      </Badge>
                                    )}
                                    {model && (
                                      <span className="text-xs text-muted-foreground">({model.provider})</span>
                                    )}
                                  </div>
                                </SelectItem>
                              )
                            })
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Selected Config Details */}
                    {selectedConfig && (
                      <div className="p-4 rounded-lg bg-muted/50 border border-border/50 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm mb-1">{selectedConfig.name}</h4>
                            <p className="text-xs text-muted-foreground">{selectedConfig.description}</p>
                          </div>
                          <Badge variant={selectedConfig.enabled ? 'default' : 'secondary'}>
                            {selectedConfig.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        {selectedModel && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Model:</span>
                            <span className="font-medium">{selectedModel.name}</span>
                            <span className="text-xs text-muted-foreground">({selectedModel.provider})</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Requests List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="w-5 h-5" />
                  Select a Request
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingRequests ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading requests...</span>
                  </div>
                ) : requests.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No requests found with meta-agent in the agent chain.
                    <br />
                    <span className="text-xs mt-1">Run Meta Agent first, then generate replans here.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {requests.map((request) => (
                      <div
                        key={request.requestId}
                        onClick={() => handleRequestSelect(request)}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedRequestId === request.requestId
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                                {request.requestId.substring(0, 8)}...
                              </code>
                              {request.replanOutputExists && (
                                <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900">
                                  <Check className="w-3 h-3 mr-1" />
                                  Replanned
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {request.status}
                              </Badge>
                            </div>
                            {request.userQuery && (
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                {request.userQuery}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {new Date(request.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Error Display */}
            {error && (
              <Card className="border-destructive bg-destructive/10">
                <CardContent className="pt-6">
                  <p className="text-sm text-destructive">{error}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Results - independently scrollable */}
          <div className="space-y-6 overflow-y-auto pr-2">
            {loading ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Generating improved plan...</span>
                  </div>
                </CardContent>
              </Card>
            ) : result ? (
              <>
                {/* Plan Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <RotateCcw className="w-5 h-5" />
                      Improved Plan (Version {result.planVersion})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Confidence</span>
                        <span className="text-2xl font-bold">
                          {(result.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={result.confidence * 100} className={`h-3 ${getConfidenceColor(result.confidence)}`} />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={getConfidenceColor(result.confidence)}>
                        Confidence: {(result.confidence * 100).toFixed(0)}%
                      </Badge>
                      <Badge variant="outline">
                        Version {result.planVersion}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {result.plan.steps.length} Step{result.plan.steps.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium mb-2">Goal:</p>
                      <p className="text-sm text-muted-foreground">{result.plan.goal}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Changes Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Edit className="w-5 h-5" />
                      Changes from Original
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Plus className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {result.changesFromOriginal.stepsAdded}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">Added</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Minus className="w-4 h-4 text-red-600 dark:text-red-400" />
                          <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {result.changesFromOriginal.stepsRemoved}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">Removed</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Edit className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                            {result.changesFromOriginal.stepsModified}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">Modified</p>
                      </div>
                    </div>
                    {result.changesFromOriginal.improvements.length > 0 && (
                      <div className="pt-3 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Improvements:</p>
                        <ul className="space-y-1">
                          {result.changesFromOriginal.improvements.map((improvement, idx) => (
                            <li key={idx} className="text-xs text-muted-foreground">
                              • {improvement}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Rationale */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Why This Plan is Better</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {result.rationale}
                    </p>
                  </CardContent>
                </Card>

                {/* Plan Steps */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Plan Steps</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {result.plan.steps.map((step) => (
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
                            {result.changesFromOriginal.addedSteps?.includes(step.id) && (
                              <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900 text-xs">
                                <Plus className="w-3 h-3 mr-1" />
                                New
                              </Badge>
                            )}
                            {result.changesFromOriginal.modifiedSteps?.includes(step.id) && (
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
                          <p className="text-xs text-muted-foreground mt-2">
                            Expected: {step.expectedOutcome}
                          </p>
                          {step.dependencies && step.dependencies.length > 0 && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                              <ArrowRight className="w-3 h-3" />
                              Depends on: {step.dependencies.join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Feedback Addressing */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Feedback Addressed</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Meta Guidance */}
                    {result.addressesMetaGuidance.replanStrategyAddressed && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Meta Agent Guidance:</p>
                        <div className="space-y-1">
                          {result.addressesMetaGuidance.orchestratorDirectivesAddressed.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              ✓ {result.addressesMetaGuidance.orchestratorDirectivesAddressed.length} directive(s) addressed
                            </div>
                          )}
                          {result.addressesMetaGuidance.focusAreasAddressed.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              ✓ {result.addressesMetaGuidance.focusAreasAddressed.length} focus area(s) addressed
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Critic Issues */}
                    {result.addressesCriticIssues.issuesResolved.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Critic Agent Issues:</p>
                        <div className="text-xs text-muted-foreground">
                          ✓ {result.addressesCriticIssues.issuesResolved.length} issue(s) resolved
                        </div>
                        {result.addressesCriticIssues.suggestionsImplemented.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            ✓ {result.addressesCriticIssues.suggestionsImplemented.length} suggestion(s) implemented
                          </div>
                        )}
                        {result.addressesCriticIssues.validationWarningsResolved.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            ✓ {result.addressesCriticIssues.validationWarningsResolved.length} validation warning(s) resolved
                          </div>
                        )}
                      </div>
                    )}

                    {/* Thought Recommendations */}
                    {result.addressesThoughtRecommendations.recommendedToolsUsed.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Thought Agent Recommendations:</p>
                        <div className="text-xs text-muted-foreground">
                          ✓ {result.addressesThoughtRecommendations.recommendedToolsUsed.length} recommended tool(s) used
                        </div>
                        {result.addressesThoughtRecommendations.keyInsightsIncorporated.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            ✓ {result.addressesThoughtRecommendations.keyInsightsIncorporated.length} insight(s) incorporated
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Inbox className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      Select a request from the list to generate or view a replan
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ReplanAgentPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <ReplanAgentContent />
    </Suspense>
  )
}


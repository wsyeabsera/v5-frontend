'use client'

import { useState, useEffect, Suspense } from 'react'
import { ConfidenceScorerOutput, AgentConfig, RequestContext, ConfidenceScore } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { PipelineBanner } from '@/components/agents/PipelineBanner'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { getRequestsWithCriticAgent } from '@/lib/api/requests-api'
import { useStore } from '@/lib/store'
import { useAgentConfigs, useModels } from '@/lib/queries'
import { Loader2, Settings, Check, BarChart, Clock, History, ChevronDown, Inbox, TrendingUp, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Progress } from '@/components/ui/progress'
import { generateRequestId } from '@/lib/utils/request-id'

function ConfidenceScorerContent() {
  const searchParams = useSearchParams()
  const urlRequestId = searchParams.get('requestId')
  
  const [requests, setRequests] = useState<(RequestContext & { confidenceOutputExists: boolean })[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ConfidenceScorerOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [configOpen, setConfigOpen] = useState(false)
  
  const { data: agentConfigsData } = useAgentConfigs()
  const { data: modelsData } = useModels()

  // Filter enabled agent configs
  const enabledConfigs = (agentConfigsData || []).filter((config: AgentConfig) => config.enabled)
  
  // Default to confidence-scorer if it exists
  useEffect(() => {
    if (!selectedAgentId && enabledConfigs.length > 0) {
      const confidenceScorer = enabledConfigs.find((c: AgentConfig) => c.agentId === 'confidence-scorer')
      if (confidenceScorer) {
        setSelectedAgentId('confidence-scorer')
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
      const data = await getRequestsWithCriticAgent()
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
    const saved = localStorage.getItem('confidence-scorer-config-open')
    if (saved !== null) {
      setConfigOpen(JSON.parse(saved))
    }
  }, [])

  // Save config open state to localStorage
  useEffect(() => {
    localStorage.setItem('confidence-scorer-config-open', JSON.stringify(configOpen))
  }, [configOpen])

  const handleRequestSelect = async (request: RequestContext & { confidenceOutputExists: boolean }) => {
    setSelectedRequestId(request.requestId)
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Try to fetch existing confidence output first
      const existingResponse = await fetch(`/api/agents/confidence-scorer?requestId=${request.requestId}`)
      if (existingResponse.ok) {
        const existingData = await existingResponse.json()
        setResult(existingData)
        setLoading(false)
        return
      }

      // If no existing output, try to collect confidence scores from other agents
      // For now, we'll create mock scores for demonstration
      // In production, these would be extracted from thought-agent, planner-agent, critic-agent outputs
      const agentScores: ConfidenceScore[] = [
        {
          agentName: 'thought-agent',
          score: 0.85,
          reasoning: 'High confidence in reasoning approach',
          timestamp: new Date(),
        },
        {
          agentName: 'planner-agent',
          score: 0.75,
          reasoning: 'Medium-high confidence in plan structure',
          timestamp: new Date(),
        },
        {
          agentName: 'critic-agent',
          score: 0.80,
          reasoning: 'Plan passed validation checks',
          timestamp: new Date(),
        },
      ]

      // Score confidence
      const response = await fetch('/api/agents/confidence-scorer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentScores,
          requestContext: request,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to score confidence')
      }

      const data = await response.json()
      setResult(data)
      
      // Update the request's confidence output status
      setRequests(prev => prev.map(r => 
        r.requestId === request.requestId 
          ? { ...r, confidenceOutputExists: true }
          : r
      ))
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'execute':
        return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900'
      case 'review':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900'
      case 'rethink':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900'
      case 'escalate':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900'
      default:
        return 'bg-muted'
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
      <div className="max-w-7xl mx-auto space-y-6">
        <Breadcrumbs items={[
          { label: 'Agent Pipeline', href: '/agents/pipeline' },
          { label: 'Confidence Scorer' },
        ]} />
        <PipelineBanner currentAgent="confidence-scorer" />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Confidence Scorer</h1>
            <p className="text-[13px] text-muted-foreground">
              Aggregate confidence scores from multiple agents and make routing decisions
            </p>
          </div>
          <Link href="/agents/confidence-scorer/history">
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
                      <p className="text-xs text-muted-foreground">
                        Note: Confidence Scorer is a utility class that aggregates scores. Agent configs are shown for UI consistency.
                      </p>
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
                  <BarChart className="w-5 h-5" />
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
                    No requests found with critic-agent in the agent chain.
                    <br />
                    <span className="text-xs mt-1">Generate some critiques in the Critic Agent first.</span>
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
                              {request.confidenceOutputExists && (
                                <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900">
                                  <Check className="w-3 h-3 mr-1" />
                                  Has Score
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
                    <span className="ml-2 text-sm text-muted-foreground">Scoring confidence...</span>
                  </div>
                </CardContent>
              </Card>
            ) : result ? (
              <>
                {/* Overall Confidence Score */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Overall Confidence
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Confidence Score</span>
                        <span className="text-2xl font-bold">
                          {(result.overallConfidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={result.overallConfidence * 100} className="h-3" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getDecisionColor(result.decision)}>
                        {getDecisionIcon(result.decision)}
                        <span className="ml-1 capitalize">{result.decision}</span>
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{result.reasoning}</p>
                  </CardContent>
                </Card>

                {/* Decision Thresholds */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Decision Thresholds</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Execute:</span>
                        <span className="font-mono">{result.thresholdUsed.execute}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Review:</span>
                        <span className="font-mono">{result.thresholdUsed.review}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Rethink:</span>
                        <span className="font-mono">{result.thresholdUsed.rethink}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Escalate:</span>
                        <span className="font-mono">{result.thresholdUsed.escalate}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Agent Scores Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Agent Scores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {result.agentScores.map((score, index) => (
                        <div key={index} className="space-y-2">
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
                  </CardContent>
                </Card>

                {/* Request Context */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Request Context</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Request ID:</span>
                      <code className="ml-2 font-mono text-xs">{result.requestId}</code>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Agent Chain:</span>
                      <span className="ml-2">{result.requestContext.agentChain.join(' → ')}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {result.requestContext.status}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Timestamp:</span>
                      <span className="ml-2">
                        {new Date(result.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Inbox className="w-12 h-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground mb-1">No Results Yet</p>
                    <p className="text-xs text-muted-foreground">Select a request to score confidence</p>
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

export default function ConfidenceScorerPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    }>
      <ConfidenceScorerContent />
    </Suspense>
  )
}


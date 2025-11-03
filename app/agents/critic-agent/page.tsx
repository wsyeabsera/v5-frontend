'use client'

import { useState, useEffect, Suspense } from 'react'
import { CriticAgentOutput, AgentConfig, RequestContext, Plan } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { PipelineBanner } from '@/components/agents/PipelineBanner'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { getRequestsWithPlannerAgent } from '@/lib/api/requests-api'
import { useStore } from '@/lib/store'
import { useAgentConfigs, useModels } from '@/lib/queries'
import { Loader2, Settings, Check, ShieldCheck, AlertTriangle, TrendingUp, TrendingDown, MessageSquare, Clock, History, ChevronDown, Inbox } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Textarea } from '@/components/ui/textarea'

function CriticAgentContent() {
  const searchParams = useSearchParams()
  const urlRequestId = searchParams.get('requestId')
  
  const [requests, setRequests] = useState<(RequestContext & { critiqueOutputExists: boolean })[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CriticAgentOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [configOpen, setConfigOpen] = useState(false)
  const [userFeedback, setUserFeedback] = useState<{ questionId: string; answer: string }[]>([])
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  
  const { data: agentConfigsData } = useAgentConfigs()
  const { data: modelsData } = useModels()

  // Filter enabled agent configs
  const enabledConfigs = (agentConfigsData || []).filter((config: AgentConfig) => config.enabled)
  
  // Default to critic-agent if it exists
  useEffect(() => {
    if (!selectedAgentId && enabledConfigs.length > 0) {
      const criticAgent = enabledConfigs.find((c: AgentConfig) => c.agentId === 'critic-agent')
      if (criticAgent) {
        setSelectedAgentId('critic-agent')
      } else {
        setSelectedAgentId(enabledConfigs[0].agentId)
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
      const data = await getRequestsWithPlannerAgent()
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
    const saved = localStorage.getItem('critic-agent-config-open')
    if (saved !== null) {
      setConfigOpen(JSON.parse(saved))
    }
  }, [])

  // Save config open state to localStorage
  useEffect(() => {
    localStorage.setItem('critic-agent-config-open', JSON.stringify(configOpen))
  }, [configOpen])

  const handleRequestSelect = async (request: RequestContext & { critiqueOutputExists: boolean }) => {
    setSelectedRequestId(request.requestId)
    setLoading(true)
    setError(null)
    setResult(null)
    setUserFeedback([])

    if (!selectedAgentId || !selectedConfig) {
      setError('Please select an agent configuration')
      setLoading(false)
      return
    }

    try {
      // First, get the planner output for this request
      const plannerResponse = await fetch(`/api/agents/planner-agent/history/${request.requestId}`)
      if (!plannerResponse.ok) {
        throw new Error('Failed to fetch planner output for this request')
      }
      const plannerData = await plannerResponse.json()
      
      if (!plannerData.plan) {
        throw new Error('No plan found for this request. Please generate a plan first.')
      }

      // Now critique the plan
      const response = await fetch('/api/agents/critic-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: plannerData.plan,
          userQuery: plannerData.requestContext?.userQuery || request.userQuery || plannerData.plan.goal || 'No user query available',
          requestContext: plannerData.requestContext || request,
          agentId: selectedAgentId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate critique')
      }

      const data = await response.json()
      setResult(data)
      
      // Update the request's critique output status
      setRequests(prev => prev.map(r => 
        r.requestId === request.requestId 
          ? { ...r, critiqueOutputExists: true }
          : r
      ))
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitFeedback = async () => {
    if (!result || userFeedback.length === 0) return

    setSubmittingFeedback(true)
    setError(null)

    try {
      // Get the planner output again
      const plannerResponse = await fetch(`/api/agents/planner-agent/history/${result.requestId}`)
      if (!plannerResponse.ok) {
        throw new Error('Failed to fetch planner output')
      }
      const plannerData = await plannerResponse.json()

      // Regenerate critique with user feedback
      const response = await fetch('/api/agents/critic-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: plannerData.plan,
          userQuery: result.requestContext.userQuery || plannerData.plan.goal || 'No user query available',
          requestContext: result.requestContext,
          userFeedback,
          agentId: selectedAgentId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to regenerate critique')
      }

      const data = await response.json()
      setResult(data)
      setUserFeedback([])
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setSubmittingFeedback(false)
    }
  }

  const updateFeedback = (questionId: string, answer: string) => {
    setUserFeedback(prev => {
      const existing = prev.find(f => f.questionId === questionId)
      if (existing) {
        return prev.map(f => f.questionId === questionId ? { questionId, answer } : f)
      }
      return [...prev, { questionId, answer }]
    })
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Breadcrumbs items={[
          { label: 'Agent Pipeline', href: '/agents/pipeline' },
          { label: 'Critic Agent' },
        ]} />
        <PipelineBanner currentAgent="critic-agent" />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Critic Agent</h1>
            <p className="text-[13px] text-muted-foreground">
              Evaluate plans for errors, risks, and completeness before execution
            </p>
          </div>
          <Link href="/agents/critic-agent/history">
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
                        Choose which agent configuration to use for critique. The selected config's model and parameters will be used for LLM calls.
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
                        {selectedConfig.parameters && (
                          <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-border/40">
                            <div>
                              <span className="text-muted-foreground">Temperature:</span>
                              <span className="ml-1 font-mono">{selectedConfig.parameters.temperature?.toFixed(2) || '0.30'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Max Tokens:</span>
                              <span className="ml-1 font-mono">{selectedConfig.parameters.maxTokens || 500}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Top P:</span>
                              <span className="ml-1 font-mono">{selectedConfig.parameters.topP?.toFixed(2) || '0.90'}</span>
                            </div>
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
                  <ShieldCheck className="w-5 h-5" />
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
                    No requests found with planner-agent in the agent chain.
                    <br />
                    <span className="text-xs mt-1">Generate some plans in the Planner Agent first.</span>
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
                                {request.requestId}
                              </code>
                              {request.critiqueOutputExists && (
                                <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900">
                                  <Check className="w-3 h-3 mr-1" />
                                  Has Critique
                                </Badge>
                              )}
                            </div>
                            {request.userQuery && (
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                {request.userQuery}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(request.createdAt).toLocaleString()}
                              </div>
                              <div className="flex items-center gap-1">
                                <span>Chain:</span>
                                <Badge variant="secondary" className="text-xs">
                                  {request.agentChain.join(' → ')}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          {selectedRequestId === request.requestId && loading && (
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          )}
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
                    <span className="ml-2 text-sm text-muted-foreground">Evaluating plan...</span>
                  </div>
                </CardContent>
              </Card>
            ) : result ? (
              <CritiqueResultsDisplay result={result} userFeedback={userFeedback} updateFeedback={updateFeedback} onSubmitFeedback={handleSubmitFeedback} submittingFeedback={submittingFeedback} />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Inbox className="w-12 h-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground mb-1">No Results Yet</p>
                    <p className="text-xs text-muted-foreground">Select a request to generate critique results</p>
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

function CritiqueResultsDisplay({ 
  result, 
  userFeedback, 
  updateFeedback, 
  onSubmitFeedback, 
  submittingFeedback 
}: { 
  result: CriticAgentOutput
  userFeedback: { questionId: string; answer: string }[]
  updateFeedback: (questionId: string, answer: string) => void
  onSubmitFeedback: () => void
  submittingFeedback: boolean
}) {
  const { critique } = result
  
  // Get recommendation badge styling
  const getRecommendationBadge = (recommendation: string) => {
    switch (recommendation) {
      case 'approve':
        return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900">Approve</Badge>
      case 'revise':
        return <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900">Revise</Badge>
      case 'reject':
        return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900">Reject</Badge>
      default:
        return <Badge variant="secondary">{recommendation}</Badge>
    }
  }

  // Get severity badge styling
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900">Critical</Badge>
      case 'high':
        return <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900">High</Badge>
      case 'medium':
        return <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900">Medium</Badge>
      case 'low':
        return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900">Low</Badge>
      default:
        return <Badge variant="secondary">{severity}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Request Info */}
      <Card>
        <CardHeader>
          <CardTitle>Request Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm">
            <span className="text-muted-foreground">Request ID:</span>
            <code className="ml-2 px-2 py-1 bg-muted rounded text-xs">
              {result.requestId}
            </code>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Plan ID:</span>
            <code className="ml-2 px-2 py-1 bg-muted rounded text-xs">
              {result.planId}
            </code>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Agent Chain:</span>
            <span className="ml-2">{result.requestContext.agentChain.join(' → ')}</span>
          </div>
        </CardContent>
      </Card>

      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Overall Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{(critique.overallScore * 100).toFixed(0)}%</span>
            {getRecommendationBadge(critique.recommendation)}
          </div>
          <div className="w-full bg-muted h-3 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                critique.overallScore >= 0.8 ? 'bg-green-500' :
                critique.overallScore >= 0.6 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${critique.overallScore * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{critique.rationale}</p>
        </CardContent>
      </Card>

      {/* Detailed Scores */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Scores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { name: 'Feasibility', score: critique.feasibilityScore, icon: TrendingUp },
            { name: 'Correctness', score: critique.correctnessScore, icon: ShieldCheck },
            { name: 'Efficiency', score: critique.efficiencyScore, icon: TrendingUp },
            { name: 'Safety', score: critique.safetyScore, icon: AlertTriangle },
          ].map(({ name, score, icon: Icon }) => (
            <div key={name}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{name}</span>
                </div>
                <span className="text-sm">{(score * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${score * 100}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Issues */}
      {critique.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Issues ({critique.issues.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['critical', 'high', 'medium', 'low'].map(severity => {
                const issues = critique.issues.filter(i => i.severity === severity)
                if (issues.length === 0) return null
                
                return (
                  <div key={severity}>
                    <div className="flex items-center gap-2 mb-2">
                      {getSeverityBadge(severity)}
                      <span className="text-xs text-muted-foreground">{issues.length} issue(s)</span>
                    </div>
                    {issues.map((issue, idx) => (
                      <div key={idx} className="p-3 border rounded-lg mb-2">
                        <div className="flex items-start gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">{issue.category}</Badge>
                          {issue.affectedSteps && issue.affectedSteps.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              Steps: {issue.affectedSteps.map(s => s.replace('step-', '')).join(', ')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm mb-1">{issue.description}</p>
                        <p className="text-xs text-muted-foreground italic">Suggestion: {issue.suggestion}</p>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Follow-Up Questions */}
      {critique.followUpQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Follow-Up Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {critique.followUpQuestions.map((question) => (
              <div key={question.id} className="space-y-2">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="text-xs">{question.category}</Badge>
                  <Badge variant="secondary" className="text-xs">{question.priority}</Badge>
                </div>
                <p className="text-sm font-medium">{question.question}</p>
                {!question.userAnswer ? (
                  <Textarea
                    placeholder="Your answer..."
                    value={userFeedback.find(f => f.questionId === question.id)?.answer || ''}
                    onChange={(e) => updateFeedback(question.id, e.target.value)}
                    rows={3}
                    className="text-sm"
                  />
                ) : (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Your answer:</p>
                    <p className="text-sm">{question.userAnswer}</p>
                  </div>
                )}
              </div>
            ))}
            {critique.followUpQuestions.some(q => !q.userAnswer) && (
              <Button
                onClick={onSubmitFeedback}
                disabled={submittingFeedback || userFeedback.length === 0}
                className="w-full gap-2"
              >
                {submittingFeedback ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Regenerating Critique...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4" />
                    Submit Feedback
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Strengths */}
      {critique.strengths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {critique.strengths.map((strength, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Suggestions */}
      {critique.suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {critique.suggestions.map((suggestion, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function CriticAgentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-6"><div className="max-w-6xl mx-auto">Loading...</div></div>}>
      <CriticAgentContent />
    </Suspense>
  )
}


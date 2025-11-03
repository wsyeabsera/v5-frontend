'use client'

import { useState, useEffect, Suspense } from 'react'
import { PlannerAgentOutput, AgentConfig, RequestContext } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { PipelineBanner } from '@/components/agents/PipelineBanner'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { getRequestsWithThoughtAgent } from '@/lib/api/requests-api'
import { useStore } from '@/lib/store'
import { useAgentConfigs, useModels } from '@/lib/queries'
import { Loader2, Settings, Check, Target, ListChecks, AlertCircle, FileText, Clock, ArrowRight, History, ChevronDown, Inbox } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function PlannerAgentContent() {
  const searchParams = useSearchParams()
  const urlRequestId = searchParams.get('requestId')
  
  const [requests, setRequests] = useState<(RequestContext & { plannerOutputExists: boolean })[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PlannerAgentOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [configOpen, setConfigOpen] = useState(false)
  
  const { data: agentConfigsData } = useAgentConfigs()
  const { data: modelsData } = useModels()

  // Filter enabled agent configs
  const enabledConfigs = (agentConfigsData || []).filter((config: AgentConfig) => config.enabled)
  
  // Default to planner-agent if it exists
  useEffect(() => {
    if (!selectedAgentId && enabledConfigs.length > 0) {
      const plannerAgent = enabledConfigs.find((c: AgentConfig) => c.agentId === 'planner-agent')
      if (plannerAgent) {
        setSelectedAgentId('planner-agent')
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
      const data = await getRequestsWithThoughtAgent()
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
    const saved = localStorage.getItem('planner-agent-config-open')
    if (saved !== null) {
      setConfigOpen(JSON.parse(saved))
    }
  }, [])

  // Save config open state to localStorage
  useEffect(() => {
    localStorage.setItem('planner-agent-config-open', JSON.stringify(configOpen))
  }, [configOpen])

  const handleRequestSelect = async (request: RequestContext & { plannerOutputExists: boolean }) => {
    if (!selectedAgentId || !selectedConfig) {
      setError('Please select an agent configuration')
      return
    }

    setSelectedRequestId(request.requestId)
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // First, get the thought output for this request
      const thoughtResponse = await fetch(`/api/agents/thought-agent?requestId=${request.requestId}`)
      if (!thoughtResponse.ok) {
        throw new Error('Failed to fetch thought output for this request')
      }
      const thoughtData = await thoughtResponse.json()
      
      if (!thoughtData.thoughts || thoughtData.thoughts.length === 0) {
        throw new Error('No thoughts found for this request. Please generate thoughts first.')
      }

      // Now generate plan from thoughts
      const response = await fetch('/api/agents/planner-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          thoughts: thoughtData.thoughts,
          userQuery: request.userQuery || '',
          requestContext: request,
          agentId: selectedAgentId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate plan')
      }

      const data = await response.json()
      setResult(data)
      
      // Update the request's planner output status
      setRequests(prev => prev.map(r => 
        r.requestId === request.requestId 
          ? { ...r, plannerOutputExists: true }
          : r
      ))
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Breadcrumbs items={[
          { label: 'Agent Pipeline', href: '/agents/pipeline' },
          { label: 'Planner Agent' },
        ]} />
        <PipelineBanner currentAgent="planner-agent" />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Planner Agent</h1>
            <p className="text-[13px] text-muted-foreground">
              Convert reasoning thoughts into structured, executable action plans
            </p>
          </div>
          <Link href="/agents/planner-agent/history">
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
                        Choose which agent configuration to use for plan generation. The selected config's model and parameters will be used for LLM calls.
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
                  <Target className="w-5 h-5" />
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
                    No requests found with thought-agent in the agent chain.
                    <br />
                    <span className="text-xs mt-1">Generate some thoughts in the Thought Agent first.</span>
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
                              {request.plannerOutputExists && (
                                <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900">
                                  <Check className="w-3 h-3 mr-1" />
                                  Has Plan
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
                    <span className="ml-2 text-sm text-muted-foreground">Generating plan...</span>
                  </div>
                </CardContent>
              </Card>
            ) : result ? (
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
                  <span className="text-muted-foreground">Agent Chain:</span>
                  <span className="ml-2">{result.requestContext.agentChain.join(' → ')}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Based on Thoughts:</span>
                  <span className="ml-2">{result.basedOnThoughts.length} thought(s)</span>
                </div>
              </CardContent>
            </Card>

            {/* Plan Goal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Plan Goal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {result.plan.goal}
                    </ReactMarkdown>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Confidence</span>
                      <span className="text-sm font-semibold">
                        {(result.plan.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${result.plan.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Complexity</span>
                      <span className="text-sm font-semibold">
                        {(result.plan.estimatedComplexity * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${result.plan.estimatedComplexity * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Plan Steps */}
            {result.plan.steps && result.plan.steps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ListChecks className="w-5 h-5" />
                    Plan Steps ({result.plan.steps.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.plan.steps.map((step) => (
                      <div key={step.id} className="border-l-4 border-primary pl-4 py-2">
                        <div className="flex items-start gap-3 mb-2">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm">
                            {step.order}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">{step.description}</span>
                              <Badge variant="secondary" className="text-xs">
                                {step.action}
                              </Badge>
                            </div>
                            {step.parameters && Object.keys(step.parameters).length > 0 && (
                              <div className="mt-2 p-2 bg-muted rounded text-xs font-mono">
                                {JSON.stringify(step.parameters, null, 2)}
                              </div>
                            )}
                            <div className="mt-2 text-xs text-muted-foreground">
                              <span className="font-medium">Expected:</span> {step.expectedOutcome}
                            </div>
                            {step.dependencies && step.dependencies.length > 0 && (
                              <div className="mt-2 flex items-center gap-2 text-xs">
                                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                <span className="text-muted-foreground">Depends on:</span>
                                <div className="flex gap-1">
                                  {step.dependencies.map((dep) => {
                                    const depNum = dep.replace('step-', '')
                                    return (
                                      <Badge key={dep} variant="outline" className="text-xs">
                                        Step {depNum}
                                      </Badge>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                            <div className="mt-2">
                              <Badge 
                                variant={step.status === 'completed' ? 'default' : 'outline'}
                                className="text-xs"
                              >
                                {step.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Rationale */}
            {result.rationale && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Rationale
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {result.rationale}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Inbox className="w-12 h-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground mb-1">No Results Yet</p>
                    <p className="text-xs text-muted-foreground">Select a request to generate action plan results</p>
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

export default function PlannerAgentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-6"><div className="max-w-6xl mx-auto">Loading...</div></div>}>
      <PlannerAgentContent />
    </Suspense>
  )
}


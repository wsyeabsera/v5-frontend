'use client'

import { useState, useEffect } from 'react'
import { ThoughtAgentOutput, AgentConfig, RequestContext } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { getRequestsWithComplexityDetector } from '@/lib/api/requests-api'
import { useStore } from '@/lib/store'
import { useAgentConfigs, useModels } from '@/lib/queries'
import { Sparkles, Loader2, Settings, Check, Brain, Target, AlertCircle, Wrench, Lightbulb, Clock } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function ThoughtAgentPage() {
  const [requests, setRequests] = useState<(RequestContext & { thoughtOutputExists: boolean })[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ThoughtAgentOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  
  const { data: agentConfigsData } = useAgentConfigs()
  const { data: modelsData } = useModels()

  // Filter enabled agent configs
  const enabledConfigs = (agentConfigsData || []).filter((config: AgentConfig) => config.enabled)
  
  // Default to thought-agent if it exists
  useEffect(() => {
    if (!selectedAgentId && enabledConfigs.length > 0) {
      const thoughtAgent = enabledConfigs.find((c: AgentConfig) => c.agentId === 'thought-agent')
      if (thoughtAgent) {
        setSelectedAgentId('thought-agent')
      } else {
        setSelectedAgentId(enabledConfigs[0].agentId)
      }
    }
  }, [agentConfigsData, selectedAgentId, enabledConfigs.length])

  // Load requests on mount
  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    setLoadingRequests(true)
    setError(null)
    try {
      const data = await getRequestsWithComplexityDetector()
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

  const handleRequestSelect = async (request: RequestContext & { thoughtOutputExists: boolean }) => {
    if (!selectedAgentId || !selectedConfig) {
      setError('Please select an agent configuration')
      return
    }

    setSelectedRequestId(request.requestId)
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/agents/thought-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userQuery: request.userQuery || '',
          requestContext: request,
          agentId: selectedAgentId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate thoughts')
      }

      const data = await response.json()
      setResult(data)
      
      // Update the request's thought output status
      setRequests(prev => prev.map(r => 
        r.requestId === request.requestId 
          ? { ...r, thoughtOutputExists: true }
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
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Thought Agent</h1>
          <p className="text-[13px] text-muted-foreground">
            Generate deep reasoning thoughts and explore multiple solution approaches
          </p>
        </div>

        {/* Agent Config Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Agent Configuration
            </CardTitle>
          </CardHeader>
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
                Choose which agent configuration to use for thought generation. The selected config's model and parameters will be used for LLM calls.
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
        </Card>

        {/* Requests List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
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
                No requests found with complexity-detector in the agent chain.
                <br />
                <span className="text-xs mt-1">Generate some requests in the Complexity Detector first.</span>
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
                          {request.thoughtOutputExists && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900">
                              <Check className="w-3 h-3 mr-1" />
                              Has Thoughts
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

        {/* Results Display */}
        {result && (
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
                {result.complexityScore !== undefined && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Complexity Score:</span>
                    <span className="ml-2">{(result.complexityScore * 100).toFixed(0)}%</span>
                  </div>
                )}
                {result.reasoningPass !== undefined && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Reasoning Pass:</span>
                    <span className="ml-2">{result.reasoningPass} / {result.totalPasses || 1}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Primary Thought */}
            {result.thoughts && result.thoughts.length > 0 && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="w-5 h-5" />
                      Reasoning
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {result.thoughts[0].reasoning}
                        </ReactMarkdown>
                      </div>
                    </div>
                    {result.thoughts[0].confidence !== undefined && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">Confidence</span>
                          <span className="text-sm font-semibold">
                            {(result.thoughts[0].confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${result.thoughts[0].confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Approaches */}
                {result.thoughts[0].approaches && result.thoughts[0].approaches.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        Approaches
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {result.thoughts[0].approaches.map((approach, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Badge variant="outline" className="mt-0.5">{i + 1}</Badge>
                            <div className="flex-1 prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {approach}
                              </ReactMarkdown>
                            </div>
                          </li>
                        ))}
                      </ul>
                      {result.primaryApproach && (
                        <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                          <p className="text-xs text-muted-foreground mb-1">Primary Approach:</p>
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {result.primaryApproach}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Constraints & Assumptions */}
                {(result.thoughts[0].constraints?.length > 0 || result.thoughts[0].assumptions?.length > 0) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Constraints & Assumptions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {result.thoughts[0].constraints && result.thoughts[0].constraints.length > 0 && (
                          <div>
                            <h3 className="font-medium mb-2 text-sm flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" />
                              Constraints
                            </h3>
                            <ul className="text-sm space-y-1">
                              {result.thoughts[0].constraints.map((c, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-muted-foreground">•</span>
                                  <div className="prose prose-sm dark:prose-invert max-w-none flex-1">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                      {c}
                                    </ReactMarkdown>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {result.thoughts[0].assumptions && result.thoughts[0].assumptions.length > 0 && (
                          <div>
                            <h3 className="font-medium mb-2 text-sm flex items-center gap-2">
                              <Lightbulb className="w-4 h-4" />
                              Assumptions
                            </h3>
                            <ul className="text-sm space-y-1">
                              {result.thoughts[0].assumptions.map((a, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-muted-foreground">•</span>
                                  <div className="prose prose-sm dark:prose-invert max-w-none flex-1">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                      {a}
                                    </ReactMarkdown>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Uncertainties */}
                {result.thoughts[0].uncertainties && result.thoughts[0].uncertainties.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Uncertainties</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm">
                        {result.thoughts[0].uncertainties.map((u, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-muted-foreground">•</span>
                            <div className="prose prose-sm dark:prose-invert max-w-none flex-1">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {u}
                              </ReactMarkdown>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Key Insights */}
            {result.keyInsights && result.keyInsights.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5" />
                    Key Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.keyInsights.map((insight, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">•</Badge>
                        <div className="prose prose-sm dark:prose-invert max-w-none flex-1">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {insight}
                          </ReactMarkdown>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Recommended Tools */}
            {result.recommendedTools && result.recommendedTools.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="w-5 h-5" />
                    Recommended Tools
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.recommendedTools.map((tool, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

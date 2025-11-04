'use client'

import { useState, useEffect } from 'react'
import { ComplexityDetectorOutput, AgentConfig } from '@/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { PipelineBanner } from '@/components/agents/PipelineBanner'
import { ComplexityResult } from '@/components/complexity/ComplexityResult'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { getAllRequests } from '@/lib/api/requests-api'
import { useStore } from '@/lib/store'
import { useAgentConfigs, useModels } from '@/lib/queries'
import { Sparkles, Loader2, History, Settings, Check, ChevronDown, Inbox, Clock, Plus } from 'lucide-react'
import Link from 'next/link'
import { RequestContext } from '@/types'

export default function ComplexityDetectorPage() {
  const [requests, setRequests] = useState<RequestContext[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [userQuery, setUserQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ComplexityDetectorOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [showNewQuery, setShowNewQuery] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [configOpen, setConfigOpen] = useState(false)
  
  const { data: agentConfigsData } = useAgentConfigs()
  const { data: modelsData } = useModels()

  // Filter enabled agent configs
  const enabledConfigs = (agentConfigsData || []).filter((config: AgentConfig) => config.enabled)
  
  // Default to complexity-detector if it exists
  useEffect(() => {
    if (!selectedAgentId && enabledConfigs.length > 0) {
      const complexityDetector = enabledConfigs.find((c: AgentConfig) => c.agentId === 'complexity-detector')
      if (complexityDetector) {
        setSelectedAgentId('complexity-detector')
      } else {
        setSelectedAgentId(enabledConfigs[0].agentId)
      }
    }
  }, [agentConfigsData, selectedAgentId, enabledConfigs.length])

  // Get selected config
  const selectedConfig = enabledConfigs.find((c: AgentConfig) => c.agentId === selectedAgentId)
  
  // Get model info for selected config
  const models = modelsData?.models || []
  const selectedModel = selectedConfig?.modelId 
    ? models.find((m: any) => m.id === selectedConfig.modelId)
    : null

  // Get model test results for badge display (we still need this from store)
  const { modelTestResults } = useStore()

  // Load config open state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('complexity-detector-config-open')
    if (saved !== null) {
      setConfigOpen(JSON.parse(saved))
    }
  }, [])

  // Save config open state to localStorage
  useEffect(() => {
    localStorage.setItem('complexity-detector-config-open', JSON.stringify(configOpen))
  }, [configOpen])

  // Load requests on mount
  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    setLoadingRequests(true)
    setError(null)
    try {
      const data = await getAllRequests()
      setRequests(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load requests')
    } finally {
      setLoadingRequests(false)
    }
  }

  const handleRequestSelect = async (request: RequestContext) => {
    if (!selectedAgentId || !selectedConfig) {
      setError('Please select an agent configuration')
      return
    }

    setSelectedRequestId(request.requestId)
    setShowNewQuery(false)
    setUserQuery(request.userQuery || '')
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/agents/complexity-detector', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userQuery: request.userQuery || '',
          requestId: request.requestId,
          agentId: selectedAgentId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to detect complexity')
      }

      const data = await response.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleNewQuery = () => {
    setSelectedRequestId(null)
    setShowNewQuery(true)
    setUserQuery('')
    setResult(null)
    setError(null)
  }

  const handleDetectNewQuery = async () => {
    if (!userQuery.trim()) {
      setError('Please enter a query')
      return
    }

    if (!selectedAgentId || !selectedConfig) {
      setError('Please select an agent configuration')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/agents/complexity-detector', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userQuery: userQuery,
          agentId: selectedAgentId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to detect complexity')
      }

      const data = await response.json()
      setResult(data)
      // Refresh requests list to show the new request
      await loadRequests()
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
          { label: 'Complexity Detector' },
        ]} />
        <PipelineBanner currentAgent="complexity-detector" />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Complexity Detector</h1>
            <p className="text-[13px] text-muted-foreground">
              Analyze query complexity using semantic matching with Ollama embeddings
            </p>
          </div>
          <Link href="/agents/complexity-detector/history">
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
                        Choose which agent configuration to use for complexity detection. The selected config's model and parameters will be used for LLM calls.
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
                  <Sparkles className="w-5 h-5" />
                  Select a Request
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Button
                    onClick={handleNewQuery}
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    disabled={loading}
                  >
                    <Plus className="w-4 h-4" />
                    Create New Query
                  </Button>
                </div>

                {showNewQuery ? (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-2">
                      <label htmlFor="newUserQuery" className="text-sm font-medium">User Query</label>
                      <Textarea
                        id="newUserQuery"
                        value={userQuery}
                        onChange={(e) => setUserQuery(e.target.value)}
                        placeholder="Enter a user query to analyze..."
                        rows={4}
                        disabled={loading}
                      />
                    </div>
                    <Button
                      onClick={handleDetectNewQuery}
                      disabled={loading || !userQuery.trim() || !selectedAgentId || !selectedConfig}
                      className="w-full gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Detect Complexity
                        </>
                      )}
                    </Button>
                  </div>
                ) : loadingRequests ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading requests...</span>
                  </div>
                ) : requests.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No requests found.
                    <br />
                    <span className="text-xs mt-1">Create a new query to get started.</span>
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
                              {request.agentChain && request.agentChain.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <span>Chain:</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {request.agentChain.join(' → ')}
                                  </Badge>
                                </div>
                              )}
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
                    <span className="ml-2 text-sm text-muted-foreground">Analyzing...</span>
                  </div>
                </CardContent>
              </Card>
            ) : result ? (
              <ComplexityResult result={result} />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Inbox className="w-12 h-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground mb-1">No Results Yet</p>
                    <p className="text-xs text-muted-foreground">Submit a query to see complexity analysis results</p>
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


'use client'

import { useState, useEffect, Suspense } from 'react'
import { MetaAgentOutput, AgentConfig, RequestContext } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { PipelineBanner } from '@/components/agents/PipelineBanner'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { getRequestsWithConfidenceScorer } from '@/lib/api/requests-api'
import { useStore } from '@/lib/store'
import { useAgentConfigs, useModels } from '@/lib/queries'
import { Loader2, Settings, Check, Eye, Clock, History, ChevronDown, Inbox, AlertTriangle, CheckCircle, RotateCcw, Brain, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Progress } from '@/components/ui/progress'

function MetaAgentContent() {
  const searchParams = useSearchParams()
  const urlRequestId = searchParams.get('requestId')
  
  const [requests, setRequests] = useState<(RequestContext & { metaOutputExists: boolean })[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MetaAgentOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [configOpen, setConfigOpen] = useState(false)
  
  const { data: agentConfigsData } = useAgentConfigs()
  const { data: modelsData } = useModels()

  // Filter enabled agent configs
  const enabledConfigs = (agentConfigsData || []).filter((config: AgentConfig) => config.enabled)
  
  // Default to meta-agent if it exists
  useEffect(() => {
    if (!selectedAgentId && enabledConfigs.length > 0) {
      const metaAgent = enabledConfigs.find((c: AgentConfig) => c.agentId === 'meta-agent')
      if (metaAgent) {
        setSelectedAgentId('meta-agent')
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
      const data = await getRequestsWithConfidenceScorer()
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
    const saved = localStorage.getItem('meta-agent-config-open')
    if (saved !== null) {
      setConfigOpen(JSON.parse(saved))
    }
  }, [])

  // Save config open state to localStorage
  useEffect(() => {
    localStorage.setItem('meta-agent-config-open', JSON.stringify(configOpen))
  }, [configOpen])

  const handleRequestSelect = async (request: RequestContext & { metaOutputExists: boolean }) => {
    setSelectedRequestId(request.requestId)
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Try to fetch existing meta output first
      const existingResponse = await fetch(`/api/agents/meta-agent?requestId=${request.requestId}`)
      if (existingResponse.ok) {
        const existingData = await existingResponse.json()
        setResult(existingData)
        setLoading(false)
        return
      }

      // If no existing output, we need context from other agents
      // For now, create a minimal context for testing
      // In production, this would be gathered from thought-agent, planner-agent, critic-agent, confidence-scorer outputs
      const context = {
        confidenceScore: {
          requestId: request.requestId,
          agentName: 'confidence-scorer',
          timestamp: new Date().toISOString(),
          requestContext: {
            ...request,
            agentChain: [...request.agentChain, 'confidence-scorer'],
            status: 'completed' as const,
          },
          overallConfidence: 0.7,
          agentScores: [
            {
              agentName: 'thought-agent',
              score: 0.75,
              reasoning: 'Moderate confidence in reasoning',
              timestamp: new Date(),
            },
          ],
          decision: 'review' as const,
          thresholdUsed: {
            execute: 0.8,
            review: 0.6,
            rethink: 0.4,
            escalate: 0.2,
          },
          reasoning: 'Overall confidence assessment',
        },
      }

      // Assess reasoning
      const response = await fetch('/api/agents/meta-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context,
          requestContext: request,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to assess reasoning')
      }

      const data = await response.json()
      setResult(data)
      
      // Update the request's meta output status
      setRequests(prev => prev.map(r => 
        r.requestId === request.requestId 
          ? { ...r, metaOutputExists: true }
          : r
      ))
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getQualityColor = (quality: number) => {
    if (quality >= 0.8) {
      return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900'
    } else if (quality >= 0.6) {
      return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900'
    } else if (quality >= 0.4) {
      return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900'
    } else {
      return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900'
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Breadcrumbs items={[
          { label: 'Agent Pipeline', href: '/agents/pipeline' },
          { label: 'Meta Agent' },
        ]} />
        <PipelineBanner currentAgent="meta-agent" />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Meta Agent</h1>
            <p className="text-[13px] text-muted-foreground">
              Self-awareness layer that questions reasoning quality and manages dynamic reasoning depth
            </p>
          </div>
          <Link href="/agents/meta-agent/history">
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
                  <Eye className="w-5 h-5" />
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
                              {request.metaOutputExists && (
                                <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900">
                                  <Check className="w-3 h-3 mr-1" />
                                  Assessed
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
                    <span className="ml-2 text-sm text-muted-foreground">Assessing reasoning quality...</span>
                  </div>
                </CardContent>
              </Card>
            ) : result ? (
              <>
                {/* Reasoning Quality Score */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="w-5 h-5" />
                      Reasoning Quality
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Quality Score</span>
                        <span className="text-2xl font-bold">
                          {(result.reasoningQuality * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={result.reasoningQuality * 100} className="h-3" />
                    </div>
                    {result.reasoningQualityBreakdown && (
                      <div className="space-y-2 pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Quality Breakdown:</p>
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span>Logic</span>
                              <span className="font-mono">{(result.reasoningQualityBreakdown.logic * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={result.reasoningQualityBreakdown.logic * 100} className="h-1.5" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span>Completeness</span>
                              <span className="font-mono">{(result.reasoningQualityBreakdown.completeness * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={result.reasoningQualityBreakdown.completeness * 100} className="h-1.5" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span>Alignment</span>
                              <span className="font-mono">{(result.reasoningQualityBreakdown.alignment * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={result.reasoningQualityBreakdown.alignment * 100} className="h-1.5" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={getQualityColor(result.reasoningQuality)}>
                        Quality: {(result.reasoningQuality * 100).toFixed(0)}%
                      </Badge>
                      {result.shouldReplan && (
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900">
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Replan Needed
                        </Badge>
                      )}
                      {result.shouldDeepenReasoning && (
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900">
                          <Brain className="w-3 h-3 mr-1" />
                          Deepen Reasoning
                        </Badge>
                      )}
                      {result.reasoningDepthRecommendation && (
                        <Badge variant="outline" className="text-xs">
                          {result.reasoningDepthRecommendation} Pass{result.reasoningDepthRecommendation > 1 ? 'es' : ''} Recommended
                        </Badge>
                      )}
                      {!result.shouldReplan && !result.shouldDeepenReasoning && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Quality Acceptable
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Assessment */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Comprehensive Assessment
                      {result.reasoningQualityBreakdown && (
                        <Badge variant="outline" className="ml-auto text-xs">
                          {((result.reasoningQualityBreakdown.logic + result.reasoningQualityBreakdown.completeness + result.reasoningQualityBreakdown.alignment) / 3 * 100).toFixed(0)}% avg
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {result.assessment}
                    </p>
                    {result.patternAnalysis?.inconsistencies && result.patternAnalysis.inconsistencies.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-2">
                          Key Issues Detected:
                        </p>
                        <ul className="space-y-1">
                          {result.patternAnalysis.inconsistencies.slice(0, 3).map((inc, idx) => (
                            <li key={idx} className="text-xs text-muted-foreground">
                              • {inc}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Replan Strategy */}
                {result.replanStrategy && (
                  <Card className="border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-950/20">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <RotateCcw className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        Replan Strategy
                        {result.shouldReplan && (
                          <Badge variant="outline" className="ml-auto text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300">
                            Action Required
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {result.replanStrategy?.split('.').map((sentence, idx) => {
                          if (!sentence.trim()) return null;
                          // Highlight step IDs, tool names, and placeholders
                          const parts = sentence.split(/(step-\d+|EXTRACT_FROM[^.,\s]+|get_facility|list_contaminants|generate_intelligent_facility_report|critique issue \d+)/gi);
                          const strategyParts = result.replanStrategy?.split('.') || [];
                          return (
                            <span key={idx}>
                              {parts.map((part, pIdx) => {
                                const isHighlight = /^(step-\d+|EXTRACT_FROM|get_facility|list_contaminants|generate_intelligent_facility_report|critique issue \d+)$/i.test(part.trim());
                                return isHighlight ? (
                                  <code key={pIdx} className="px-1 py-0.5 rounded bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 text-xs font-mono">
                                    {part}
                                  </code>
                                ) : (
                                  <span key={pIdx}>{part}</span>
                                );
                              })}
                              {idx < strategyParts.length - 2 && '. '}
                            </span>
                          );
                        })}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Focus Areas */}
                {result.focusAreas && result.focusAreas.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        Focus Areas
                        {result.reasoningDepthRecommendation && (
                          <Badge variant="outline" className="ml-auto text-xs">
                            {result.reasoningDepthRecommendation} pass{result.reasoningDepthRecommendation > 1 ? 'es' : ''} needed
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {result.focusAreas.map((area, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <Badge variant="outline" className="mt-0.5 text-xs px-1.5 py-0">{index + 1}</Badge>
                            <span className="text-muted-foreground">{area}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Orchestrator Directives */}
                {result.orchestratorDirectives && result.orchestratorDirectives.length > 0 && (
                  <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        Orchestrator Directives
                        <Badge variant="outline" className="ml-auto text-xs bg-blue-100 dark:bg-blue-900">
                          {result.orchestratorDirectives.length} directive{result.orchestratorDirectives.length > 1 ? 's' : ''}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {result.orchestratorDirectives.map((directive, index) => {
                          // Highlight specific references (step IDs, tools, placeholders)
                          const parts = directive.split(/(step-\d+|EXTRACT_FROM[^.,\s]+|get_facility|list_contaminants|generate_intelligent_facility_report|critique issue \d+)/gi);
                          return (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <span className="text-blue-600 dark:text-blue-400 mt-0.5 font-bold">→</span>
                              <span className="text-muted-foreground leading-relaxed">
                                {parts.map((part, pIdx) => {
                                  const isHighlight = /^(step-\d+|EXTRACT_FROM|get_facility|list_contaminants|generate_intelligent_facility_report|critique issue \d+)$/i.test(part.trim());
                                  return isHighlight ? (
                                    <code key={pIdx} className="px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-mono">
                                      {part}
                                    </code>
                                  ) : (
                                    <span key={pIdx}>{part}</span>
                                  );
                                })}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Pattern Analysis */}
                {result.patternAnalysis && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Pattern Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {result.patternAnalysis.detectedPatterns && result.patternAnalysis.detectedPatterns.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">Detected Patterns:</p>
                          <ul className="space-y-1">
                            {result.patternAnalysis.detectedPatterns.map((pattern, idx) => (
                              <li key={idx} className="text-xs text-green-600 dark:text-green-400">
                                ✓ {pattern}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {result.patternAnalysis.inconsistencies && result.patternAnalysis.inconsistencies.length > 0 && (
                        <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
                          <p className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-2 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Inconsistencies ({result.patternAnalysis.inconsistencies.length}):
                          </p>
                          <ul className="space-y-1.5">
                            {result.patternAnalysis.inconsistencies.map((inconsistency, idx) => (
                              <li key={idx} className="text-xs text-orange-700 dark:text-orange-300">
                                ⚠ {inconsistency}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {result.patternAnalysis.strengths && result.patternAnalysis.strengths.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">Strengths:</p>
                          <ul className="space-y-1">
                            {result.patternAnalysis.strengths.map((strength, idx) => (
                              <li key={idx} className="text-xs text-green-600 dark:text-green-400">
                                + {strength}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {result.patternAnalysis.weaknesses && result.patternAnalysis.weaknesses.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">Weaknesses:</p>
                          <ul className="space-y-1">
                            {result.patternAnalysis.weaknesses.map((weakness, idx) => (
                              <li key={idx} className="text-xs text-red-600 dark:text-red-400">
                                - {weakness}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Recommended Actions */}
                {result.recommendedActions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Recommended Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {result.recommendedActions.map((action, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <span className="text-muted-foreground mt-0.5">•</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Decision Flags */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Decision Flags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Should Replan:</span>
                        <Badge variant={result.shouldReplan ? 'destructive' : 'outline'}>
                          {result.shouldReplan ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Should Deepen Reasoning:</span>
                        <Badge variant={result.shouldDeepenReasoning ? 'destructive' : 'outline'}>
                          {result.shouldDeepenReasoning ? 'Yes' : 'No'}
                        </Badge>
                      </div>
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
                    <p className="text-xs text-muted-foreground">Select a request to assess reasoning quality</p>
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

export default function MetaAgentPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    }>
      <MetaAgentContent />
    </Suspense>
  )
}


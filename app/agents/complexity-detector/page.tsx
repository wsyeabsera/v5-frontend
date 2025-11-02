'use client'

import { useState, useEffect } from 'react'
import { ComplexityDetectorOutput, AgentConfig } from '@/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ComplexityResult } from '@/components/complexity/ComplexityResult'
import { getRequest } from '@/lib/api/requests-api'
import { useStore } from '@/lib/store'
import { useAgentConfigs, useModels } from '@/lib/queries'
import { Sparkles, Loader2, History, Settings, Check } from 'lucide-react'
import Link from 'next/link'

export default function ComplexityDetectorPage() {
  const [userQuery, setUserQuery] = useState('')
  const [requestId, setRequestId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ComplexityDetectorOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [useRequestId, setUseRequestId] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  
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

  const handleDetect = async () => {
    if (!userQuery.trim() && !requestId.trim()) {
      setError('Please enter a query or request ID')
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
      // Backend handles all API key resolution, just send agentId
      const response = await fetch('/api/agents/complexity-detector', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userQuery: useRequestId ? undefined : userQuery,
          requestId: useRequestId ? requestId : undefined,
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

  const loadFromRequestId = async () => {
    if (!requestId.trim()) return

    try {
      const request = await getRequest(requestId)
      if (request && request.userQuery) {
        setUserQuery(request.userQuery)
        setUseRequestId(false)
      } else {
        setError(`Request ${requestId} not found or has no user query`)
      }
    } catch (err: any) {
      setError(`Failed to load request: ${err.message}`)
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-1">Complexity Detector Agent</h1>
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
              <Label htmlFor="agentConfig">Select Agent Configuration</Label>
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
        </Card>

        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Input</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useRequestId"
                checked={useRequestId}
                onChange={(e) => setUseRequestId(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="useRequestId" className="cursor-pointer">
                Use Request ID
              </Label>
            </div>

            {useRequestId ? (
              <div className="space-y-2">
                <Label htmlFor="requestId">Request ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="requestId"
                    value={requestId}
                    onChange={(e) => setRequestId(e.target.value)}
                    placeholder="Enter request ID..."
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={loadFromRequestId}
                    disabled={loading}
                  >
                    Load
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="userQuery">User Query</Label>
                <Textarea
                  id="userQuery"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Enter a user query to analyze..."
                  rows={4}
                  disabled={loading}
                />
              </div>
            )}

            <Button
              onClick={handleDetect}
              disabled={loading || (!userQuery.trim() && !requestId.trim()) || !selectedAgentId || !selectedConfig}
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
        {result && <ComplexityResult result={result} />}
      </div>
    </div>
  )
}


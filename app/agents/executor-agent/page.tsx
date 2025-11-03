'use client'

import { useState, useEffect, Suspense } from 'react'
import { ExecutorAgentOutput, AgentConfig, RequestContext, Plan, CriticAgentOutput } from '@/types'
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
import { Loader2, Settings, Check, Play, Clock, History, ChevronDown, Inbox, AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ExecutePlanModal } from './components/ExecutePlanModal'
import { PlaygroundLayout } from './components/PlaygroundLayout'
import { PlanTreeView } from './components/PlanTreeView'
import { LiveExecutionMonitor } from './components/LiveExecutionMonitor'
import { LLMReasoningPanel } from './components/LLMReasoningPanel'
import { ExecutionLogViewer } from './components/ExecutionLogViewer'

function ExecutorAgentContent() {
  const searchParams = useSearchParams()
  const urlRequestId = searchParams.get('requestId')
  
  const [requests, setRequests] = useState<(RequestContext & { executionOutputExists?: boolean })[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ExecutorAgentOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [configOpen, setConfigOpen] = useState(false)
  const [userFeedback, setUserFeedback] = useState<{ questionId: string; answer: string }[]>([])
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [executionVersions, setExecutionVersions] = useState<ExecutorAgentOutput[]>([])
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [executeModalOpen, setExecuteModalOpen] = useState(false)
  const [critique, setCritique] = useState<CriticAgentOutput | null>(null)
  
  const { data: agentConfigsData } = useAgentConfigs()
  const { data: modelsData } = useModels()

  // Filter enabled agent configs
  const enabledConfigs = (agentConfigsData || []).filter((config: AgentConfig) => config.enabled)
  
  // Default to executor-agent if it exists
  useEffect(() => {
    if (!selectedAgentId && enabledConfigs.length > 0) {
      const executorAgent = enabledConfigs.find((c: AgentConfig) => c.agentId === 'executor-agent')
      if (executorAgent) {
        setSelectedAgentId('executor-agent')
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
      // Check which requests have execution outputs (for UI badges only)
      const requestsWithExecution = await Promise.all(
        data.map(async (req) => {
          try {
            const response = await fetch(`/api/agents/executor-agent?requestId=${req.requestId}`)
            return {
              ...req,
              executionOutputExists: response.ok,
            }
          } catch {
            return { ...req, executionOutputExists: false }
          }
        })
      )
      setRequests(requestsWithExecution)
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
    const saved = localStorage.getItem('executor-agent-config-open')
    if (saved !== null) {
      setConfigOpen(JSON.parse(saved))
    }
  }, [])

  // Save config open state to localStorage
  useEffect(() => {
    localStorage.setItem('executor-agent-config-open', JSON.stringify(configOpen))
  }, [configOpen])

  const fetchVersionHistory = async (requestId: string) => {
    try {
      const response = await fetch(`/api/agents/executor-agent/versions/${requestId}`)
      if (response.ok) {
        const versions = await response.json()
        setExecutionVersions(versions)
      }
    } catch (err) {
      console.error('Failed to fetch version history:', err)
    }
  }

  const handleRequestSelect = async (request: RequestContext & { executionOutputExists?: boolean }) => {
    setSelectedRequestId(request.requestId)
    setLoading(false)
    setError(null)
    setResult(null)
    setUserFeedback([])
    setSelectedPlan(null)
    setExecutionVersions([])

    // Always fetch plan preview (don't fetch existing executions)
    try {
      const plannerResponse = await fetch(`/api/agents/planner-agent/history/${request.requestId}`)
      if (plannerResponse.ok) {
        const plannerData = await plannerResponse.json()
        if (plannerData.plan) {
          setSelectedPlan(plannerData.plan)
          
          // Try to fetch critique if available
          try {
            const critiqueResponse = await fetch(`/api/agents/critic-agent?requestId=${request.requestId}`)
            if (critiqueResponse.ok) {
              const critiqueData = await critiqueResponse.json()
              setCritique(critiqueData)
            }
          } catch (err) {
            // Critique is optional, ignore errors
            console.debug('No critique available:', err)
          }
        } else {
          setError('No plan found for this request. Please generate a plan first.')
        }
      } else {
        setError('Failed to fetch plan for this request. Please ensure a plan has been generated.')
      }
    } catch (err: any) {
      console.error('Failed to fetch plan:', err)
      setError(err.message || 'Failed to load plan for this request')
    }
  }

  const handleExecute = async () => {
    if (!selectedRequestId || !selectedAgentId || !selectedConfig) {
      setError('Please select a request and agent configuration')
      return
    }

    setExecuteModalOpen(false)
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Get the planner output for this request
      const plannerResponse = await fetch(`/api/agents/planner-agent/history/${selectedRequestId}`)
      if (!plannerResponse.ok) {
        throw new Error('Failed to fetch planner output for this request')
      }
      const plannerData = await plannerResponse.json()
      
      if (!plannerData.plan) {
        throw new Error('No plan found for this request. Please generate a plan first.')
      }

      setSelectedPlan(plannerData.plan)

      // Execute the plan
      const response = await fetch('/api/agents/executor-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: plannerData.plan,
          userQuery: plannerData.requestContext?.userQuery || plannerData.plan.goal || 'No user query available',
          requestContext: plannerData.requestContext,
          agentId: selectedAgentId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to execute plan')
      }

      const data = await response.json()
      setResult(data)
      
      // Fetch version history
      fetchVersionHistory(selectedRequestId)
      
      // Update the request's execution output status
      setRequests(prev => prev.map(r => 
        r.requestId === selectedRequestId 
          ? { ...r, executionOutputExists: true }
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
      // Resume execution with user feedback
      const response = await fetch('/api/agents/executor-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestContext: result.requestContext,
          userQuery: result.requestContext.userQuery || 'No user query available',
          userFeedback,
          agentId: selectedAgentId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to resume execution')
      }

      const data = await response.json()
      setResult(data)
      setUserFeedback([])
      
      // Fetch updated version history
      fetchVersionHistory(result.requestId)
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
          { label: 'Executor Agent' },
        ]} />
        <PipelineBanner currentAgent="executor-agent" />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Executor Agent Playground</h1>
            <p className="text-[13px] text-muted-foreground">
              Interactive execution environment with real-time monitoring and LLM reasoning
            </p>
          </div>
          <Link href="/agents/executor-agent/history">
            <Button variant="outline" size="sm" className="gap-2">
              <History className="w-4 h-4" />
              View History
            </Button>
          </Link>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="pt-6">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Playground Layout */}
        <PlaygroundLayout
          leftPanel={
            <PlanTreeView
              plan={selectedPlan}
              executionResult={result}
              requests={requests}
              selectedRequestId={selectedRequestId}
              onRequestSelect={handleRequestSelect}
              agentConfigs={enabledConfigs}
              selectedAgentId={selectedAgentId}
              onAgentSelect={setSelectedAgentId}
              onExecute={() => setExecuteModalOpen(true)}
              loading={loading}
              critique={critique}
            />
          }
          centerPanel={
            <LiveExecutionMonitor
              plan={selectedPlan}
              executionResult={result}
              loading={loading}
            />
          }
          rightPanel={
            <LLMReasoningPanel
              plan={selectedPlan}
              executionResult={result}
              loading={loading}
            />
          }
          bottomPanel={
            <ExecutionLogViewer
              plan={selectedPlan}
              executionResult={result}
            />
          }
        />

        {/* Execute Plan Modal */}
        <ExecutePlanModal
          open={executeModalOpen}
          onOpenChange={setExecuteModalOpen}
          plan={selectedPlan}
          onConfirm={handleExecute}
          loading={loading}
          critique={critique || undefined}
        />
      </div>
    </div>
  )
}

export default function ExecutorAgentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <ExecutorAgentContent />
    </Suspense>
  )
}


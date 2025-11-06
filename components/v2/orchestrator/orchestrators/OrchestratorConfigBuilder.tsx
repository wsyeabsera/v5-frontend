'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useOrchestratorAgentConfigs } from '@/lib/queries-v2'
import { Loader2 } from 'lucide-react'

interface OrchestratorConfig {
  agentConfigs?: {
    thought?: string
    plan?: string
    execute?: string
    summary?: string
  }
  timeouts?: {
    thought?: number
    plan?: number
    execute?: number
    summary?: number
    polling?: number
  }
  errorHandling?: 'fail' | 'retry' | 'refine'
  maxRetries?: number
  enableMemory?: boolean
}

interface OrchestratorConfigBuilderProps {
  config: OrchestratorConfig | undefined
  onChange: (config: OrchestratorConfig) => void
}

export function OrchestratorConfigBuilder({
  config,
  onChange,
}: OrchestratorConfigBuilderProps) {
  const { data: agentConfigs, isLoading } = useOrchestratorAgentConfigs()

  const [agentConfigsState, setAgentConfigsState] = useState({
    thought: config?.agentConfigs?.thought || 'none',
    plan: config?.agentConfigs?.plan || 'none',
    execute: config?.agentConfigs?.execute || 'none',
    summary: config?.agentConfigs?.summary || 'none',
  })

  // Update state when config changes
  useEffect(() => {
    if (config?.agentConfigs) {
      setAgentConfigsState({
        thought: config.agentConfigs.thought || 'none',
        plan: config.agentConfigs.plan || 'none',
        execute: config.agentConfigs.execute || 'none',
        summary: config.agentConfigs.summary || 'none',
      })
    }
  }, [config])

  const [timeouts, setTimeouts] = useState({
    thought: config?.timeouts?.thought?.toString() || '60000',
    plan: config?.timeouts?.plan?.toString() || '60000',
    execute: config?.timeouts?.execute?.toString() || '300000',
    summary: config?.timeouts?.summary?.toString() || '60000',
    polling: config?.timeouts?.polling?.toString() || '2000',
  })

  const [errorHandling, setErrorHandling] = useState<'fail' | 'retry' | 'refine'>(
    config?.errorHandling || 'fail'
  )
  const [maxRetries, setMaxRetries] = useState(config?.maxRetries?.toString() || '0')
  const [enableMemory, setEnableMemory] = useState(config?.enableMemory || false)

  useEffect(() => {
    const newConfig: OrchestratorConfig = {
      agentConfigs: {
        thought: agentConfigsState.thought && agentConfigsState.thought !== 'none' ? agentConfigsState.thought : undefined,
        plan: agentConfigsState.plan && agentConfigsState.plan !== 'none' ? agentConfigsState.plan : undefined,
        execute: agentConfigsState.execute && agentConfigsState.execute !== 'none' ? agentConfigsState.execute : undefined,
        summary: agentConfigsState.summary && agentConfigsState.summary !== 'none' ? agentConfigsState.summary : undefined,
      },
      timeouts: {
        thought: parseInt(timeouts.thought, 10) || undefined,
        plan: parseInt(timeouts.plan, 10) || undefined,
        execute: parseInt(timeouts.execute, 10) || undefined,
        summary: parseInt(timeouts.summary, 10) || undefined,
        polling: parseInt(timeouts.polling, 10) || undefined,
      },
      errorHandling,
      maxRetries: parseInt(maxRetries, 10) || 0,
      enableMemory,
    }

    // Only include defined values
    Object.keys(newConfig.agentConfigs || {}).forEach((key) => {
      if (!newConfig.agentConfigs![key as keyof typeof newConfig.agentConfigs]) {
        delete newConfig.agentConfigs![key as keyof typeof newConfig.agentConfigs]
      }
    })

    onChange(newConfig)
  }, [agentConfigsState, timeouts, errorHandling, maxRetries, enableMemory])

  const availableConfigs = (agentConfigs as any[]) || []

  const updateAgentConfig = (phase: 'thought' | 'plan' | 'execute' | 'summary', value: string) => {
    setAgentConfigsState((prev) => ({ ...prev, [phase]: value === 'none' ? 'none' : value }))
  }

  const updateTimeout = (phase: keyof typeof timeouts, value: string) => {
    setTimeouts((prev) => ({ ...prev, [phase]: value }))
  }

  return (
    <div className="space-y-6">
      {/* Agent Configs */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Configurations</CardTitle>
          <CardDescription>Select agent configs for each phase</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="ml-2 text-sm text-muted-foreground">Loading agent configs...</span>
            </div>
          ) : (
            <>
              {(['thought', 'plan', 'execute', 'summary'] as const).map((phase) => (
                <div key={phase} className="space-y-2">
                  <Label htmlFor={`agent-${phase}`} className="capitalize">
                    {phase} Phase
                  </Label>
                  <Select
                    value={agentConfigsState[phase] || 'none'}
                    onValueChange={(value) => updateAgentConfig(phase, value === 'none' ? '' : value)}
                  >
                    <SelectTrigger id={`agent-${phase}`}>
                      <SelectValue placeholder={`Select ${phase} agent config`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {availableConfigs.map((config: any) => (
                        <SelectItem key={config._id} value={config._id}>
                          {config._id.substring(0, 8)}... ({config.isEnabled ? 'Enabled' : 'Disabled'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Timeouts */}
      <Card>
        <CardHeader>
          <CardTitle>Timeouts (ms)</CardTitle>
          <CardDescription>Time limits for each phase in milliseconds</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(['thought', 'plan', 'execute', 'summary', 'polling'] as const).map((phase) => (
            <div key={phase} className="space-y-2">
              <Label htmlFor={`timeout-${phase}`} className="capitalize">
                {phase} Timeout
              </Label>
              <Input
                id={`timeout-${phase}`}
                type="number"
                value={timeouts[phase]}
                onChange={(e) => updateTimeout(phase, e.target.value)}
                min="0"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator />

      {/* Error Handling */}
      <Card>
        <CardHeader>
          <CardTitle>Error Handling</CardTitle>
          <CardDescription>How to handle errors during execution</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="errorHandling">Error Handling Strategy</Label>
            <Select value={errorHandling} onValueChange={(value: any) => setErrorHandling(value)}>
              <SelectTrigger id="errorHandling">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fail">Fail (Stop on error)</SelectItem>
                <SelectItem value="retry">Retry (Retry failed steps)</SelectItem>
                <SelectItem value="refine">Refine (Refine plan and retry)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxRetries">Max Retries</Label>
            <Input
              id="maxRetries"
              type="number"
              value={maxRetries}
              onChange={(e) => setMaxRetries(e.target.value)}
              min="0"
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of retries (only used if error handling is "retry" or "refine")
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Memory */}
      <Card>
        <CardHeader>
          <CardTitle>Memory</CardTitle>
          <CardDescription>Enable memory/learning features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="enableMemory">Enable Memory</Label>
              <p className="text-xs text-muted-foreground">
                Allow the orchestrator to learn from past executions
              </p>
            </div>
            <Switch
              id="enableMemory"
              checked={enableMemory}
              onCheckedChange={setEnableMemory}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


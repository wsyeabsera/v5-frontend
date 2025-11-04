'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { AgentConfigSelector } from './AgentConfigSelector'
import { MessageBuilder, Message } from './MessageBuilder'
import { ExecutionResults } from './ExecutionResults'
import { useExecuteAICall } from '@/lib/queries-v2'
import { Play, Loader2 } from 'lucide-react'

export function AIExecutionForm() {
  const [agentConfigId, setAgentConfigId] = useState('')
  const [messages, setMessages] = useState<Message[]>([{ role: 'user', content: '' }])
  const [temperature, setTemperature] = useState<number | undefined>(undefined)
  const [maxTokens, setMaxTokens] = useState<number | undefined>(undefined)
  const [topP, setTopP] = useState<number | undefined>(undefined)
  const [useJSONFormat, setUseJSONFormat] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const executeMutation = useExecuteAICall()
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!agentConfigId) {
      newErrors.agentConfigId = 'Please select an agent configuration'
    }

    if (messages.length === 0) {
      newErrors.messages = 'At least one message is required'
    } else {
      const emptyMessages = messages.filter((m) => !m.content.trim())
      if (emptyMessages.length > 0) {
        newErrors.messages = 'All messages must have content'
      }
    }

    if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
      newErrors.temperature = 'Temperature must be between 0 and 2'
    }

    if (maxTokens !== undefined && (maxTokens < 1 || maxTokens > 100000)) {
      newErrors.maxTokens = 'Max tokens must be between 1 and 100000'
    }

    if (topP !== undefined && (topP < 0 || topP > 1)) {
      newErrors.topP = 'Top-p must be between 0 and 1'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)

    if (!validate()) {
      return
    }

    try {
      const options: any = {}
      if (temperature !== undefined) options.temperature = temperature
      if (maxTokens !== undefined) options.maxTokens = maxTokens
      if (topP !== undefined) options.topP = topP
      if (useJSONFormat) options.responseFormat = { type: 'json_object' }

      const response = await executeMutation.mutateAsync({
        agentConfigId,
        messages,
        options: Object.keys(options).length > 0 ? options : undefined,
      })

      setResult(response)
    } catch (err: any) {
      setError(err.message || 'Failed to execute AI call')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6 space-y-6">
        {/* Agent Configuration */}
        <div>
          <AgentConfigSelector value={agentConfigId} onValueChange={setAgentConfigId} />
          {errors.agentConfigId && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.agentConfigId}</p>
          )}
        </div>

        <Separator />

        {/* Messages */}
        <div>
          <MessageBuilder messages={messages} onChange={setMessages} />
          {errors.messages && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.messages}</p>
          )}
        </div>

        <Separator />

        {/* Advanced Options */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Advanced Options</Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Temperature */}
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature (0-2)</Label>
              <Input
                id="temperature"
                type="number"
                min="0"
                max="2"
                step="0.1"
                placeholder="Default"
                value={temperature ?? ''}
                onChange={(e) =>
                  setTemperature(e.target.value ? parseFloat(e.target.value) : undefined)
                }
              />
              {errors.temperature && (
                <p className="text-xs text-red-600 dark:text-red-400">{errors.temperature}</p>
              )}
            </div>

            {/* Max Tokens */}
            <div className="space-y-2">
              <Label htmlFor="maxTokens">Max Tokens</Label>
              <Input
                id="maxTokens"
                type="number"
                min="1"
                max="100000"
                placeholder="Default"
                value={maxTokens ?? ''}
                onChange={(e) =>
                  setMaxTokens(e.target.value ? parseInt(e.target.value) : undefined)
                }
              />
              {errors.maxTokens && (
                <p className="text-xs text-red-600 dark:text-red-400">{errors.maxTokens}</p>
              )}
            </div>

            {/* Top-P */}
            <div className="space-y-2">
              <Label htmlFor="topP">Top-P (0-1)</Label>
              <Input
                id="topP"
                type="number"
                min="0"
                max="1"
                step="0.01"
                placeholder="Default"
                value={topP ?? ''}
                onChange={(e) =>
                  setTopP(e.target.value ? parseFloat(e.target.value) : undefined)
                }
              />
              {errors.topP && (
                <p className="text-xs text-red-600 dark:text-red-400">{errors.topP}</p>
              )}
            </div>
          </div>

          {/* JSON Format */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="jsonFormat">JSON Response Format</Label>
              <p className="text-sm text-muted-foreground">
                Request the model to return a JSON object response
              </p>
            </div>
            <Switch
              id="jsonFormat"
              checked={useJSONFormat}
              onCheckedChange={setUseJSONFormat}
            />
          </div>
        </div>

        <Separator />

        {/* Submit Button */}
        <Button
          type="submit"
          size="lg"
          className="w-full gap-2"
          disabled={executeMutation.isPending}
        >
          {executeMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Execute AI Call
            </>
          )}
        </Button>
      </Card>

      {/* Results */}
      {(result !== null || error || executeMutation.isPending) && (
        <ExecutionResults
          result={result}
          isLoading={executeMutation.isPending}
          error={error}
        />
      )}
    </form>
  )
}

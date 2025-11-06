'use client'

import { useState, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTestPrompts, useOrchestrators } from '@/lib/queries-v2'
import { useQueryClient } from '@tanstack/react-query'
import { Play, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { SSEClient } from '@/lib/sse-client'

interface TestExecutionPanelProps {
  initialPromptId?: string
  initialSuiteId?: string
  onExecutionStart: (executionId: string, sseClient: SSEClient) => void
}

export function TestExecutionPanel({
  initialPromptId,
  onExecutionStart,
}: TestExecutionPanelProps) {
  const queryClient = useQueryClient()
  const [selectedPromptId, setSelectedPromptId] = useState(initialPromptId || '')
  const [selectedOrchestratorId, setSelectedOrchestratorId] = useState('')
  const [timeout, setTimeout] = useState(300000) // 5 minutes default
  const [isExecuting, setIsExecuting] = useState(false)
  const sseClientRef = useRef<SSEClient | null>(null)
  const runIdRef = useRef<string | null>(null)

  const { data: prompts } = useTestPrompts()
  const { data: orchestrators } = useOrchestrators()

  // Handle both response structures: { prompts: [...] } or { data: [...] } or direct array
  // Ensure promptsArray is always an array
  let promptsArray: any[] = []
  if (Array.isArray(prompts)) {
    promptsArray = prompts
  } else if (prompts && typeof prompts === 'object') {
    // Check for various possible response structures
    if (Array.isArray(prompts.prompts)) {
      promptsArray = prompts.prompts
    } else if (Array.isArray(prompts.data)) {
      promptsArray = prompts.data
    } else if (prompts.data && typeof prompts.data === 'object') {
      // If data is an object, check if it contains an array property
      const data = prompts.data as any
      if (Array.isArray(data.prompts)) {
        promptsArray = data.prompts
      } else if (Array.isArray(data.data)) {
        promptsArray = data.data
      } else if (Array.isArray(data.testPrompts)) {
        promptsArray = data.testPrompts
      } else if (Array.isArray(data.results)) {
        promptsArray = data.results
      } else if (Array.isArray(data.items)) {
        promptsArray = data.items
      } else {
        // If data is an object, check if it has array-like properties
        const dataKeys = Object.keys(data)
        // Check if any key contains an array
        for (const key of dataKeys) {
          if (Array.isArray(data[key])) {
            promptsArray = data[key]
            break
          }
        }
      }
    } else if (Array.isArray(prompts.testPrompts)) {
      promptsArray = prompts.testPrompts
    } else if (Array.isArray(prompts.results)) {
      promptsArray = prompts.results
    } else if (Array.isArray(prompts.items)) {
      promptsArray = prompts.items
    }
  }

  // Handle orchestrators response structure
  let orchestratorsArray: any[] = []
  if (Array.isArray(orchestrators)) {
    orchestratorsArray = orchestrators
  } else if (orchestrators && typeof orchestrators === 'object') {
    if (Array.isArray(orchestrators.data)) {
      orchestratorsArray = orchestrators.data
    } else if (Array.isArray(orchestrators.orchestrators)) {
      orchestratorsArray = orchestrators.orchestrators
    } else if (orchestrators.data && typeof orchestrators.data === 'object') {
      const data = orchestrators.data as any
      if (Array.isArray(data.orchestrators)) {
        orchestratorsArray = data.orchestrators
      } else if (Array.isArray(data.data)) {
        orchestratorsArray = data.data
      } else {
        // Check if any key contains an array
        const dataKeys = Object.keys(data)
        for (const key of dataKeys) {
          if (Array.isArray(data[key])) {
            orchestratorsArray = data[key]
            break
          }
        }
      }
    }
  }

  const selectedPrompt = promptsArray.find((p: any) => p.promptId === selectedPromptId)

  const handleExecute = async () => {
    if (!selectedOrchestratorId) {
      alert('Please select an orchestrator')
      return
    }

    if (!selectedPromptId) {
      alert('Please select a test prompt')
      return
    }

    if (isExecuting) {
      return // Already executing
    }

    setIsExecuting(true)

    try {
      // Disconnect any existing client
      if (sseClientRef.current) {
        sseClientRef.current.disconnect()
      }

      // Create SSE client for test streaming
      const client = new SSEClient('/api/mcp-orchestrator/test-stream', {
        promptId: selectedPromptId,
        orchestratorId: selectedOrchestratorId,
        timeout,
        stream: true,
      })

      sseClientRef.current = client

      // Listen for test_started event to get runId
      client.on('test_started', (data) => {
        console.log('[TestExecutionPanel] Test started:', data)
        if (data.runId) {
          runIdRef.current = data.runId
          // Pass both runId and SSE client to parent
          onExecutionStart(data.runId, client)
          // Invalidate to get initial data
          queryClient.invalidateQueries({ queryKey: ['test-run', data.runId] })
        }
      })

      // Listen for errors
      client.on('error', (data) => {
        console.error('[TestExecutionPanel] Test error:', data)
        setIsExecuting(false)
        if (runIdRef.current) {
          queryClient.invalidateQueries({ queryKey: ['test-run', runIdRef.current] })
        }
        alert(`Test execution error: ${data.error || 'Unknown error'}`)
      })

      // Listen for completion
      client.on('test_complete', (data) => {
        console.log('[TestExecutionPanel] Test complete:', data)
        setIsExecuting(false)
        if (runIdRef.current) {
          // Final invalidation to get complete results
          queryClient.invalidateQueries({ queryKey: ['test-run', runIdRef.current] })
          if (data.executionId) {
            queryClient.invalidateQueries({ queryKey: ['orchestration', data.executionId] })
          }
        }
      })

      client.onError((error) => {
        console.error('[TestExecutionPanel] SSE error:', error)
        setIsExecuting(false)
        alert('Connection error. Please try again.')
      })

      // Connect and start streaming
      client.connect()
    } catch (error: any) {
      console.error('[TestExecutionPanel] Execution error:', error)
      setIsExecuting(false)
      alert(`Execution failed: ${error.message || 'Unknown error'}. Check console for details.`)
    }
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Execute Test</h2>
          <p className="text-muted-foreground">
            Select a test prompt to execute against an orchestrator. User inputs configured in the prompt will be automatically provided.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt-select">Test Prompt *</Label>
            <Select value={selectedPromptId} onValueChange={setSelectedPromptId}>
              <SelectTrigger id="prompt-select">
                <SelectValue placeholder="Select a test prompt" />
              </SelectTrigger>
              <SelectContent>
                {promptsArray.map((prompt: any) => (
                  <SelectItem key={prompt.promptId} value={prompt.promptId}>
                    {prompt.name || prompt.promptId} - {prompt.query.substring(0, 50)}
                    {prompt.query.length > 50 ? '...' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPrompt && (
              <div className="mt-2 p-3 bg-muted rounded-md">
                <div className="text-sm font-medium mb-1">Selected Prompt:</div>
                <div className="text-sm text-muted-foreground">{selectedPrompt.query}</div>
                {selectedPrompt.userInputs && selectedPrompt.userInputs.length > 0 && (
                  <Badge variant="outline" className="mt-2">
                    {selectedPrompt.userInputs.length} user inputs configured
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="orchestrator-select">Orchestrator *</Label>
            <Select value={selectedOrchestratorId} onValueChange={setSelectedOrchestratorId}>
              <SelectTrigger id="orchestrator-select">
                <SelectValue placeholder="Select an orchestrator" />
              </SelectTrigger>
              <SelectContent>
                {orchestratorsArray.map((orch: any) => (
                  <SelectItem key={orch._id} value={String(orch._id)}>
                    {orch.name || orch._id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeout">Timeout (ms)</Label>
            <Input
              id="timeout"
              type="number"
              value={timeout}
              onChange={(e) => setTimeout(parseInt(e.target.value) || 300000)}
              placeholder="300000"
            />
            <p className="text-xs text-muted-foreground">
              Maximum execution time in milliseconds (default: 300000 = 5 minutes)
            </p>
          </div>

          <Button
            onClick={handleExecute}
            disabled={
              isExecuting ||
              !selectedOrchestratorId ||
              !selectedPromptId
            }
            className="w-full"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting Execution...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Execute Test
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}


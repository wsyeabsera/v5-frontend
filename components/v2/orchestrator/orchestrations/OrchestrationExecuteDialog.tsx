'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { OrchestrationStreamView } from './OrchestrationStreamView'
import { OrchestrationUserInputDialog } from './OrchestrationUserInputDialog'
import { SSEClient } from '@/lib/sse-client'
import { mcpClientV2 } from '@/lib/mcp-client-v2'
import { Loader2, X } from 'lucide-react'

interface OrchestrationExecuteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orchestratorId: string
  orchestratorName?: string
}

export function OrchestrationExecuteDialog({
  open,
  onOpenChange,
  orchestratorId,
  orchestratorName,
}: OrchestrationExecuteDialogProps) {
  const [userQuery, setUserQuery] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [sseClient, setSseClient] = useState<SSEClient | null>(null)
  const [streamEvents, setStreamEvents] = useState<any[]>([])
  const [currentPhase, setCurrentPhase] = useState<string | null>(null)
  const [executionId, setExecutionId] = useState<string | null>(null)
  const [userInputRequired, setUserInputRequired] = useState<any>(null)

  useEffect(() => {
    if (!open) {
      // Reset on close
      setUserQuery('')
      setIsExecuting(false)
      setStreamEvents([])
      setCurrentPhase(null)
      setExecutionId(null)
      setUserInputRequired(null)
      if (sseClient) {
        sseClient.disconnect()
        setSseClient(null)
      }
    }
  }, [open])

  const handleExecute = async () => {
    if (!userQuery.trim() || isExecuting) return

    setIsExecuting(true)
    setStreamEvents([])
    setCurrentPhase(null)
    setUserInputRequired(null)

    try {
      // Create SSE client for streaming with POST request body
      const client = new SSEClient('/api/mcp-orchestrator/stream', {
        orchestratorId,
        userQuery: userQuery.trim(),
        stream: true,
      })
      
      // Set up event handlers
      client.on('thought', (data) => {
        setCurrentPhase('thought')
        setStreamEvents((prev) => [...prev, { type: 'thought', data, timestamp: new Date() }])
        if (data.executionId) setExecutionId(data.executionId)
      })

      client.on('plan', (data) => {
        setCurrentPhase('plan')
        setStreamEvents((prev) => [...prev, { type: 'plan', data, timestamp: new Date() }])
      })

      client.on('step', (data) => {
        setCurrentPhase('executing')
        setStreamEvents((prev) => [...prev, { type: 'step', data, timestamp: new Date() }])
      })

      client.on('user_input_required', (data) => {
        setCurrentPhase('paused')
        setUserInputRequired(data)
        setStreamEvents((prev) => [
          ...prev,
          { type: 'user_input_required', data, timestamp: new Date() },
        ])
      })

      client.on('summary', (data) => {
        setCurrentPhase('summary')
        setStreamEvents((prev) => [...prev, { type: 'summary', data, timestamp: new Date() }])
      })

      client.on('error', (data) => {
        setStreamEvents((prev) => [...prev, { type: 'error', data, timestamp: new Date() }])
        setIsExecuting(false)
      })

      client.on('complete', (data) => {
        setCurrentPhase('completed')
        setStreamEvents((prev) => [...prev, { type: 'complete', data, timestamp: new Date() }])
        setIsExecuting(false)
        if (data.executionId) setExecutionId(data.executionId)
      })

      client.onError((error) => {
        console.error('[SSE] Error:', error)
        setStreamEvents((prev) => [
          ...prev,
          {
            type: 'error',
            data: { error: 'Connection error' },
            timestamp: new Date(),
          },
        ])
        setIsExecuting(false)
      })

      setSseClient(client)

      // Connect SSE client (will make POST request with streaming)
      client.connect()
    } catch (error: any) {
      console.error('Failed to execute orchestration:', error)
      setStreamEvents((prev) => [
        ...prev,
        {
          type: 'error',
          data: { error: error.message || 'Failed to start execution' },
          timestamp: new Date(),
        },
      ])
      setIsExecuting(false)
    }
  }

  const handleUserInputSubmit = async (inputs: Array<{ stepId: string; field: string; value: any }>) => {
    if (!userInputRequired?.taskId) return

    try {
      // Resume task using agents-mcp-server
      await mcpClientV2.resumeTask(userInputRequired.taskId, inputs)
      setUserInputRequired(null)
      setCurrentPhase('executing')
      // Execution will continue streaming
    } catch (error: any) {
      console.error('Failed to submit user input:', error)
      setStreamEvents((prev) => [
        ...prev,
        {
          type: 'error',
          data: { error: error.message || 'Failed to submit user input' },
          timestamp: new Date(),
        },
      ])
    }
  }

  const handleCancel = () => {
    if (sseClient) {
      sseClient.disconnect()
      setSseClient(null)
    }
    setIsExecuting(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              Execute Orchestration{orchestratorName ? `: ${orchestratorName}` : ''}
            </DialogTitle>
            <DialogDescription>
              Enter your query and execute the orchestrator workflow
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userQuery">User Query</Label>
              <Textarea
                id="userQuery"
                placeholder="Enter your query here..."
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                rows={4}
                disabled={isExecuting}
              />
            </div>

            {isExecuting && (
              <OrchestrationStreamView
                events={streamEvents}
                currentPhase={currentPhase}
                executionId={executionId}
              />
            )}

            <div className="flex items-center justify-end gap-2">
              {isExecuting && (
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleExecute}
                disabled={!userQuery.trim() || isExecuting}
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Executing...
                  </>
                ) : (
                  'Execute'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Input Dialog */}
      {userInputRequired && (
        <OrchestrationUserInputDialog
          open={!!userInputRequired}
          onOpenChange={(open) => !open && setUserInputRequired(null)}
          pendingInputs={userInputRequired.pendingInputs || []}
          onSubmit={handleUserInputSubmit}
        />
      )}
    </>
  )
}


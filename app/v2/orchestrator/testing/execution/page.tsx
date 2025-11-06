'use client'

import { useState, Suspense, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { TestExecutionPanel } from '@/components/v2/orchestrator/testing/execution/TestExecutionPanel'
import { ExecutionMonitor } from '@/components/v2/orchestrator/testing/execution/ExecutionMonitor'
import { DashboardLayout } from '@/components/v2/orchestrator/dashboard/DashboardLayout'
import { SSEClient } from '@/lib/sse-client'

function TestExecutionContent() {
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const promptId = searchParams.get('promptId')
  const suiteId = searchParams.get('suiteId')
  const [executionId, setExecutionId] = useState<string | null>(null)
  const [orchestratorExecutionId, setOrchestratorExecutionId] = useState<string | null>(null)
  const sseClientRef = useRef<SSEClient | null>(null)
  const runIdRef = useRef<string | null>(null)

  // Cleanup SSE client on unmount
  useEffect(() => {
    return () => {
      if (sseClientRef.current) {
        sseClientRef.current.disconnect()
      }
    }
  }, [])

  // Listen to SSE events for the current execution
  useEffect(() => {
    if (!executionId || !sseClientRef.current) {
      return
    }

    const client = sseClientRef.current
    runIdRef.current = executionId

    // Listen for test_phase events to update UI in real-time
    const handlePhase = (data: any) => {
      console.log('[Page] Test phase update:', data)
      // Store orchestrator executionId from SSE events
      if (data.executionId && !orchestratorExecutionId) {
        setOrchestratorExecutionId(data.executionId)
      }
      queryClient.invalidateQueries({ queryKey: ['test-run', executionId] })
      if (data.executionId) {
        queryClient.invalidateQueries({ queryKey: ['orchestration', data.executionId] })
      }
    }

    const handleUserInput = (data: any) => {
      console.log('[Page] User input required:', data)
      // Store orchestrator executionId from SSE events
      if (data.executionId && !orchestratorExecutionId) {
        setOrchestratorExecutionId(data.executionId)
      }
      queryClient.invalidateQueries({ queryKey: ['test-run', executionId] })
      if (data.executionId) {
        queryClient.invalidateQueries({ queryKey: ['orchestration', data.executionId] })
      }
    }

    const handleComplete = (data: any) => {
      console.log('[Page] Test complete:', data)
      queryClient.invalidateQueries({ queryKey: ['test-run', executionId] })
      if (data.executionId) {
        queryClient.invalidateQueries({ queryKey: ['orchestration', data.executionId] })
      }
    }

    client.on('test_phase', handlePhase)
    client.on('test_user_input_required', handleUserInput)
    client.on('test_complete', handleComplete)

    return () => {
      client.off('test_phase', handlePhase)
      client.off('test_user_input_required', handleUserInput)
      client.off('test_complete', handleComplete)
    }
  }, [executionId, orchestratorExecutionId, queryClient])

  const handleExecutionStart = (id: string, sseClient: SSEClient) => {
    sseClientRef.current = sseClient
    setExecutionId(id)
    setOrchestratorExecutionId(null) // Reset when starting a new execution
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-[95vw]">
      <DashboardLayout
        title="Test Execution"
        description="Execute test prompts and suites with real-time monitoring. User inputs are automatically provided when configured."
      >
        <div className="space-y-6">
          {!executionId ? (
            <TestExecutionPanel
              initialPromptId={promptId || undefined}
              initialSuiteId={suiteId || undefined}
              onExecutionStart={handleExecutionStart}
            />
          ) : (
            <ExecutionMonitor
              executionId={executionId}
              orchestratorExecutionId={orchestratorExecutionId}
              onComplete={() => {
                if (sseClientRef.current) {
                  sseClientRef.current.disconnect()
                  sseClientRef.current = null
                }
                setExecutionId(null)
                setOrchestratorExecutionId(null)
              }}
              onCancel={() => {
                if (sseClientRef.current) {
                  sseClientRef.current.disconnect()
                  sseClientRef.current = null
                }
                setExecutionId(null)
                setOrchestratorExecutionId(null)
              }}
            />
          )}
        </div>
      </DashboardLayout>
    </div>
  )
}

export default function TestExecutionPage() {
  return (
    <Suspense fallback={<div className="container mx-auto py-8 px-4">Loading...</div>}>
      <TestExecutionContent />
    </Suspense>
  )
}


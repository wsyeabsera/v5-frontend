'use client'

import { useState, useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { SSEClient } from '@/lib/sse-client'
import { mcpClientV2 } from '@/lib/mcp-client-v2'
import { mcpClientOrchestrator } from '@/lib/mcp-client-orchestrator'
import { ChatMessage as ChatMessageType } from './types'
import { useOrchestrators } from '@/lib/queries-v2'
import { Loader2, MessageSquare, MessageSquarePlus, Network } from 'lucide-react'

interface OrchestrationChatProps {
  orchestratorId?: string
  onExecutionComplete?: (executionId: string) => void
}

export function OrchestrationChat({ orchestratorId, onExecutionComplete }: OrchestrationChatProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [sseClient, setSseClient] = useState<SSEClient | null>(null)
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  const [pendingInputs, setPendingInputs] = useState<Array<{ stepId: string; field: string; description?: string }>>([])
  const [selectedOrchestratorId, setSelectedOrchestratorId] = useState<string | undefined>(orchestratorId)
  const [summaryFormat, setSummaryFormat] = useState<'brief' | 'detailed' | 'technical'>('detailed')
  const [assistantMessageId, setAssistantMessageId] = useState<string | null>(null)
  const [currentPhase, setCurrentPhase] = useState<'thought' | 'plan' | 'executing' | 'summary' | 'completed' | 'failed' | null>(null)
  const [progressPercentage, setProgressPercentage] = useState(0)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  const { data: orchestrators } = useOrchestrators()

  // Sync orchestratorId prop with internal state (only if prop changes externally)
  useEffect(() => {
    if (orchestratorId && orchestratorId !== selectedOrchestratorId) {
      setSelectedOrchestratorId(orchestratorId)
    }
  }, [orchestratorId]) // Only update if prop changes - don't clear messages

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (sseClient) {
        sseClient.disconnect()
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [sseClient])

  const addMessage = (message: Omit<ChatMessageType, 'id' | 'timestamp'>) => {
    if (!isMountedRef.current) return null
    
    const newMessage: ChatMessageType = {
      ...message,
      id: `msg_${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
    }
    // Use functional update to ensure we append to the current state
    setMessages((prev) => {
      // Ensure we never accidentally clear messages - always append
      return [...prev, newMessage]
    })
    return newMessage
  }

  const updateLastMessage = (updates: Partial<ChatMessageType>) => {
    setMessages((prev) => {
      const newMessages = [...prev]
      if (newMessages.length > 0) {
        newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], ...updates }
      }
      return newMessages
    })
  }

  const updateMessageById = (messageId: string, updates: Partial<ChatMessageType>) => {
    setMessages((prev) => {
      return prev.map((msg) => (msg.id === messageId ? { ...msg, ...updates } : msg))
    })
  }

  const updateAssistantMessage = (content: string, phase?: 'thought' | 'plan' | 'executing' | 'summary' | 'completed' | 'failed', isLoading?: boolean) => {
    if (!isMountedRef.current) return
    
    setMessages((prev) => {
      // IMPORTANT: Always preserve all existing messages - never remove user messages
      // Find the last assistant message (most recent one) - reverse to find last
      let lastAssistantIndex = -1
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].type === 'assistant') {
          lastAssistantIndex = i
          break
        }
      }
      
      if (lastAssistantIndex >= 0) {
        // Update existing assistant message - preserve all other messages
        const updated = [...prev]
        updated[lastAssistantIndex] = {
          ...updated[lastAssistantIndex],
          content,
          phase,
          isLoading,
        }
        // Update the assistantMessageId if it's not set
        if (!assistantMessageId) {
          setAssistantMessageId(updated[lastAssistantIndex].id)
        }
        return updated
      } else {
        // Create new assistant message - append to existing messages (preserve all)
        const newMessage: ChatMessageType = {
          id: `assistant_${Date.now()}_${Math.random()}`,
          type: 'assistant',
          content,
          phase,
          isLoading,
          timestamp: new Date(),
        }
        setAssistantMessageId(newMessage.id)
        // Always append - never replace the array
        return [...prev, newMessage]
      }
    })
    
    if (phase) {
      setCurrentPhase(phase)
      // Calculate progress based on phase
      const phaseProgress = {
        thought: 25,
        plan: 50,
        executing: 75,
        summary: 90,
        completed: 100,
        failed: 0,
      }
      setProgressPercentage(phaseProgress[phase] || 0)
    }
  }

  const handleSendMessage = async (message: string) => {
    if (!selectedOrchestratorId) {
      // If no orchestrator selected, show error
      addMessage({
        type: 'system',
        content: 'Please select an orchestrator first',
      })
      return
    }

    // Add user message FIRST - ensure it's in state before any other updates
    const userMessage = addMessage({
      type: 'user',
      content: message,
    })
    
    // Verify user message was added (defensive check)
    if (!userMessage) {
      console.error('[OrchestrationChat] Failed to add user message')
      return
    }

    // Reset assistant message for new execution
    setAssistantMessageId(null)
    setCurrentPhase(null)
    setProgressPercentage(0)
    setIsStreaming(true)
    setPendingInputs([])
    
    // Small delay to ensure user message state is applied before SSE events
    // This prevents race conditions where SSE events fire before React applies the state update
    await new Promise(resolve => setTimeout(resolve, 0))

    try {
      // Create SSE client for streaming
      const client = new SSEClient('/api/mcp-orchestrator/stream', {
        orchestratorId: selectedOrchestratorId,
        userQuery: message.trim(),
        stream: true,
        summaryFormat: summaryFormat,
      })

      // Set up event handlers - simplified to update single assistant message
      client.on('thought', (data) => {
        if (data.executionId) setCurrentExecutionId(data.executionId)
        if (data.status === 'generating') {
          updateAssistantMessage('Thinking...', 'thought', true)
        } else if (data.status === 'completed') {
          // Don't show thought content, just move to planning
          updateAssistantMessage('Planning...', 'plan', true)
        }
      })

      client.on('plan', (data) => {
        if (data.status === 'generating') {
          updateAssistantMessage('Planning...', 'plan', true)
        } else if (data.status === 'completed') {
          // Don't show plan details, just move to executing
          updateAssistantMessage('Executing...', 'executing', true)
        }
      })

      client.on('step', (data) => {
        if (data.status === 'waiting' && data.pendingInputs) {
          // User input required - this is important, show it
          updateAssistantMessage('', 'executing', false)
          
          const missingFields = data.pendingInputs
            .map((input: any) => input.field || input.description || '')
            .filter(Boolean)
            .join(', ')
          
          addMessage({
            type: 'user_input_required',
            content: data.output || `I need the following information to continue: ${missingFields}. Please provide these details and I'll complete the task.`,
            data: data,
            pendingInputs: data.pendingInputs,
            taskId: data.taskId || currentTaskId,
            executionId: data.executionId || currentExecutionId,
          })
          
          setPendingInputs(data.pendingInputs)
          if (data.taskId) setCurrentTaskId(data.taskId)
          setIsStreaming(false)
        } else if (data.stepNumber === 0 && data.stepName === 'Task Execution Started') {
          updateAssistantMessage('Executing...', 'executing', true)
        }
        // Skip all step outputs - don't show intermediate information
      })

      client.on('summary', (data) => {
        if (data.status === 'generating') {
          updateAssistantMessage('Generating summary...', 'summary', true)
        } else if (data.status === 'completed' || data.summary) {
          const summaryText = data.summary || data.results?.summary || ''
          if (summaryText) {
            updateAssistantMessage(summaryText, 'summary', false)
          }
        }
      })

      client.on('error', (data) => {
        updateAssistantMessage(`Error: ${data.error || 'An error occurred'}`, 'failed', false)
        setIsStreaming(false)
      })

      client.on('complete', (data) => {
        // Extract taskId from results if available
        if (data.taskId) {
          setCurrentTaskId(data.taskId)
        } else if (data.results?.execution?._id) {
          setCurrentTaskId(data.results.execution._id)
        } else if (data.results?.taskId) {
          setCurrentTaskId(data.results.taskId)
        }
        
        // Check if execution was paused (needs user input)
        if (data.results?.paused && data.results?.pendingInputs) {
          const pendingInputs = data.results.pendingInputs
          setPendingInputs(pendingInputs)
          
          const missingFields = pendingInputs
            .map((input: any) => input.field || input.description || '')
            .filter(Boolean)
            .join(', ')
          
          addMessage({
            type: 'user_input_required',
            content: data.executionMessage || `I need the following information to continue: ${missingFields}. Please provide these details.`,
            data: data.results,
            pendingInputs: pendingInputs,
            taskId: data.taskId || data.results?.execution?._id || data.results?.taskId,
            executionId: data.executionId || currentExecutionId || undefined,
          })
          setIsStreaming(false)
        } else {
          // Show summary if available - prioritize summary from multiple sources
          const summaryText = 
            data.results?.summary || 
            data.results?.execution?.summary || 
            data.summary || 
            data.results?.execution?.task?.summary ||
            ''
          
          console.log('[OrchestrationChat] Complete event - summary check:', {
            hasResults: !!data.results,
            hasSummary: !!data.results?.summary,
            hasExecutionSummary: !!data.results?.execution?.summary,
            hasDataSummary: !!data.summary,
            summaryText: summaryText ? summaryText.substring(0, 100) + '...' : 'NONE',
          })
          
          // Only update if we have a summary, or if the assistant message is still loading/empty
          if (summaryText) {
            updateAssistantMessage(summaryText, 'completed', false)
          } else {
            // Only show fallback if we don't already have content - don't overwrite existing summary
            setMessages((prev) => {
              // Find last assistant message
              let lastAssistant: ChatMessageType | null = null
              for (let i = prev.length - 1; i >= 0; i--) {
                if (prev[i].type === 'assistant') {
                  lastAssistant = prev[i]
                  break
                }
              }
              
              // Only show fallback if we don't have meaningful content
              if (!lastAssistant || !lastAssistant.content || 
                  lastAssistant.content === 'Thinking...' || 
                  lastAssistant.content === 'Planning...' || 
                  lastAssistant.content === 'Executing...' || 
                  lastAssistant.content === 'Generating summary...' || 
                  lastAssistant.content === 'Resuming execution...' ||
                  lastAssistant.isLoading) {
                // No meaningful content yet, show fallback
                if (lastAssistant) {
                  return prev.map((msg) => 
                    msg.id === lastAssistant!.id 
                      ? { ...msg, content: 'Execution completed successfully.', isLoading: false }
                      : msg
                  )
                }
              }
              // If we already have content (like a summary), don't overwrite it
              return prev
            })
          }
          
          if (data.executionId && onExecutionComplete) {
            onExecutionComplete(data.executionId)
          }
        }
        
        setIsStreaming(false)
      })

      client.onError((error) => {
        console.error('[SSE] Error:', error)
        updateAssistantMessage('Connection error occurred', 'failed', false)
        setIsStreaming(false)
      })

      setSseClient(client)
      client.connect()
    } catch (error: any) {
      console.error('Failed to execute orchestration:', error)
      updateAssistantMessage(`Error: ${error.message || 'Failed to start execution'}`, 'failed', false)
      setIsStreaming(false)
    }
  }

  const handleUserInputSubmit = async (inputs: Array<{ stepId: string; field: string; value: any }>) => {
    if (!currentTaskId) {
      addMessage({
        type: 'system',
        content: 'Error: No task ID available',
      })
      return
    }

    try {
      // Clear pending inputs immediately
      setPendingInputs([])
      
      // Add user message showing what was submitted
      const submittedValues = inputs.map((input) => `${input.field}: ${JSON.stringify(input.value)}`).join(', ')
      addMessage({
        type: 'user',
        content: `Submitted: ${submittedValues}`,
      })
      
      // Resume task using agents-mcp-server
      await mcpClientV2.resumeTask(currentTaskId, inputs)
      
      // Update assistant message to show resuming
      updateAssistantMessage('Resuming execution...', 'executing', true)
      
      setIsStreaming(true)
      
      // Poll for task and execution updates after resuming
      let pollCount = 0
      const maxPolls = 150 // 5 minutes at 2 second intervals
      
      // Clear any existing polling interval
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      
      pollIntervalRef.current = setInterval(async () => {
        if (!isMountedRef.current) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          return
        }
        
        pollCount++
        try {
          // Get task details to see step outputs
          let task: any = null
          try {
            task = await mcpClientV2.getTask(currentTaskId)
          } catch (err) {
            // Task might not be available, continue with execution polling
          }
          
          // Get execution details
          if (currentExecutionId) {
            const execution = await mcpClientOrchestrator.getOrchestration(currentExecutionId)
            
            if (execution?.status === 'completed') {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current)
                pollIntervalRef.current = null
              }
              if (!isMountedRef.current) return
              
              // Only show summary - check multiple locations for summary
              const summaryText = 
                execution?.results?.summary || 
                execution?.results?.execution?.summary ||
                execution?.summary ||
                task?.summary ||
                task?.results?.summary ||
                execution?.results?.execution?.task?.summary ||
                ''
              
              console.log('[OrchestrationChat] Polling - summary check:', {
                executionId: currentExecutionId,
                hasResults: !!execution?.results,
                hasSummary: !!execution?.results?.summary,
                hasExecutionSummary: !!execution?.results?.execution?.summary,
                hasTaskSummary: !!task?.summary,
                summaryText: summaryText || 'NONE',
                executionStatus: execution?.status,
              })
              
              if (summaryText) {
                updateAssistantMessage(summaryText, 'completed', false)
              } else {
                // If no summary, try to get a meaningful message from task outputs
                let fallbackMessage = 'Execution completed successfully.'
                if (task?.stepOutputs && typeof task.stepOutputs === 'object') {
                  const stepKeys = Object.keys(task.stepOutputs)
                  const lastStep = stepKeys.length > 0 ? task.stepOutputs[stepKeys[stepKeys.length - 1]] : null
                  if (lastStep?.output && typeof lastStep.output === 'string') {
                    fallbackMessage = lastStep.output
                  }
                }
                updateAssistantMessage(fallbackMessage, 'completed', false)
              }
              
              setIsStreaming(false)
              if (onExecutionComplete) {
                onExecutionComplete(currentExecutionId)
              }
            } else if (execution?.status === 'failed') {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current)
                pollIntervalRef.current = null
              }
              if (!isMountedRef.current) return
              updateAssistantMessage(`Execution failed: ${execution.error || 'Unknown error'}`, 'failed', false)
              setIsStreaming(false)
            } else if (execution?.results?.execution?.paused && execution?.results?.execution?.pendingInputs) {
              // Another user input required
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current)
                pollIntervalRef.current = null
              }
              if (!isMountedRef.current) return
              updateLastMessage({
                isLoading: false,
              })
              const pendingInputs = execution.results.execution.pendingInputs
              const missingFields = pendingInputs
                .map((input: any) => input.field || input.description || '')
                .filter(Boolean)
                .join(', ')
              addMessage({
                type: 'user_input_required',
                content: `I need the following information to continue: ${missingFields}. Please provide these details.`,
                data: execution.results.execution,
                pendingInputs: pendingInputs,
                taskId: execution.results.execution._id || currentTaskId,
                executionId: currentExecutionId,
              })
              setPendingInputs(pendingInputs)
              setIsStreaming(false)
            } else if (task?.status === 'completed' || task?.status === 'done') {
              // Task completed but execution might still be processing - just update status
              updateAssistantMessage('Executing...', 'executing', true)
            }
          }
          
          // Stop polling if we've exceeded max polls
          if (pollCount >= maxPolls) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
            if (!isMountedRef.current) return
            if (isStreaming) {
              setIsStreaming(false)
              updateAssistantMessage('Polling timeout - execution may still be in progress', 'executing', false)
            }
          }
        } catch (error) {
          console.error('Error polling execution:', error)
          // Don't stop polling on error, just log it
          if (pollCount >= maxPolls) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
            if (isMountedRef.current) {
              setIsStreaming(false)
            }
          }
        }
      }, 2000) // Poll every 2 seconds
      
    } catch (error: any) {
      console.error('Failed to submit user input:', error)
      updateAssistantMessage(`Error: ${error.message || 'Failed to submit user input'}`, 'failed', false)
      setIsStreaming(false)
    }
  }

  const handleNewConversation = () => {
    if (sseClient) {
      sseClient.disconnect()
      setSseClient(null)
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    setMessages([])
    setIsStreaming(false)
    setCurrentExecutionId(null)
    setCurrentTaskId(null)
    setPendingInputs([])
    setAssistantMessageId(null)
    setCurrentPhase(null)
    setProgressPercentage(0)
  }

  // Get current pending inputs from state (cleared when submitted)
  // Only show form if we have active pending inputs in state
  const currentPendingInputs = pendingInputs && pendingInputs.length > 0 ? pendingInputs : undefined

  return (
    <div className="flex flex-col h-[calc(100vh-250px)] min-h-[600px] max-h-[calc(100vh-200px)] bg-background rounded-lg border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30 flex-shrink-0">
        <div className="flex items-center gap-4 flex-1">
          <h2 className="text-lg font-semibold">Orchestration Chat</h2>
              {orchestrators && orchestrators.length > 0 && (
            <div className="flex items-center gap-2">
              {!selectedOrchestratorId ? (
                <Select value={selectedOrchestratorId || 'none'} onValueChange={(value) => setSelectedOrchestratorId(value === 'none' ? undefined : value)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select orchestrator..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select orchestrator...</SelectItem>
                    {orchestrators.map((orch: any) => (
                      <SelectItem key={orch._id} value={orch._id}>
                        {orch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1.5">
                    <Network className="w-3 h-3" />
                    {orchestrators.find((o: any) => o._id === selectedOrchestratorId)?.name || 'Unknown'}
                  </Badge>
                </div>
              )}
              <Select value={summaryFormat} onValueChange={(value) => setSummaryFormat(value as 'brief' | 'detailed' | 'technical')} disabled={isStreaming}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brief">Brief</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {currentPhase && isStreaming && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground min-w-[60px]">
                  {progressPercentage}%
                </span>
              </div>
              <Badge variant="outline" className="gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                {currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1)}
              </Badge>
            </div>
          )}
        </div>
        <Button
          onClick={handleNewConversation}
          variant="ghost"
          size="sm"
          disabled={isStreaming}
          className="gap-2"
        >
          <MessageSquarePlus className="w-4 h-4" />
          New Conversation
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0 p-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[400px] text-muted-foreground">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium">Start a conversation</p>
                <p className="text-sm max-w-md">
                  {selectedOrchestratorId 
                    ? 'Send a message to execute an orchestration. The orchestrator will guide you through the process.'
                    : 'Select an orchestrator above to begin executing orchestrations.'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="flex-shrink-0">
        <ChatInput
          onSendMessage={handleSendMessage}
          onSubmitUserInput={handleUserInputSubmit}
          pendingInputs={currentPendingInputs}
          isDisabled={isStreaming && !currentPendingInputs}
          isLoading={isStreaming}
          placeholder={selectedOrchestratorId ? 'Type your message...' : 'Select an orchestrator first...'}
        />
      </div>
    </div>
  )
}


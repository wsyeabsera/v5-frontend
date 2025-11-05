'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useExecuteTask, useResumeTask } from '@/lib/queries-v2'
import { UserInputDialog } from './UserInputDialog'
import { AgentConfigSelector } from '@/components/v2/ai-execution/AgentConfigSelector'
import { Play, RotateCcw, Loader2 } from 'lucide-react'

interface TaskExecutionControlsProps {
  task: {
    _id?: string
    id?: string
    planId?: string
    status?: 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled'
    pendingUserInputs?: Array<{
      stepId: string
      field: string
      description?: string
    }>
  }
  onTaskUpdate?: () => void
}

export function TaskExecutionControls({ task, onTaskUpdate }: TaskExecutionControlsProps) {
  const taskId = task._id || task.id || ''
  const status = task.status || 'pending'
  const pendingInputs = task.pendingUserInputs || []
  const [selectedAgentConfigId, setSelectedAgentConfigId] = useState<string>('')
  const [showUserInputDialog, setShowUserInputDialog] = useState(false)

  const executeMutation = useExecuteTask()
  const resumeMutation = useResumeTask()

  const handleExecute = async () => {
    if (!task.planId || !selectedAgentConfigId) return

    try {
      await executeMutation.mutateAsync({
        planId: task.planId,
        agentConfigId: selectedAgentConfigId,
      })
      onTaskUpdate?.()
    } catch (error) {
      console.error('Failed to execute task:', error)
    }
  }

  const handleResume = async (inputs: Array<{ stepId: string; field: string; value: any }>) => {
    if (!taskId) return

    try {
      await resumeMutation.mutateAsync({
        taskId,
        userInputs: inputs,
      })
      setShowUserInputDialog(false)
      onTaskUpdate?.()
    } catch (error) {
      console.error('Failed to resume task:', error)
      throw error
    }
  }

  const isPending = status === 'pending'
  const isPaused = status === 'paused'
  const isInProgress = status === 'in_progress'
  const canExecute = isPending && task.planId && selectedAgentConfigId
  const canResume = isPaused && pendingInputs.length > 0

  if (status === 'completed' || status === 'failed' || status === 'cancelled') {
    return null
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {isPending && (
          <>
            <div className="flex-1 min-w-[200px]">
              <AgentConfigSelector
                value={selectedAgentConfigId}
                onValueChange={setSelectedAgentConfigId}
              />
            </div>
            <Button
              onClick={handleExecute}
              disabled={!canExecute || executeMutation.isPending}
              size="sm"
            >
              {executeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Execute Task
                </>
              )}
            </Button>
          </>
        )}

        {isPaused && (
          <Button
            onClick={() => setShowUserInputDialog(true)}
            disabled={!canResume || resumeMutation.isPending}
            size="sm"
            variant="default"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Resume Task
          </Button>
        )}

        {isInProgress && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Task is running...</span>
          </div>
        )}
      </div>

      {isPaused && (
        <UserInputDialog
          open={showUserInputDialog}
          onOpenChange={setShowUserInputDialog}
          pendingInputs={pendingInputs}
          onSubmit={handleResume}
          isLoading={resumeMutation.isPending}
        />
      )}
    </>
  )
}


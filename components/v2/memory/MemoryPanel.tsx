'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useLearnFromTask } from '@/lib/queries-intelligence/memory'
import { useTasks } from '@/lib/queries-v2'
import { Loader2, Database, CheckCircle2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function MemoryPanel() {
  const [taskId, setTaskId] = useState<string>('')
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [insights, setInsights] = useState<string[]>([''])
  const [showSuccess, setShowSuccess] = useState(false)

  const { data: tasksData, isLoading: tasksLoading } = useTasks({ limit: 100, skip: 0 })
  const tasks = Array.isArray(tasksData) ? tasksData : tasksData?.tasks || []

  const learnFromTask = useLearnFromTask()

  // Filter to only completed or failed tasks
  const completedTasks = tasks.filter(
    (task: any) => task.status === 'completed' || task.status === 'failed'
  )

  const handleTaskSelect = (taskId: string) => {
    setTaskId(taskId)
    const task = tasks.find((t: any) => (t._id || t.id) === taskId)
    setSelectedTask(task)
  }

  const handleInsightChange = (index: number, value: string) => {
    const newInsights = [...insights]
    newInsights[index] = value
    setInsights(newInsights)
  }

  const addInsight = () => {
    setInsights([...insights, ''])
  }

  const removeInsight = (index: number) => {
    const newInsights = insights.filter((_, i) => i !== index)
    setInsights(newInsights.length > 0 ? newInsights : [''])
  }

  const handleLearnFromTask = async () => {
    if (!selectedTask || !taskId) return

    const taskIdValue = selectedTask._id || selectedTask.id
    const planId = selectedTask.planId || ''

    if (!planId) {
      alert('Task must have a planId to learn from')
      return
    }

    try {
      const executionTime = selectedTask.executionHistory
        ? selectedTask.executionHistory.reduce((sum: number, entry: any) => sum + (entry.duration || 0), 0)
        : 0

      const stepsCompleted = selectedTask.stepOutputs
        ? Object.keys(selectedTask.stepOutputs).length
        : 0

      await learnFromTask.mutateAsync({
        taskId: taskIdValue,
        planId,
        status: selectedTask.status === 'completed' ? 'completed' : 'failed',
        metrics: {
          executionTime,
          stepsCompleted,
          retries: 0, // TODO: Extract from task if available
          userInputsRequired: Array.isArray(selectedTask.pendingUserInputs)
            ? selectedTask.pendingUserInputs.length
            : 0,
        },
        insights: insights.filter((i) => i.trim().length > 0),
      })

      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        setTaskId('')
        setSelectedTask(null)
        setInsights([''])
      }, 3000)
    } catch (error) {
      console.error('Failed to learn from task:', error)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="task-select">Select Completed or Failed Task</Label>
            <select
              id="task-select"
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={taskId}
              onChange={(e) => handleTaskSelect(e.target.value)}
            >
              <option value="">Select a task...</option>
              {completedTasks.map((task: any) => {
                const id = task._id || task.id
                return (
                  <option key={id} value={id}>
                    {id} - {task.status} - {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'Unknown date'}
                  </option>
                )
              })}
            </select>
          </div>

          {selectedTask && (
            <div className="space-y-4 rounded-lg border p-4 bg-muted/50">
              <div>
                <h3 className="font-semibold mb-2">Task Information</h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>Status:</strong> {selectedTask.status}
                  </p>
                  <p>
                    <strong>Plan ID:</strong> {selectedTask.planId || 'N/A'}
                  </p>
                  {selectedTask.executionHistory && (
                    <p>
                      <strong>Steps:</strong> {selectedTask.executionHistory.length}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label>Insights (Optional)</Label>
                {insights.map((insight, index) => (
                  <div key={index} className="flex gap-2 mt-2">
                    <Textarea
                      placeholder="Enter an insight..."
                      value={insight}
                      onChange={(e) => handleInsightChange(index, e.target.value)}
                      className="flex-1"
                      rows={2}
                    />
                    {insights.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeInsight(index)}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addInsight}
                  className="mt-2"
                >
                  Add Insight
                </Button>
              </div>

              <Button
                onClick={handleLearnFromTask}
                disabled={learnFromTask.isPending || !selectedTask.planId}
                className="w-full"
              >
                {learnFromTask.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Learning from Task...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Learn from Task
                  </>
                )}
              </Button>
            </div>
          )}

          {showSuccess && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Successfully stored learnings from task! Patterns extracted and stored in memory.
              </AlertDescription>
            </Alert>
          )}

          {learnFromTask.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {learnFromTask.error instanceof Error
                  ? learnFromTask.error.message
                  : 'Failed to learn from task'}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </Card>

      {tasksLoading && (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-3 text-sm text-muted-foreground">Loading tasks...</span>
        </div>
      )}

      {!tasksLoading && completedTasks.length === 0 && (
        <Card className="p-6 text-center">
          <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">
            No completed or failed tasks available to learn from.
          </p>
        </Card>
      )}
    </div>
  )
}


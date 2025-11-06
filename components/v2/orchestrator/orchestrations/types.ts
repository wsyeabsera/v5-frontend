export interface ChatMessage {
  id: string
  type: 'user' | 'assistant' | 'system' | 'user_input_required'
  content: string
  data?: any // Original event data
  timestamp: Date
  phase?: string // thought, plan, executing, summary
  pendingInputs?: Array<{ stepId: string; field: string; description?: string }>
  taskId?: string // For resuming tasks
  executionId?: string
  isLoading?: boolean // For streaming messages
}


# Memory System Documentation

## Overview

The Memory System enables persistent learning from all task executions. It stores learnings, patterns, and insights that can be used to improve future decision-making and task execution.

### Purpose

- Persistently store learnings from task executions
- Enable pattern extraction and recognition
- Improve system performance over time
- Provide foundation for other intelligence systems

### Key Features

- Automatic learning from completed tasks
- Pattern storage and retrieval
- Tool performance tracking
- Error pattern recognition
- Success pattern identification

### Use Cases

- Store learnings after task completion
- Extract insights for future reference
- Enable pattern recognition system
- Support benchmark and performance tracking

## MCP Tools Reference

### `learn_from_task`

Store learnings from a completed task execution.

**Tool Name:** `learn_from_task`

**Request Parameters:**

```typescript
interface LearnFromTaskParams {
  taskId: string                    // ID of the completed task
  planId: string                    // ID of the plan that was executed
  status: 'completed' | 'failed'    // Task completion status
  metrics: {
    executionTime: number            // Execution time in milliseconds
    stepsCompleted: number           // Number of steps completed
    retries: number                  // Number of retries needed
    userInputsRequired: number       // Number of user inputs required
  }
  insights?: string[]                // Optional key learnings from this execution
}
```

**Response Format:**

```typescript
interface LearnFromTaskResponse {
  success: boolean
  memoryId?: string                  // ID of stored memory entry
  patternsExtracted?: number         // Number of patterns extracted
  message: string
}
```

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "learn_from_task",
    "arguments": {
      "taskId": "task-123",
      "planId": "plan-456",
      "status": "completed",
      "metrics": {
        "executionTime": 5000,
        "stepsCompleted": 5,
        "retries": 0,
        "userInputsRequired": 1
      },
      "insights": [
        "Tool sequence X worked well for facility creation",
        "High temperature improved plan quality"
      ]
    }
  }
}
```

**Example Response:**

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "result": {
    "success": true,
    "memoryId": "memory-789",
    "patternsExtracted": 3,
    "message": "Successfully stored learnings from task"
  }
}
```

## Query Hooks Specification

### File: `lib/queries-intelligence/memory.ts`

### `useLearnFromTask`

Mutation hook to store learnings from a completed task.

```typescript
export function useLearnFromTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      taskId: string
      planId: string
      status: 'completed' | 'failed'
      metrics: {
        executionTime: number
        stepsCompleted: number
        retries: number
        userInputsRequired: number
      }
      insights?: string[]
    }) => mcpClientIntelligence.learnFromTask(params),
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'memory'] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'tasks', variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'plans', variables.planId] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'patterns'] })
    },
  })
}
```

**Query Key:** `['v2', 'intelligence', 'memory']`

**Invalidation:** Invalidates memory, task, plan, and pattern queries on success

## MCP Client Methods Specification

### File: `lib/mcp-client-intelligence/memory.ts`

```typescript
import { mcpClientV2 } from '../mcp-client-v2'

interface LearnFromTaskParams {
  taskId: string
  planId: string
  status: 'completed' | 'failed'
  metrics: {
    executionTime: number
    stepsCompleted: number
    retries: number
    userInputsRequired: number
  }
  insights?: string[]
}

interface LearnFromTaskResponse {
  success: boolean
  memoryId?: string
  patternsExtracted?: number
  message: string
}

export class MemoryClient {
  /**
   * Store learnings from a completed task execution
   */
  async learnFromTask(params: LearnFromTaskParams): Promise<LearnFromTaskResponse> {
    return mcpClientV2.request('learn_from_task', params)
  }
}

export const memoryClient = new MemoryClient()
```

**Error Handling:**

- Network errors: Throw Error with message
- API errors: Throw Error with error message from response
- Validation errors: Throw Error with validation details

## UI Component Specifications

### File: `components/v2/memory/MemoryPanel.tsx`

**Purpose:** Main panel for memory system operations

**Props:**

```typescript
interface MemoryPanelProps {
  // No props needed - self-contained
}
```

**State Management:**

```typescript
const [taskId, setTaskId] = useState<string>('')
const [selectedTask, setSelectedTask] = useState<any>(null)
```

**Features:**

- Task selector/search to find completed tasks
- Display task execution metrics
- Form to add insights (optional)
- Trigger learning from task
- Display learning results
- Show extracted patterns count

**User Interactions:**

1. Select or search for a completed task
2. Review task execution metrics
3. Optionally add custom insights
4. Click "Learn from Task" button
5. View success message and patterns extracted

### File: `components/v2/memory/MemoryCard.tsx`

**Purpose:** Display memory entry information

**Props:**

```typescript
interface MemoryCardProps {
  memory: {
    id: string
    taskId: string
    planId: string
    status: 'completed' | 'failed'
    metrics: {
      executionTime: number
      stepsCompleted: number
      retries: number
      userInputsRequired: number
    }
    insights?: string[]
    createdAt: string
  }
  onView?: (memoryId: string) => void
}
```

**Display:**

- Task ID and Plan ID
- Status badge
- Execution metrics (time, steps, retries)
- Insights list
- Creation timestamp

### File: `components/v2/memory/MemoryDialog.tsx`

**Purpose:** Detailed view of memory entry

**Props:**

```typescript
interface MemoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memoryId?: string
  taskId?: string
}
```

**Features:**

- Full memory entry details
- Link to related task
- Link to related plan
- Extracted patterns preview
- Metadata (created at, patterns extracted)

## Page Structure

### File: `app/v2/memory/page.tsx`

```typescript
'use client'

import { MemoryPanel } from '@/components/v2/memory/MemoryPanel'
import { Database } from 'lucide-react'

export default function MemoryPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Memory System</h1>
        </div>
        <p className="text-muted-foreground">
          Store and retrieve learnings from task executions. The memory system enables persistent learning and pattern recognition.
        </p>
      </div>

      <MemoryPanel />
    </div>
  )
}
```

**Route:** `/v2/memory`

**Navigation Icon:** `Database` from `lucide-react`

## Implementation Checklist

### Phase 1: Setup

- [ ] Create `lib/queries-intelligence/memory.ts`
- [ ] Create `lib/mcp-client-intelligence/memory.ts`
- [ ] Create `lib/mcp-client-intelligence/index.ts` and export memory client
- [ ] Add memory client to main MCP client exports

### Phase 2: Components

- [ ] Create `components/v2/memory/MemoryPanel.tsx`
- [ ] Create `components/v2/memory/MemoryCard.tsx`
- [ ] Create `components/v2/memory/MemoryDialog.tsx`

### Phase 3: Page

- [ ] Create `app/v2/memory/page.tsx`
- [ ] Add route to navigation sidebar
- [ ] Test page loads correctly

### Phase 4: Integration

- [ ] Integrate with task completion flow
- [ ] Add automatic learning trigger option
- [ ] Test with real task data
- [ ] Verify query invalidation works

### Phase 5: Testing

- [ ] Test with completed tasks
- [ ] Test with failed tasks
- [ ] Test error handling
- [ ] Test query invalidation
- [ ] Test UI interactions

## Dependencies

- `@tanstack/react-query` - For query hooks
- `lib/mcp-client-v2.ts` - Base MCP client
- `components/ui/*` - shadcn/ui components
- `lucide-react` - Icons

## Related Systems

- **Pattern Recognition** - Uses memory data for pattern extraction
- **History Query** - Queries memory for similar tasks
- **Benchmarks** - Uses memory for performance tracking
- **Smart Features** - Uses memory for recommendations


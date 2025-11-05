# History Query System Documentation

## Overview

The History Query System allows querying past task executions to find similar tasks, successful plan patterns, tool performance metrics, and agent insights. This enables learning from history and improving future executions.

### Purpose

- Find similar past tasks for reference
- Discover successful plan patterns
- Check tool performance metrics
- Access agent insights and learnings

### Key Features

- Semantic search for similar tasks
- Success pattern discovery
- Tool performance tracking
- Agent-specific insights
- Pattern-based recommendations

### Use Cases

- Reference successful approaches for similar tasks
- Learn from past failures
- Optimize tool selection based on performance
- Improve plan quality using successful patterns
- Understand agent behavior and insights

## MCP Tools Reference

### `get_similar_tasks`

Find tasks similar to a given query using semantic search.

**Tool Name:** `get_similar_tasks`

**Request Parameters:**

```typescript
interface GetSimilarTasksParams {
  query: string                      // Natural language query to match
  limit?: number                     // Maximum results (default: 10)
  minSimilarity?: number             // Minimum similarity score 0-1 (default: 0.7)
  status?: 'completed' | 'failed'     // Filter by status
}
```

**Response Format:**

```typescript
interface SimilarTask {
  id: string
  query: string                       // Original user query
  goal: string                        // Task goal
  similarityScore: number             // Similarity score 0-1
  status: string
  planId?: string
  executionTime?: number
  stepsCompleted?: number
  createdAt: string
}

interface GetSimilarTasksResponse extends Array<SimilarTask> {}
```

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "get_similar_tasks",
    "arguments": {
      "query": "create facility",
      "limit": 10,
      "minSimilarity": 0.7
    }
  }
}
```

### `get_successful_plans`

Get successful plan patterns for a given goal.

**Tool Name:** `get_successful_plans`

**Request Parameters:**

```typescript
interface GetSuccessfulPlansParams {
  goal: string                        // Goal to match plans against
  limit?: number                      // Maximum results (default: 5)
  minSuccessRate?: number             // Minimum success rate 0-1 (default: 0.8)
}
```

**Response Format:**

```typescript
interface SuccessfulPlan {
  id: string
  goal: string
  successRate: number                 // Success rate 0-1
  usageCount: number                  // How many times used
  averageExecutionTime: number
  steps: Array<{
    stepId: string
    toolName: string
    description: string
  }>
  createdAt: string
  lastUsed: string
}

interface GetSuccessfulPlansResponse extends Array<SuccessfulPlan> {}
```

### `get_tool_performance`

Get performance metrics for a specific tool.

**Tool Name:** `get_tool_performance`

**Request Parameters:**

```typescript
interface GetToolPerformanceParams {
  toolName: string                     // Name of the tool
  context?: string                     // Optional context filter (e.g., "facility_management")
}
```

**Response Format:**

```typescript
interface ToolPerformance {
  toolName: string
  context?: string
  successRate: number                  // Success rate 0-1
  averageDuration: number             // Average duration in ms
  totalCalls: number
  successfulCalls: number
  failedCalls: number
  commonErrors?: Array<{
    error: string
    count: number
  }>
  recommendations?: string[]            // Performance recommendations
}

interface GetToolPerformanceResponse extends ToolPerformance {}
```

### `get_agent_insights`

Get learned insights from a specific agent type.

**Tool Name:** `get_agent_insights`

**Request Parameters:**

```typescript
interface GetAgentInsightsParams {
  agentType: 'thought' | 'planner' | 'executor'  // Agent type
  insightType?: 'patterns' | 'optimizations' | 'warnings'  // Filter by insight type
  limit?: number                                  // Maximum results (default: 10)
}
```

**Response Format:**

```typescript
interface AgentInsight {
  id: string
  agentType: string
  insightType: string
  insight: string                    // The insight text
  confidence: number                 // Confidence score 0-1
  examples?: Array<{
    taskId: string
    context: string
  }>
  createdAt: string
}

interface GetAgentInsightsResponse extends Array<AgentInsight> {}
```

## Query Hooks Specification

### File: `lib/queries-intelligence/history-query.ts`

### `useGetSimilarTasks`

Query hook to find similar tasks.

```typescript
export function useGetSimilarTasks(
  query: string,
  options?: {
    limit?: number
    minSimilarity?: number
    status?: 'completed' | 'failed'
  }
) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'similar-tasks', query, options],
    queryFn: () => mcpClientIntelligence.getSimilarTasks(query, options),
    enabled: !!query && query.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
```

**Query Key:** `['v2', 'intelligence', 'similar-tasks', query, options]`

**Stale Time:** 5 minutes

### `useGetSuccessfulPlans`

Query hook to get successful plans.

```typescript
export function useGetSuccessfulPlans(
  goal: string,
  options?: {
    limit?: number
    minSuccessRate?: number
  }
) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'successful-plans', goal, options],
    queryFn: () => mcpClientIntelligence.getSuccessfulPlans(goal, options),
    enabled: !!goal && goal.length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}
```

**Query Key:** `['v2', 'intelligence', 'successful-plans', goal, options]`

**Stale Time:** 10 minutes

### `useGetToolPerformance`

Query hook to get tool performance.

```typescript
export function useGetToolPerformance(
  toolName: string,
  context?: string
) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'tool-performance', toolName, context],
    queryFn: () => mcpClientIntelligence.getToolPerformance(toolName, context),
    enabled: !!toolName,
    staleTime: 1000 * 60 * 15, // 15 minutes
  })
}
```

**Query Key:** `['v2', 'intelligence', 'tool-performance', toolName, context]`

**Stale Time:** 15 minutes

### `useGetAgentInsights`

Query hook to get agent insights.

```typescript
export function useGetAgentInsights(
  agentType: 'thought' | 'planner' | 'executor',
  options?: {
    insightType?: 'patterns' | 'optimizations' | 'warnings'
    limit?: number
  }
) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'agent-insights', agentType, options],
    queryFn: () => mcpClientIntelligence.getAgentInsights(agentType, options),
    enabled: !!agentType,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}
```

**Query Key:** `['v2', 'intelligence', 'agent-insights', agentType, options]`

**Stale Time:** 10 minutes

## MCP Client Methods Specification

### File: `lib/mcp-client-intelligence/history-query.ts`

```typescript
import { mcpClientV2 } from '../mcp-client-v2'

export class HistoryQueryClient {
  /**
   * Find tasks similar to a given query
   */
  async getSimilarTasks(
    query: string,
    options?: {
      limit?: number
      minSimilarity?: number
      status?: 'completed' | 'failed'
    }
  ): Promise<SimilarTask[]> {
    return mcpClientV2.request('get_similar_tasks', {
      query,
      ...options,
    })
  }

  /**
   * Get successful plan patterns for a goal
   */
  async getSuccessfulPlans(
    goal: string,
    options?: {
      limit?: number
      minSuccessRate?: number
    }
  ): Promise<SuccessfulPlan[]> {
    return mcpClientV2.request('get_successful_plans', {
      goal,
      ...options,
    })
  }

  /**
   * Get performance metrics for a tool
   */
  async getToolPerformance(
    toolName: string,
    context?: string
  ): Promise<ToolPerformance> {
    return mcpClientV2.request('get_tool_performance', {
      toolName,
      context,
    })
  }

  /**
   * Get learned insights from an agent
   */
  async getAgentInsights(
    agentType: 'thought' | 'planner' | 'executor',
    options?: {
      insightType?: 'patterns' | 'optimizations' | 'warnings'
      limit?: number
    }
  ): Promise<AgentInsight[]> {
    return mcpClientV2.request('get_agent_insights', {
      agentType,
      ...options,
    })
  }
}

export const historyQueryClient = new HistoryQueryClient()
```

## UI Component Specifications

### File: `components/v2/history-query/HistoryQueryPanel.tsx`

**Purpose:** Main panel with tabs for different query types

**Props:**

```typescript
interface HistoryQueryPanelProps {
  // No props needed
}
```

**Features:**

- Tabs for: Similar Tasks, Successful Plans, Tool Performance, Agent Insights
- Search/query inputs for each tab
- Results display for each query type
- Filter options
- Loading and error states

### File: `components/v2/history-query/SimilarTasksResults.tsx`

**Purpose:** Display similar tasks search results

**Props:**

```typescript
interface SimilarTasksResultsProps {
  query: string
  limit?: number
  minSimilarity?: number
  onViewTask?: (taskId: string) => void
}
```

**Display:**

- Similarity score badges
- Task query/goal
- Status badges
- Execution metrics
- Creation date
- Click to view task details

### File: `components/v2/history-query/SuccessfulPlansResults.tsx`

**Purpose:** Display successful plan patterns

**Props:**

```typescript
interface SuccessfulPlansResultsProps {
  goal: string
  limit?: number
  onViewPlan?: (planId: string) => void
}
```

**Display:**

- Success rate percentage
- Usage count
- Average execution time
- Plan steps preview
- Last used date
- Click to view full plan

### File: `components/v2/history-query/ToolPerformanceResults.tsx`

**Purpose:** Display tool performance metrics

**Props:**

```typescript
interface ToolPerformanceResultsProps {
  toolName: string
  context?: string
}
```

**Display:**

- Success rate gauge/chart
- Total calls count
- Average duration
- Common errors list
- Recommendations list
- Performance trends (if available)

### File: `components/v2/history-query/AgentInsightsResults.tsx`

**Purpose:** Display agent insights

**Props:**

```typescript
interface AgentInsightsResultsProps {
  agentType: 'thought' | 'planner' | 'executor'
  insightType?: 'patterns' | 'optimizations' | 'warnings'
  limit?: number
}
```

**Display:**

- Insight cards with confidence scores
- Insight type badges
- Example task references
- Created date
- Filter by insight type

## Page Structure

### File: `app/v2/history-query/page.tsx`

```typescript
'use client'

import { HistoryQueryPanel } from '@/components/v2/history-query/HistoryQueryPanel'
import { History } from 'lucide-react'

export default function HistoryQueryPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <History className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">History Query</h1>
        </div>
        <p className="text-muted-foreground">
          Query past executions to find similar tasks, successful plans, tool performance, and agent insights.
        </p>
      </div>

      <HistoryQueryPanel />
    </div>
  )
}
```

**Route:** `/v2/history-query`

**Navigation Icon:** `History` from `lucide-react`

## Implementation Checklist

### Phase 1: Setup

- [ ] Create `lib/queries-intelligence/history-query.ts`
- [ ] Create `lib/mcp-client-intelligence/history-query.ts`
- [ ] Export history query client from index

### Phase 2: Components

- [ ] Create `components/v2/history-query/HistoryQueryPanel.tsx`
- [ ] Create `components/v2/history-query/SimilarTasksResults.tsx`
- [ ] Create `components/v2/history-query/SuccessfulPlansResults.tsx`
- [ ] Create `components/v2/history-query/ToolPerformanceResults.tsx`
- [ ] Create `components/v2/history-query/AgentInsightsResults.tsx`

### Phase 3: Page

- [ ] Create `app/v2/history-query/page.tsx`
- [ ] Add route to navigation sidebar
- [ ] Test all query types

### Phase 4: Integration

- [ ] Add links to task details from similar tasks
- [ ] Add links to plan details from successful plans
- [ ] Integrate with tool list for performance viewing
- [ ] Test with real data

### Phase 5: Testing

- [ ] Test similar tasks search
- [ ] Test successful plans query
- [ ] Test tool performance query
- [ ] Test agent insights query
- [ ] Test error handling
- [ ] Test loading states
- [ ] Test empty states

## Dependencies

- `@tanstack/react-query` - For query hooks
- `lib/mcp-client-v2.ts` - Base MCP client
- `components/ui/*` - shadcn/ui components (Tabs, Card, Badge, etc.)
- `lucide-react` - Icons

## Related Systems

- **Memory System** - Provides data for history queries
- **Pattern Recognition** - Uses history data for pattern extraction
- **Smart Features** - Uses history for recommendations
- **Benchmarks** - Uses history for performance tracking


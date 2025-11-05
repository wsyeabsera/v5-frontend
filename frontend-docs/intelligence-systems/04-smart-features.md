# Smart Features Documentation

## Overview

Smart Features provide predictive optimization and recommendations to improve agent performance, plan quality, and cost efficiency. These features use machine learning and historical data to provide intelligent suggestions.

### Purpose

- Predict plan quality before execution
- Recommend optimal tools for tasks
- Automatically refine failed plans
- Track and optimize costs
- Provide intelligent recommendations

### Key Features

- Plan quality prediction
- Tool recommendations
- Automatic plan refinement
- Cost tracking and optimization
- Predictive analytics

### Use Cases

- Predict if a plan will succeed before running it
- Get tool recommendations for specific actions
- Automatically improve plans that failed
- Track token usage and API costs
- Optimize plans to reduce costs
- Get intelligent suggestions for improvements

## MCP Tools Reference

### `predict_plan_quality`

Predict the success probability and quality of a plan before execution.

**Tool Name:** `predict_plan_quality`

**Request Parameters:**

```typescript
interface PredictPlanQualityParams {
  planId: string                     // Plan ID to predict
}
```

**Response Format:**

```typescript
interface PlanQualityPrediction {
  planId: string
  successProbability: number         // 0-1 probability of success
  qualityScore: number               // 0-100 quality score
  estimatedDuration: number          // Estimated duration in ms
  estimatedCost?: number              // Estimated cost in USD
  confidence: number                 // Confidence in prediction 0-1
  risks: Array<{
    risk: string                      // Risk description
    severity: 'low' | 'medium' | 'high'
  }>
  recommendations?: string[]          // Recommendations for improvement
}

interface PredictPlanQualityResponse extends PlanQualityPrediction {}
```

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "predict_plan_quality",
    "arguments": {
      "planId": "plan-123"
    }
  }
}
```

### `get_tool_recommendations`

Get optimized tool recommendations for a required action.

**Tool Name:** `get_tool_recommendations`

**Request Parameters:**

```typescript
interface GetToolRecommendationsParams {
  requiredAction: string             // Action to perform (natural language)
  context?: string                   // Optional context (e.g., "facility_management")
}
```

**Response Format:**

```typescript
interface ToolRecommendation {
  toolName: string
  description: string
  confidence: number                  // Confidence score 0-1
  reason: string                      // Why this tool is recommended
  successRate?: number                // Historical success rate
  averageDuration?: number            // Average duration in ms
}

interface GetToolRecommendationsResponse extends Array<ToolRecommendation> {}
```

### `refine_plan`

Automatically improve a failed plan based on failure reason.

**Tool Name:** `refine_plan`

**Request Parameters:**

```typescript
interface RefinePlanParams {
  planId: string                      // Plan ID to refine
  failureReason: string               // Why the plan failed
}
```

**Response Format:**

```typescript
interface RefinedPlan {
  originalPlanId: string
  refinedPlanId: string              // ID of the new refined plan
  changes: Array<{
    stepId: string
    change: string                    // Description of change
    reason: string                    // Why this change was made
  }>
  confidence: number                  // Confidence in improvements 0-1
  predictedImprovement: {
    successProbability: number
    estimatedDuration: number
  }
}

interface RefinePlanResponse extends RefinedPlan {}
```

### `track_cost`

Track token usage and API costs for a task.

**Tool Name:** `track_cost`

**Request Parameters:**

```typescript
interface TrackCostParams {
  taskId: string                      // Task ID to track
}
```

**Response Format:**

```typescript
interface CostTracking {
  taskId: string
  planId: string
  agentConfigId: string
  totalTokens: number
  promptTokens: number
  completionTokens: number
  cost: number                        // Cost in USD
  costBreakdown: Array<{
    stepId: string
    toolName?: string
    tokens: number
    cost: number
  }>
  timestamp: string
}

interface TrackCostResponse extends CostTracking {}
```

### `optimize_cost`

Optimize a plan to reduce costs while maintaining quality.

**Tool Name:** `optimize_cost`

**Request Parameters:**

```typescript
interface OptimizeCostParams {
  planId: string                      // Plan ID to optimize
}
```

**Response Format:**

```typescript
interface CostOptimization {
  originalPlanId: string
  optimizedPlanId: string             // ID of optimized plan
  estimatedSavings: number            // Estimated cost savings in USD
  savingsPercentage: number           // Percentage savings
  changes: Array<{
    stepId: string
    change: string                    // Description of optimization
    estimatedSavings: number
  }>
  qualityImpact: {
    predictedQuality: number          // Predicted quality after optimization
    qualityChange: number             // Change in quality (can be negative)
  }
}

interface OptimizeCostResponse extends CostOptimization {}
```

## Query Hooks Specification

### File: `lib/queries-intelligence/smart-features.ts`

### `usePredictPlanQuality`

Query hook to predict plan quality.

```typescript
export function usePredictPlanQuality(planId: string) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'plan-quality', planId],
    queryFn: () => mcpClientIntelligence.predictPlanQuality(planId),
    enabled: !!planId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
```

**Query Key:** `['v2', 'intelligence', 'plan-quality', planId]`

**Stale Time:** 5 minutes

### `useGetToolRecommendations`

Query hook to get tool recommendations.

```typescript
export function useGetToolRecommendations(
  requiredAction: string,
  context?: string
) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'tool-recommendations', requiredAction, context],
    queryFn: () => mcpClientIntelligence.getToolRecommendations(requiredAction, context),
    enabled: !!requiredAction && requiredAction.length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}
```

**Query Key:** `['v2', 'intelligence', 'tool-recommendations', requiredAction, context]`

**Stale Time:** 10 minutes

### `useRefinePlan`

Mutation hook to refine a plan.

```typescript
export function useRefinePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { planId: string; failureReason: string }) =>
      mcpClientIntelligence.refinePlan(params.planId, params.failureReason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'plans'] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'plans', variables.planId] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'plan-quality'] })
    },
  })
}
```

### `useTrackCost`

Query hook to track costs.

```typescript
export function useTrackCost(taskId: string) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'cost-tracking', taskId],
    queryFn: () => mcpClientIntelligence.trackCost(taskId),
    enabled: !!taskId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
```

**Query Key:** `['v2', 'intelligence', 'cost-tracking', taskId]`

**Stale Time:** 5 minutes

### `useOptimizeCost`

Mutation hook to optimize plan costs.

```typescript
export function useOptimizeCost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (planId: string) => mcpClientIntelligence.optimizeCost(planId),
    onSuccess: (_, planId) => {
      queryClient.invalidateQueries({ queryKey: ['v2', 'plans'] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'plans', planId] })
      queryClient.invalidateQueries({ queryKey: ['v2', 'intelligence', 'plan-quality'] })
    },
  })
}
```

## MCP Client Methods Specification

### File: `lib/mcp-client-intelligence/smart-features.ts`

```typescript
import { mcpClientV2 } from '../mcp-client-v2'

export class SmartFeaturesClient {
  /**
   * Predict plan quality before execution
   */
  async predictPlanQuality(planId: string): Promise<PlanQualityPrediction> {
    return mcpClientV2.request('predict_plan_quality', { planId })
  }

  /**
   * Get tool recommendations for an action
   */
  async getToolRecommendations(
    requiredAction: string,
    context?: string
  ): Promise<ToolRecommendation[]> {
    return mcpClientV2.request('get_tool_recommendations', {
      requiredAction,
      context,
    })
  }

  /**
   * Automatically refine a failed plan
   */
  async refinePlan(planId: string, failureReason: string): Promise<RefinedPlan> {
    return mcpClientV2.request('refine_plan', {
      planId,
      failureReason,
    })
  }

  /**
   * Track costs for a task
   */
  async trackCost(taskId: string): Promise<CostTracking> {
    return mcpClientV2.request('track_cost', { taskId })
  }

  /**
   * Optimize plan costs
   */
  async optimizeCost(planId: string): Promise<CostOptimization> {
    return mcpClientV2.request('optimize_cost', { planId })
  }
}

export const smartFeaturesClient = new SmartFeaturesClient()
```

## UI Component Specifications

### File: `components/v2/smart-features/SmartFeaturesPanel.tsx`

**Purpose:** Main panel with tabs for different smart features

**Props:**

```typescript
interface SmartFeaturesPanelProps {
  // No props needed
}
```

**Features:**

- Tabs: Plan Quality, Tool Recommendations, Plan Refinement, Cost Tracking, Cost Optimization
- Each tab has its own interface
- Results display for predictions and recommendations

### File: `components/v2/smart-features/PlanQualityPrediction.tsx`

**Purpose:** Display plan quality prediction

**Props:**

```typescript
interface PlanQualityPredictionProps {
  planId: string
  onViewPlan?: (planId: string) => void
}
```

**Display:**

- Success probability gauge/chart
- Quality score (0-100)
- Estimated duration
- Estimated cost
- Confidence indicator
- Risk list with severity
- Recommendations list
- Link to view plan

### File: `components/v2/smart-features/ToolRecommendations.tsx`

**Purpose:** Display tool recommendations

**Props:**

```typescript
interface ToolRecommendationsProps {
  requiredAction: string
  context?: string
  onSelectTool?: (toolName: string) => void
}
```

**Display:**

- Recommendations list sorted by confidence
- Confidence scores
- Tool descriptions
- Success rates
- Average durations
- Reasons for recommendation
- Click to select tool

### File: `components/v2/smart-features/PlanRefinement.tsx`

**Purpose:** Refine a failed plan

**Props:**

```typescript
interface PlanRefinementProps {
  planId: string
  failureReason?: string
  onRefined?: (refinedPlanId: string) => void
}
```

**Features:**

- Plan selector
- Failure reason input
- Refine button
- Display refined plan changes
- Show predicted improvements
- Confidence indicator
- Accept/reject refined plan

### File: `components/v2/smart-features/CostTracking.tsx`

**Purpose:** Display cost tracking information

**Props:**

```typescript
interface CostTrackingProps {
  taskId: string
}
```

**Display:**

- Total cost
- Token usage breakdown
- Cost breakdown by step
- Charts for visualization
- Cost per tool
- Cost trends

### File: `components/v2/smart-features/CostOptimization.tsx`

**Purpose:** Optimize plan costs

**Props:**

```typescript
interface CostOptimizationProps {
  planId: string
  onOptimized?: (optimizedPlanId: string) => void
}
```

**Features:**

- Plan selector
- Optimize button
- Display estimated savings
- Show optimization changes
- Quality impact indicator
- Accept/reject optimized plan

## Page Structure

### File: `app/v2/smart-features/page.tsx`

```typescript
'use client'

import { SmartFeaturesPanel } from '@/components/v2/smart-features/SmartFeaturesPanel'
import { Sparkles } from 'lucide-react'

export default function SmartFeaturesPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Smart Features</h1>
        </div>
        <p className="text-muted-foreground">
          Predictive optimization and recommendations. Predict plan quality, get tool recommendations, refine plans, and optimize costs.
        </p>
      </div>

      <SmartFeaturesPanel />
    </div>
  )
}
```

**Route:** `/v2/smart-features`

**Navigation Icon:** `Sparkles` from `lucide-react`

## Implementation Checklist

### Phase 1: Setup

- [ ] Create `lib/queries-intelligence/smart-features.ts`
- [ ] Create `lib/mcp-client-intelligence/smart-features.ts`
- [ ] Export smart features client from index

### Phase 2: Components

- [ ] Create `components/v2/smart-features/SmartFeaturesPanel.tsx`
- [ ] Create `components/v2/smart-features/PlanQualityPrediction.tsx`
- [ ] Create `components/v2/smart-features/ToolRecommendations.tsx`
- [ ] Create `components/v2/smart-features/PlanRefinement.tsx`
- [ ] Create `components/v2/smart-features/CostTracking.tsx`
- [ ] Create `components/v2/smart-features/CostOptimization.tsx`

### Phase 3: Page

- [ ] Create `app/v2/smart-features/page.tsx`
- [ ] Add route to navigation sidebar
- [ ] Test all features

### Phase 4: Integration

- [ ] Integrate plan quality prediction with plan list
- [ ] Add tool recommendations to tool selection
- [ ] Add plan refinement to failed plans
- [ ] Add cost tracking to task views
- [ ] Add cost optimization to plan views

### Phase 5: Testing

- [ ] Test plan quality prediction
- [ ] Test tool recommendations
- [ ] Test plan refinement
- [ ] Test cost tracking
- [ ] Test cost optimization
- [ ] Test error handling
- [ ] Test loading states

## Dependencies

- `@tanstack/react-query` - For query hooks
- `lib/mcp-client-v2.ts` - Base MCP client
- `components/ui/*` - shadcn/ui components
- `recharts` or similar - For charts (optional)
- `lucide-react` - Icons

## Related Systems

- **History Query** - Uses historical data for predictions
- **Benchmarks** - Uses benchmarks for cost optimization
- **Memory System** - Uses memory for recommendations
- **Pattern Recognition** - Uses patterns for tool recommendations


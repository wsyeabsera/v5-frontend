# Agent Implementation Blueprint 09: Reflection Agent

## Overview

The **Reflection Agent** analyzes what worked and what didn't after execution. It enables learning and improvement by updating tool memory and informing future reasoning.

**Key Responsibilities:**
- Analyze execution results
- Identify what worked and what didn't
- Update tool memory with successful patterns
- Generate learning insights
- Inform future reasoning

## Prerequisites

- **AGENT-01** (Request ID System)
- Execution results from plan execution
- Tool memory system (see AGENT-10 for integration)

## Step-by-Step Implementation

### Step 1: Add Reflection Types

Add to `types/index.ts`:

```typescript
/**
 * Execution Result - Result of executing a plan step
 */
export interface ExecutionResult {
  stepId: string;
  success: boolean;
  outcome: any;
  error?: string;
  duration?: number;
  timestamp: Date;
}

/**
 * Reflection Output
 */
export interface ReflectionAgentOutput extends AgentOutput {
  overallSuccess: boolean;
  successRate: number; // 0.0-1.0
  insights: string[];
  lessonsLearned: string[];
  toolMemoryUpdates: Array<{
    toolName: string;
    parameters: Record<string, any>;
    success: boolean;
  }>;
  recommendations: string[];
}
```

### Step 2: Implement Reflection Agent

Create `lib/agents/reflection-agent.ts`:

```typescript
import { BaseAgent } from './base-agent';
import { Plan, ExecutionResult, ReflectionAgentOutput, RequestContext } from '@/types';
import { addAgentToChain } from '@/lib/utils/request-id';

/**
 * Reflection Agent
 * 
 * Analyzes execution results and learns from them.
 * This enables the system to improve over time.
 */
export class ReflectionAgent extends BaseAgent {
  private readonly systemPrompt = `You are a Reflection Agent - you learn from execution results.

Your job is to:
1. Analyze what worked and what didn't
2. Extract lessons learned
3. Identify patterns for future use
4. Suggest improvements
5. Update knowledge for better future reasoning

Think like a project retrospective facilitator.`;

  /**
   * Reflect on execution results
   */
  async reflectOnExecution(
    plan: Plan,
    executionResults: ExecutionResult[],
    requestContext: RequestContext
  ): Promise<ReflectionAgentOutput> {
    const updatedContext = addAgentToChain(requestContext, 'reflection-agent');

    const prompt = this.buildReflectionPrompt(plan, executionResults);

    const messages = [
      { role: 'system' as const, content: this.systemPrompt },
      { role: 'user' as const, content: prompt },
    ];

    const response = await this.callLLM(messages, {
      temperature: 0.5,
      maxTokens: 2000,
    });

    const overallSuccess = this.calculateOverallSuccess(executionResults);
    const successRate = this.calculateSuccessRate(executionResults);
    const insights = this.extractInsights(response);
    const lessonsLearned = this.extractLessons(response);
    const toolMemoryUpdates = this.extractToolMemoryUpdates(plan, executionResults);
    const recommendations = this.extractRecommendations(response);

    return {
      requestId: updatedContext.requestId,
      agentName: 'reflection-agent',
      timestamp: new Date(),
      requestContext: updatedContext,
      overallSuccess,
      successRate,
      insights,
      lessonsLearned,
      toolMemoryUpdates,
      recommendations,
    };
  }

  private buildReflectionPrompt(plan: Plan, results: ExecutionResult[]): string {
    return `Plan Executed:
GOAL: ${plan.goal}

STEPS:
${plan.steps.map(s => `${s.order}. ${s.description} (${s.action})`).join('\n')}

Execution Results:
${results.map(r => 
  `Step ${r.stepId}: ${r.success ? 'SUCCESS' : 'FAILED'}
   Outcome: ${JSON.stringify(r.outcome)}
   ${r.error ? `Error: ${r.error}` : ''}`
).join('\n\n')}

Reflect on this execution. Provide:

INSIGHTS:
- [Key insight 1]
- [Key insight 2]

LESSONS_LEARNED:
- [Lesson 1]
- [Lesson 2]

RECOMMENDATIONS:
- [Recommendation 1]`;
  }

  private calculateOverallSuccess(results: ExecutionResult[]): boolean {
    return results.every(r => r.success);
  }

  private calculateSuccessRate(results: ExecutionResult[]): number {
    if (results.length === 0) return 0;
    const successes = results.filter(r => r.success).length;
    return successes / results.length;
  }

  private extractInsights(response: string): string[] {
    return this.extractList(response, 'INSIGHTS');
  }

  private extractLessons(response: string): string[] {
    return this.extractList(response, 'LESSONS_LEARNED');
  }

  private extractToolMemoryUpdates(plan: Plan, results: ExecutionResult[]): Array<{
    toolName: string;
    parameters: Record<string, any>;
    success: boolean;
  }> {
    // Extract tool usage from plan steps and results
    return plan.steps
      .filter(step => step.action !== 'unknown')
      .map(step => {
        const result = results.find(r => r.stepId === step.id);
        return {
          toolName: step.action,
          parameters: step.parameters || {},
          success: result?.success ?? false,
        };
      });
  }

  private extractRecommendations(response: string): string[] {
    return this.extractList(response, 'RECOMMENDATIONS');
  }
}
```

### Step 3: Create API Route

Create `app/api/agents/reflection-agent/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ReflectionAgent } from '@/lib/agents/reflection-agent';
import { Plan, ExecutionResult, RequestContext } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plan, executionResults, requestContext, apiKey, modelId } = body;

    if (!plan) return NextResponse.json({ error: 'plan required' }, { status: 400 });
    if (!Array.isArray(executionResults)) {
      return NextResponse.json({ error: 'executionResults array required' }, { status: 400 });
    }
    if (!requestContext?.requestId) {
      return NextResponse.json({ error: 'requestContext required' }, { status: 400 });
    }

    const agent = new ReflectionAgent(apiKey, modelId);
    const result = await agent.reflectOnExecution(plan, executionResults, requestContext);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to reflect on execution' },
      { status: 500 }
    );
  }
}
```

## Pinecone Schema

```typescript
interface ReflectionPineconeMetadata {
  requestId: string;
  agentName: 'reflection-agent';
  agentChain: string[];
  overallSuccess: boolean;
  successRate: number;
  insightCount: number;
  lessonCount: number;
  toolUpdateCount: number;
  timestamp: string;
}
```

## Request ID Integration

```typescript
const updatedContext = addAgentToChain(requestContext, 'reflection-agent');
```

## Tool Memory Integration

Reflection Agent should update Tool Memory:

```typescript
// After reflection, update tool memory
for (const update of result.toolMemoryUpdates) {
  if (update.success) {
    await toolMemory.rememberSuccess(
      update.toolName,
      update.parameters,
      context,
      'success'
    );
  }
}
```

## Testing

Create `lib/agents/reflection-agent.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ReflectionAgent } from './reflection-agent';
import { generateRequestId } from '@/lib/utils/request-id';
import { Plan, ExecutionResult } from '@/types';

describe('ReflectionAgent', () => {
  const agent = new ReflectionAgent('test-key', 'claude-sonnet');

  it('should reflect on execution', async () => {
    const requestContext = generateRequestId();
    const plan: Plan = {
      id: 'plan-1',
      goal: 'Test goal',
      steps: [],
      estimatedComplexity: 0.3,
      confidence: 0.8,
      dependencies: [],
      createdAt: new Date(),
    };
    const results: ExecutionResult[] = [];

    const result = await agent.reflectOnExecution(plan, results, requestContext);

    expect(result.requestId).toBe(requestContext.requestId);
    expect(result.successRate).toBeGreaterThanOrEqual(0);
    expect(result.successRate).toBeLessThanOrEqual(1);
  });
});
```

## Next Blueprint

**AGENT-10-PINECONE-INTEGRATION.md** - Central Pinecone integration guide.


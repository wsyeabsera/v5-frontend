# Agent Implementation Blueprint 04: Planner Agent

## Overview

The **Planner Agent** converts reasoning thoughts into structured, executable action plans. It receives the Request ID from the Thought Agent and creates a step-by-step plan that can be executed.

**Key Responsibilities:**
- Convert thoughts into actionable plans
- Break down goals into ordered steps
- Identify dependencies between steps
- Specify tool calls and parameters
- Handle plan refinement based on feedback

## Prerequisites

- **AGENT-01** (Request ID System)
- **AGENT-03** (Thought Agent) - Provides thoughts to plan from
- Base Agent class (`lib/agents/base-agent.ts`)
- Understanding of task decomposition

## Step-by-Step Implementation

### Step 1: Add Plan Types

Add to `types/index.ts`:

```typescript
/**
 * Plan Step - Individual step in an action plan
 */
export interface PlanStep {
  id: string; // Unique step ID
  order: number; // Execution order (1, 2, 3, ...)
  description: string; // What this step does
  action: string; // Tool name or action type
  parameters?: Record<string, any>; // Parameters for the action
  expectedOutcome: string; // What should happen
  dependencies?: string[]; // IDs of steps that must complete first
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

/**
 * Plan - Complete action plan with steps
 */
export interface Plan {
  id: string;
  goal: string; // Overall goal statement
  steps: PlanStep[];
  estimatedComplexity: number; // 0-1
  confidence: number; // 0-1
  dependencies: string[]; // Overall plan dependencies
  createdAt: Date;
}

/**
 * Planner Agent Output
 */
export interface PlannerAgentOutput extends AgentOutput {
  plan: Plan;
  alternativePlans?: Plan[]; // Alternative approaches if applicable
  rationale: string; // Why this plan will work
  basedOnThoughts: string[]; // IDs of thoughts this plan is based on
}
```

### Step 2: Implement Planner Agent

Create `lib/agents/planner-agent.ts`:

```typescript
import { BaseAgent } from './base-agent';
import { Thought, Plan, PlanStep, PlannerAgentOutput, RequestContext } from '@/types';
import { addAgentToChain } from '@/lib/utils/request-id';

/**
 * Planner Agent
 * 
 * Converts reasoning thoughts into structured, executable plans.
 * Think of this as the "project manager" breaking down work.
 * 
 * How it works:
 * 1. Receives thoughts from Thought Agent (with Request ID)
 * 2. Uses LLM to generate structured plan
 * 3. Parses plan into ordered steps with dependencies
 * 4. Validates plan structure
 * 5. Returns plan with Request ID for chaining
 */
export class PlannerAgent extends BaseAgent {
  private readonly systemPrompt = `You are a Planner Agent - your job is to convert reasoning thoughts into structured, executable action plans.

Create detailed plans with:
1. Clear goal statement
2. Ordered steps with dependencies
3. Specific tool calls where needed
4. Expected outcomes for each step
5. Proper sequencing (consider dependencies)

Format your plans clearly in this structure:

GOAL: [Clear statement of the objective]

STEPS:
1. [Step description]
   Action: [tool name or action]
   Parameters: {key: value}
   Expected: [what should happen]
   Depends on: [step numbers if any]

2. [Next step]
   ...

RATIONALE: [Why this plan will work]`;

  /**
   * Generate a plan from thoughts
   * 
   * @param thoughts - Thoughts from Thought Agent
   * @param userQuery - Original user query
   * @param availableTools - Tools available for use
   * @param requestContext - Request ID context
   * @returns PlannerAgentOutput with structured plan
   */
  async generatePlan(
    thoughts: Thought[],
    userQuery: string,
    availableTools: string[],
    requestContext: RequestContext
  ): Promise<PlannerAgentOutput> {
    // Add to chain
    const updatedContext = addAgentToChain(requestContext, 'planner-agent');

    // Build planning prompt
    const prompt = this.buildPlanningPrompt(thoughts, userQuery, availableTools);

    // Call LLM
    const messages = [
      { role: 'system' as const, content: this.systemPrompt },
      { role: 'user' as const, content: prompt },
    ];

    const response = await this.callLLM(messages, {
      temperature: 0.5, // More structured, less creative
      maxTokens: 2000,
    });

    // Parse plan
    const plan = this.parsePlanResponse(response, userQuery, thoughts);
    const rationale = this.extractSection(response, 'RATIONALE') || 'Plan created based on reasoning.';

    return {
      requestId: updatedContext.requestId,
      agentName: 'planner-agent',
      timestamp: new Date(),
      requestContext: updatedContext,
      plan,
      rationale,
      basedOnThoughts: thoughts.map(t => t.id),
    };
  }

  /**
   * Refine an existing plan based on feedback
   * 
   * When a plan is criticized or needs improvement, this method refines it.
   * 
   * @param originalPlan - Plan to refine
   * @param feedback - Feedback from Critic Agent or user
   * @param requestContext - Request ID context
   * @returns Refined plan
   */
  async refinePlan(
    originalPlan: Plan,
    feedback: {
      issues?: string[];
      newRequirements?: string[];
    },
    requestContext: RequestContext
  ): Promise<PlannerAgentOutput> {
    const updatedContext = addAgentToChain(requestContext, 'planner-agent');

    const prompt = `Original Plan:
${this.formatPlanForPrompt(originalPlan)}

Feedback/Issues:
${feedback.issues?.join('\n') || 'None'}

New Requirements:
${feedback.newRequirements?.join('\n') || 'None'}

Refine this plan. Fix issues. Incorporate new requirements.`;

    const messages = [
      { role: 'system' as const, content: this.systemPrompt },
      { role: 'user' as const, content: prompt },
    ];

    const response = await this.callLLM(messages, {
      temperature: 0.4,
      maxTokens: 2000,
    });

    const plan = this.parsePlanResponse(response, originalPlan.goal);
    const rationale = this.extractSection(response, 'RATIONALE') || 'Plan refined based on feedback.';

    return {
      requestId: updatedContext.requestId,
      agentName: 'planner-agent',
      timestamp: new Date(),
      requestContext: updatedContext,
      plan,
      rationale,
      basedOnThoughts: [],
    };
  }

  /**
   * Build planning prompt
   */
  private buildPlanningPrompt(
    thoughts: Thought[],
    userQuery: string,
    availableTools: string[]
  ): string {
    const primaryThought = thoughts[thoughts.length - 1]; // Use most recent

    return `User Query: ${userQuery}

Thought Agent Reasoning:
${primaryThought.reasoning}

Approaches Considered:
${primaryThought.approaches.join('\n')}

Constraints:
${primaryThought.constraints.join('\n')}

Available Tools: ${availableTools.join(', ')}

Create a detailed action plan in the required format.`;
  }

  /**
   * Parse LLM response into Plan object
   */
  private parsePlanResponse(
    response: string,
    goal: string,
    thoughts?: Thought[]
  ): Plan {
    const goalMatch = this.extractSection(response, 'GOAL');
    const stepsText = this.extractSection(response, 'STEPS');
    const steps = this.parseSteps(stepsText || response);

    // Calculate confidence from thoughts if available
    const baseConfidence = thoughts?.length
      ? thoughts.reduce((sum, t) => sum + t.confidence, 0) / thoughts.length
      : 0.7;

    return {
      id: `plan-${Date.now()}`,
      goal: goalMatch || goal,
      steps,
      estimatedComplexity: this.estimateComplexity(steps),
      confidence: baseConfidence * 0.9, // Slightly lower than thought confidence
      dependencies: this.extractDependencies(steps),
      createdAt: new Date(),
    };
  }

  /**
   * Parse steps from text
   */
  private parseSteps(stepsText: string): PlanStep[] {
    // Match step patterns
    const stepRegex = /(\d+)\.\s*([^\n]+)(?:\n\s*Action:\s*([^\n]+))?(?:\n\s*Parameters:\s*([^\n]+))?(?:\n\s*Expected:\s*([^\n]+))?(?:\n\s*Depends on:\s*([^\n]+))?/gi;
    const matches = Array.from(stepsText.matchAll(stepRegex));

    return matches.map((match, index) => {
      const order = parseInt(match[1]) || index + 1;
      const description = match[2]?.trim() || '';
      const action = match[3]?.trim() || 'unknown';
      const parametersText = match[4]?.trim();
      const expectedOutcome = match[5]?.trim() || 'Success';
      const dependenciesText = match[6]?.trim();

      let parameters: Record<string, any> = {};
      if (parametersText) {
        try {
          parameters = JSON.parse(parametersText);
        } catch {
          parameters = { value: parametersText };
        }
      }

      const dependencies = dependenciesText
        ? dependenciesText.split(',').map(d => `step-${d.trim()}`)
        : [];

      return {
        id: `step-${order}`,
        order,
        description,
        action,
        parameters,
        expectedOutcome,
        dependencies,
        status: 'pending' as const,
      };
    });
  }

  private extractDependencies(steps: PlanStep[]): string[] {
    const deps = new Set<string>();
    steps.forEach(step => {
      step.dependencies?.forEach(dep => deps.add(dep));
    });
    return Array.from(deps);
  }

  private estimateComplexity(steps: PlanStep[]): number {
    return Math.min(1, steps.length / 10);
  }

  private formatPlanForPrompt(plan: Plan): string {
    return `GOAL: ${plan.goal}

STEPS:
${plan.steps.map(s => `${s.order}. ${s.description}
   Action: ${s.action}
   Expected: ${s.expectedOutcome}`).join('\n')}`;
  }
}
```

### Step 3: Create API Route

Create `app/api/agents/planner-agent/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PlannerAgent } from '@/lib/agents/planner-agent';
import { Thought, RequestContext } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      thoughts,
      userQuery,
      availableTools = [],
      requestContext,
      apiKey,
      modelId,
    } = body;

    if (!thoughts || !Array.isArray(thoughts)) {
      return NextResponse.json({ error: 'thoughts array required' }, { status: 400 });
    }
    if (!requestContext?.requestId) {
      return NextResponse.json({ error: 'requestContext with requestId required' }, { status: 400 });
    }

    const agent = new PlannerAgent(apiKey, modelId);
    const result = await agent.generatePlan(thoughts, userQuery, availableTools, requestContext);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to generate plan' },
      { status: 500 }
    );
  }
}
```

### Step 4: Create Agent Page

Create `app/agents/planner-agent/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { PlannerAgentOutput, Thought, RequestContext } from '@/types';
import { useStore } from '@/lib/store';

export default function PlannerAgentPage() {
  const { selectedModel, apiKeys } = useStore();
  const [userQuery, setUserQuery] = useState('');
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [requestContext, setRequestContext] = useState<RequestContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlannerAgentOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateThoughts = async () => {
    // Generate thoughts first (or receive from Thought Agent page)
    const response = await fetch('/api/agents/complexity-detector', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userQuery }),
    });
    const complexityData = await response.json();

    const thoughtResponse = await fetch('/api/agents/thought-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userQuery,
        requestContext: complexityData.requestContext,
        apiKey: apiKeys.anthropic || apiKeys.openai || apiKeys.google || '',
        modelId: selectedModel,
      }),
    });
    const thoughtData = await thoughtResponse.json();
    setThoughts(thoughtData.thoughts);
    setRequestContext(thoughtData.requestContext);
  };

  const handleGeneratePlan = async () => {
    if (!thoughts.length || !requestContext) {
      setError('Please generate thoughts first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiKey = apiKeys.anthropic || apiKeys.openai || apiKeys.google || '';
      const response = await fetch('/api/agents/planner-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thoughts,
          userQuery,
          availableTools: [], // TODO: Fetch from MCP
          requestContext,
          apiKey,
          modelId: selectedModel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate plan');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-2">Planner Agent</h1>
      <p className="text-muted-foreground mb-8">
        Convert reasoning thoughts into structured action plans
      </p>

      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Input</h2>
        <Textarea
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          placeholder="Enter a user query..."
          className="min-h-[100px] mb-4"
        />
        <div className="flex gap-2">
          <Button onClick={handleGenerateThoughts} variant="outline">
            Generate Thoughts
          </Button>
          <Button onClick={handleGeneratePlan} disabled={loading || !thoughts.length}>
            {loading ? 'Planning...' : 'Generate Plan'}
          </Button>
        </div>
      </Card>

      {error && (
        <Card className="p-6 mb-6 border-red-500 bg-red-50 dark:bg-red-950">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </Card>
      )}

      {result && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Plan Goal</h2>
            <p>{result.plan.goal}</p>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Steps</h2>
            <div className="space-y-4">
              {result.plan.steps.map((step) => (
                <div key={step.id} className="border-l-4 border-primary pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold">Step {step.order}</span>
                    <span className="text-sm text-muted-foreground">
                      Action: {step.action}
                    </span>
                  </div>
                  <p className="mb-2">{step.description}</p>
                  <p className="text-sm text-muted-foreground">
                    Expected: {step.expectedOutcome}
                  </p>
                  {step.dependencies && step.dependencies.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Depends on: {step.dependencies.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Rationale</h2>
            <p>{result.rationale}</p>
          </Card>
        </div>
      )}
    </div>
  );
}
```

## Pinecone Schema

```typescript
interface PlanPineconeMetadata {
  requestId: string;
  agentName: 'planner-agent';
  agentChain: string[];
  content: string; // Plan goal + steps description
  userQuery: string;
  goal: string;
  stepCount: number;
  complexity: number;
  confidence: number;
  rationale: string;
  timestamp: string;
}
```

## Request ID Integration

Planner Agent receives and propagates Request ID:

```typescript
const updatedContext = addAgentToChain(requestContext, 'planner-agent');
return {
  requestId: updatedContext.requestId, // Same ID from chain start
  // ...
};
```

## Testing

Create `lib/agents/planner-agent.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { PlannerAgent } from './planner-agent';
import { generateRequestId } from '@/lib/utils/request-id';

describe('PlannerAgent', () => {
  const agent = new PlannerAgent('test-key', 'claude-sonnet');

  it('should generate plan from thoughts', async () => {
    const requestContext = generateRequestId();
    const thoughts: Thought[] = [{
      id: 'thought-1',
      timestamp: new Date(),
      reasoning: 'Test reasoning',
      approaches: ['Approach 1'],
      constraints: [],
      assumptions: [],
      uncertainties: [],
      confidence: 0.8,
    }];

    const result = await agent.generatePlan(
      thoughts,
      'List facilities',
      ['list_facilities'],
      requestContext
    );

    expect(result.requestId).toBe(requestContext.requestId);
    expect(result.plan.steps.length).toBeGreaterThan(0);
  });
});
```

## Next Steps

1. Test plan generation
2. Test plan refinement
3. Verify step dependencies
4. Store in Pinecone
5. Proceed to Critic Agent

## Next Blueprint

**AGENT-05-CRITIC-AGENT.md** - Evaluates plans before execution.


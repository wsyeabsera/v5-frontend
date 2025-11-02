# Agent Implementation Blueprint 05: Critic Agent

## Overview

The **Critic Agent** evaluates plans before execution to catch errors, identify risks, and suggest improvements. It acts as a quality gatekeeper, ensuring plans are safe and sound before they're executed.

**Key Responsibilities:**
- Evaluate plans for logical errors, feasibility, efficiency, and safety
- Score plans across multiple dimensions (0.0-1.0)
- Identify issues with severity levels
- Provide improvement suggestions
- Recommend: approve, revise, or reject

## Prerequisites

- **AGENT-01** (Request ID System)
- **AGENT-04** (Planner Agent) - Provides plans to critique
- Base Agent class
- Understanding of plan validation

## Step-by-Step Implementation

### Step 1: Add Critique Types

Add to `types/index.ts`:

```typescript
/**
 * Critique Issue - Individual problem found in a plan
 */
export interface CritiqueIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'logic' | 'feasibility' | 'efficiency' | 'safety' | 'completeness';
  description: string;
  suggestion: string;
  affectedSteps?: string[]; // Step IDs that have this issue
}

/**
 * Critique - Complete evaluation of a plan
 */
export interface Critique {
  id: string;
  planId: string;
  overallScore: number; // 0.0-1.0
  feasibilityScore: number;
  correctnessScore: number;
  efficiencyScore: number;
  safetyScore: number;
  issues: CritiqueIssue[];
  strengths: string[];
  suggestions: string[];
  recommendation: 'approve' | 'revise' | 'reject';
  rationale: string;
}

/**
 * Critic Agent Output
 */
export interface CriticAgentOutput extends AgentOutput {
  critique: Critique;
  planId: string; // ID of the plan being critiqued
}
```

### Step 2: Implement Critic Agent

Create `lib/agents/critic-agent.ts`:

```typescript
import { BaseAgent } from './base-agent';
import { Plan, Critique, CritiqueIssue, CriticAgentOutput, RequestContext } from '@/types';
import { addAgentToChain } from '@/lib/utils/request-id';

/**
 * Critic Agent
 * 
 * Evaluates plans before execution to catch errors and identify risks.
 * Think of this as a "code review" for action plans.
 */
export class CriticAgent extends BaseAgent {
  private readonly systemPrompt = `You are a Critic Agent - a senior engineer reviewing plans before execution.

Your job is to evaluate action plans critically:
1. Check for logical errors or contradictions
2. Verify feasibility with available tools
3. Assess efficiency and completeness
4. Identify potential risks or safety issues
5. Suggest improvements when needed

Be thorough but fair. Your goal is preventing mistakes, not perfectionism.`;

  // Thresholds for recommendations
  private readonly APPROVAL_THRESHOLD = 0.8; // Score >= 0.8: approve
  private readonly REVISION_THRESHOLD = 0.6; // 0.6 <= score < 0.8: revise
  // Score < 0.6: reject

  /**
   * Critique a plan
   */
  async critiquePlan(
    plan: Plan,
    userQuery: string,
    availableTools: string[],
    requestContext: RequestContext
  ): Promise<CriticAgentOutput> {
    const updatedContext = addAgentToChain(requestContext, 'critic-agent');

    const prompt = this.buildCritiquePrompt(plan, { userQuery, availableTools });

    const messages = [
      { role: 'system' as const, content: this.systemPrompt },
      { role: 'user' as const, content: prompt },
    ];

    const response = await this.callLLM(messages, {
      temperature: 0.3, // Critical analysis - be precise, less creative
      maxTokens: 2000,
    });

    const critique = this.parseCritique(response, plan.id);

    return {
      requestId: updatedContext.requestId,
      agentName: 'critic-agent',
      timestamp: new Date(),
      requestContext: updatedContext,
      critique,
      planId: plan.id,
    };
  }

  private buildCritiquePrompt(
    plan: Plan,
    context: { userQuery: string; availableTools: string[] }
  ): string {
    return `User Query: ${context.userQuery}

Plan to Evaluate:
GOAL: ${plan.goal}

STEPS:
${plan.steps
  .map(
    s => `${s.order}. ${s.description}
   Action: ${s.action}
   Parameters: ${JSON.stringify(s.parameters || {})}
   Expected: ${s.expectedOutcome}
   Depends on: ${s.dependencies?.join(', ') || 'none'}`
  )
  .join('\n\n')}

Available Tools: ${context.availableTools.join(', ')}

Evaluate this plan. Provide detailed critique:

OVERALL_SCORE: [0.0-1.0]

FEASIBILITY_SCORE: [0.0-1.0] - Can this plan actually work?
CORRECTNESS_SCORE: [0.0-1.0] - Is this logically sound?
EFFICIENCY_SCORE: [0.0-1.0] - Is this the best approach?
SAFETY_SCORE: [0.0-1.0] - Are there risks?

STRENGTHS:
- [What this plan does well]

ISSUES:
1. [SEVERITY: low/medium/high/critical] [CATEGORY: logic/feasibility/efficiency/safety/completeness]
   [Description]
   Suggestion: [how to fix]
   Affected Steps: [step numbers if applicable]

2. [Next issue...]

SUGGESTIONS:
- [Improvement suggestion 1]

RECOMMENDATION: [approve/revise/reject]

RATIONALE: [Why this recommendation]`;
  }

  private parseCritique(response: string, planId: string): Critique {
    const extractScore = (text: string, section: string): number => {
      const sectionText = this.extractSection(text, section);
      const match = sectionText?.match(/[\d.]+/);
      const score = match ? parseFloat(match[0]) : 0.5;
      return Math.max(0, Math.min(1, score)); // Clamp to 0-1
    };

    const overallScore = extractScore(response, 'OVERALL_SCORE');
    const feasibilityScore = extractScore(response, 'FEASIBILITY_SCORE');
    const correctnessScore = extractScore(response, 'CORRECTNESS_SCORE');
    const efficiencyScore = extractScore(response, 'EFFICIENCY_SCORE');
    const safetyScore = extractScore(response, 'SAFETY_SCORE');

    const issues = this.parseIssues(response);
    const strengths = this.extractList(response, 'STRENGTHS');
    const suggestions = this.extractList(response, 'SUGGESTIONS');
    const recommendation = this.extractRecommendation(response);
    const rationale = this.extractSection(response, 'RATIONALE') || '';

    return {
      id: `critique-${Date.now()}`,
      planId,
      overallScore,
      feasibilityScore,
      correctnessScore,
      efficiencyScore,
      safetyScore,
      issues,
      strengths,
      suggestions,
      recommendation,
      rationale,
    };
  }

  private parseIssues(response: string): CritiqueIssue[] {
    const issuesSection = this.extractSection(response, 'ISSUES');
    if (!issuesSection) return [];

    const issueRegex = /(\d+)\.\s*\[SEVERITY:\s*(\w+)\]\s*\[CATEGORY:\s*(\w+)\]\s*([^\n]+)(?:\n\s*Suggestion:\s*([^\n]+))?(?:\n\s*Affected Steps:\s*([^\n]+))?/gi;
    const matches = Array.from(issuesSection.matchAll(issueRegex));

    return matches.map((match) => {
      const severity = (match[2]?.toLowerCase() || 'medium') as CritiqueIssue['severity'];
      const category = (match[3]?.toLowerCase() || 'logic') as CritiqueIssue['category'];
      const description = match[4]?.trim() || '';
      const suggestion = match[5]?.trim() || 'Review and fix';
      const affectedStepsText = match[6]?.trim();

      const affectedSteps = affectedStepsText
        ? affectedStepsText.split(',').map(s => `step-${s.trim()}`)
        : [];

      return {
        severity,
        category,
        description,
        suggestion,
        affectedSteps: affectedSteps.length > 0 ? affectedSteps : undefined,
      };
    });
  }

  private extractRecommendation(response: string): 'approve' | 'revise' | 'reject' {
    const section = this.extractSection(response, 'RECOMMENDATION');
    const lower = section?.toLowerCase() || '';
    if (lower.includes('approve')) return 'approve';
    if (lower.includes('reject')) return 'reject';
    return 'revise'; // Default
  }
}
```

### Step 3: Create API Route

Create `app/api/agents/critic-agent/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { CriticAgent } from '@/lib/agents/critic-agent';
import { Plan, RequestContext } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plan, userQuery, availableTools = [], requestContext, apiKey, modelId } = body;

    if (!plan) return NextResponse.json({ error: 'plan required' }, { status: 400 });
    if (!requestContext?.requestId) {
      return NextResponse.json({ error: 'requestContext required' }, { status: 400 });
    }

    const agent = new CriticAgent(apiKey, modelId);
    const result = await agent.critiquePlan(plan, userQuery, availableTools, requestContext);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to critique plan' },
      { status: 500 }
    );
  }
}
```

## Pinecone Schema

```typescript
interface CriticPineconeMetadata {
  requestId: string;
  agentName: 'critic-agent';
  agentChain: string[];
  content: string; // Critique rationale
  planId: string;
  overallScore: number;
  recommendation: string;
  issueCount: number;
  timestamp: string;
}
```

## Request ID Integration

```typescript
const updatedContext = addAgentToChain(requestContext, 'critic-agent');
return {
  requestId: updatedContext.requestId,
  // ...
};
```

## Testing

Create `lib/agents/critic-agent.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { CriticAgent } from './critic-agent';
import { generateRequestId } from '@/lib/utils/request-id';
import { Plan } from '@/types';

describe('CriticAgent', () => {
  const agent = new CriticAgent('test-key', 'claude-sonnet');

  it('should critique a plan', async () => {
    const requestContext = generateRequestId();
    const plan: Plan = {
      id: 'plan-1',
      goal: 'List facilities',
      steps: [],
      estimatedComplexity: 0.3,
      confidence: 0.8,
      dependencies: [],
      createdAt: new Date(),
    };

    const result = await agent.critiquePlan(
      plan,
      'List facilities',
      ['list_facilities'],
      requestContext
    );

    expect(result.requestId).toBe(requestContext.requestId);
    expect(result.critique.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.critique.overallScore).toBeLessThanOrEqual(1);
  });
});
```

## Next Blueprint

**AGENT-06-CONFIDENCE-SCORER.md** - Quantifies uncertainty at decision points.


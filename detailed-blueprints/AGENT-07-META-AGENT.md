# Agent Implementation Blueprint 07: Meta-Agent

## Overview

The **Meta-Agent** provides self-awareness - it questions the reasoning process itself and manages dynamic reasoning depth. It acts as an orchestrator that can trigger replanning or deeper reasoning when confidence is low.

**Key Responsibilities:**
- Assess overall reasoning quality
- Detect when to think deeper or reconsider
- Manage dynamic reasoning depth
- Act as quality gatekeeper
- Trigger replanning when needed

## Prerequisites

- **AGENT-01** (Request ID System)
- **AGENT-06** (Confidence Scorer) - Provides confidence metrics
- Previous agents (Thought, Planner, Critic) for context

## Step-by-Step Implementation

### Step 1: Add Meta-Agent Types

Add to `types/index.ts`:

```typescript
/**
 * Meta-Agent Output
 */
export interface MetaAgentOutput extends AgentOutput {
  reasoningQuality: number; // 0.0-1.0
  shouldReplan: boolean;
  shouldDeepenReasoning: boolean;
  recommendedActions: string[];
  assessment: string; // Human-readable assessment
}
```

### Step 2: Implement Meta-Agent

Create `lib/agents/meta-agent.ts`:

```typescript
import { BaseAgent } from './base-agent';
import { MetaAgentOutput, RequestContext, ConfidenceScorerOutput } from '@/types';
import { addAgentToChain } from '@/lib/utils/request-id';

/**
 * Meta-Agent
 * 
 * Self-awareness layer that questions reasoning quality and manages depth.
 */
export class MetaAgent extends BaseAgent {
  private readonly systemPrompt = `You are a Meta-Agent - you question the reasoning process itself.

Your job is to:
1. Assess the overall quality of reasoning
2. Detect gaps or weaknesses in the thinking
3. Decide if deeper reasoning is needed
4. Determine if replanning is necessary
5. Provide recommendations

Think critically about the reasoning process, not just the output.`;

  private readonly REASONING_QUALITY_THRESHOLD = 0.6;
  private readonly REPLAN_THRESHOLD = 0.4;

  /**
   * Assess reasoning quality
   */
  async assessReasoning(
    context: {
      thoughts?: any[];
      plan?: any;
      critique?: any;
      confidenceScore?: ConfidenceScorerOutput;
    },
    requestContext: RequestContext
  ): Promise<MetaAgentOutput> {
    const updatedContext = addAgentToChain(requestContext, 'meta-agent');

    const prompt = this.buildAssessmentPrompt(context);

    const messages = [
      { role: 'system' as const, content: this.systemPrompt },
      { role: 'user' as const, content: prompt },
    ];

    const response = await this.callLLM(messages, {
      temperature: 0.4,
      maxTokens: 1000,
    });

    const reasoningQuality = this.extractReasoningQuality(response);
    const shouldReplan = reasoningQuality < this.REPLAN_THRESHOLD;
    const shouldDeepenReasoning = reasoningQuality < this.REASONING_QUALITY_THRESHOLD;

    const recommendedActions = this.extractActions(response);

    return {
      requestId: updatedContext.requestId,
      agentName: 'meta-agent',
      timestamp: new Date(),
      requestContext: updatedContext,
      reasoningQuality,
      shouldReplan,
      shouldDeepenReasoning,
      recommendedActions,
      assessment: response,
    };
  }

  private buildAssessmentPrompt(context: any): string {
    let prompt = `Assess the quality of this reasoning chain:\n\n`;

    if (context.confidenceScore) {
      prompt += `Confidence Score: ${(context.confidenceScore.overallConfidence * 100).toFixed(0)}%\n`;
      prompt += `Decision: ${context.confidenceScore.decision}\n\n`;
    }

    if (context.critique) {
      prompt += `Critique Score: ${(context.critique.overallScore * 100).toFixed(0)}%\n`;
      prompt += `Issues Found: ${context.critique.issues.length}\n\n`;
    }

    prompt += `Assess the reasoning quality. Provide:
REASONING_QUALITY: [0.0-1.0]
ACTIONS: [recommended actions, one per line]`;

    return prompt;
  }

  private extractReasoningQuality(response: string): number {
    const section = this.extractSection(response, 'REASONING_QUALITY');
    const match = section?.match(/[\d.]+/);
    const score = match ? parseFloat(match[0]) : 0.5;
    return Math.max(0, Math.min(1, score));
  }

  private extractActions(response: string): string[] {
    return this.extractList(response, 'ACTIONS');
  }
}
```

### Step 3: Create API Route

Create `app/api/agents/meta-agent/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { MetaAgent } from '@/lib/agents/meta-agent';
import { RequestContext } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { context, requestContext, apiKey, modelId } = body;

    if (!requestContext?.requestId) {
      return NextResponse.json({ error: 'requestContext required' }, { status: 400 });
    }

    const agent = new MetaAgent(apiKey, modelId);
    const result = await agent.assessReasoning(context, requestContext);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to assess reasoning' },
      { status: 500 }
    );
  }
}
```

## Pinecone Schema

```typescript
interface MetaAgentPineconeMetadata {
  requestId: string;
  agentName: 'meta-agent';
  agentChain: string[];
  reasoningQuality: number;
  shouldReplan: boolean;
  shouldDeepenReasoning: boolean;
  timestamp: string;
}
```

## Request ID Integration

```typescript
const updatedContext = addAgentToChain(requestContext, 'meta-agent');
```

## Testing

Create `lib/agents/meta-agent.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { MetaAgent } from './meta-agent';
import { generateRequestId } from '@/lib/utils/request-id';

describe('MetaAgent', () => {
  const agent = new MetaAgent('test-key', 'claude-sonnet');

  it('should assess reasoning quality', async () => {
    const requestContext = generateRequestId();
    const result = await agent.assessReasoning({}, requestContext);

    expect(result.requestId).toBe(requestContext.requestId);
    expect(result.reasoningQuality).toBeGreaterThanOrEqual(0);
    expect(result.reasoningQuality).toBeLessThanOrEqual(1);
  });
});
```

## Next Blueprint

**AGENT-08-SIMULATION-AGENT.md** - Mentally simulates plan outcomes (optional/advanced).


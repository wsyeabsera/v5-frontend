# Agent Implementation Blueprint 06: Confidence Scorer

## Overview

The **Confidence Scorer** quantifies uncertainty at every decision point. It aggregates confidence scores from multiple agents and provides routing decisions based on confidence thresholds.

**Key Responsibilities:**
- Aggregate confidence scores from all agents
- Calculate overall confidence in the reasoning chain
- Route decisions based on confidence thresholds
- Provide confidence visualization

## Prerequisites

- **AGENT-01** (Request ID System)
- Previous agents (Thought, Planner, Critic) that produce confidence scores
- Understanding of confidence aggregation

## Step-by-Step Implementation

### Step 1: Add Confidence Types

Add to `types/index.ts`:

```typescript
/**
 * Confidence Score - Individual confidence score from an agent
 */
export interface ConfidenceScore {
  agentName: string;
  score: number; // 0.0-1.0
  reasoning: string; // Why this confidence level
  timestamp: Date;
}

/**
 * Confidence Scorer Output
 */
export interface ConfidenceScorerOutput extends AgentOutput {
  overallConfidence: number; // Aggregated score
  agentScores: ConfidenceScore[];
  decision: 'execute' | 'review' | 'rethink' | 'escalate';
  thresholdUsed: {
    execute: number;
    review: number;
    rethink: number;
    escalate: number;
  };
  reasoning: string;
}
```

### Step 2: Implement Confidence Scorer

Create `lib/agents/confidence-scorer.ts`:

```typescript
import { ConfidenceScorerOutput, ConfidenceScore, RequestContext } from '@/types';
import { addAgentToChain } from '@/lib/utils/request-id';

/**
 * Confidence Scorer
 * 
 * Aggregates confidence scores from multiple agents and makes routing decisions.
 */
export class ConfidenceScorer {
  // Thresholds for routing decisions
  private readonly THRESHOLDS = {
    EXECUTE: 0.8,    // High confidence - proceed
    REVIEW: 0.6,     // Medium - ask for clarification
    RETHINK: 0.4,    // Low - replan
    ESCALATE: 0.2,   // Very low - request help
  };

  /**
   * Score overall confidence from agent outputs
   */
  async scoreConfidence(
    agentScores: ConfidenceScore[],
    requestContext: RequestContext
  ): Promise<ConfidenceScorerOutput> {
    const updatedContext = addAgentToChain(requestContext, 'confidence-scorer');

    // Aggregate scores (weighted average)
    const overallConfidence = this.aggregateScores(agentScores);

    // Make routing decision
    const decision = this.makeDecision(overallConfidence);

    // Generate reasoning
    const reasoning = this.generateReasoning(overallConfidence, agentScores, decision);

    return {
      requestId: updatedContext.requestId,
      agentName: 'confidence-scorer',
      timestamp: new Date(),
      requestContext: updatedContext,
      overallConfidence,
      agentScores,
      decision,
      thresholdUsed: this.THRESHOLDS,
      reasoning,
    };
  }

  /**
   * Aggregate confidence scores (weighted average)
   */
  private aggregateScores(scores: ConfidenceScore[]): number {
    if (scores.length === 0) return 0.5; // Default medium confidence

    // Simple average (could be weighted by agent importance)
    const sum = scores.reduce((acc, s) => acc + s.score, 0);
    return sum / scores.length;
  }

  /**
   * Make routing decision based on confidence
   */
  private makeDecision(confidence: number): 'execute' | 'review' | 'rethink' | 'escalate' {
    if (confidence >= this.THRESHOLDS.EXECUTE) return 'execute';
    if (confidence >= this.THRESHOLDS.REVIEW) return 'review';
    if (confidence >= this.THRESHOLDS.RETHINK) return 'rethink';
    return 'escalate';
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    confidence: number,
    scores: ConfidenceScore[],
    decision: string
  ): string {
    const agentNames = scores.map(s => s.agentName).join(', ');
    return `Overall confidence: ${(confidence * 100).toFixed(0)}% based on scores from ${agentNames}. Decision: ${decision}.`;
  }
}
```

### Step 3: Create API Route

Create `app/api/agents/confidence-scorer/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ConfidenceScorer } from '@/lib/agents/confidence-scorer';
import { ConfidenceScore, RequestContext } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentScores, requestContext } = body;

    if (!Array.isArray(agentScores)) {
      return NextResponse.json({ error: 'agentScores array required' }, { status: 400 });
    }
    if (!requestContext?.requestId) {
      return NextResponse.json({ error: 'requestContext required' }, { status: 400 });
    }

    const scorer = new ConfidenceScorer();
    const result = await scorer.scoreConfidence(agentScores, requestContext);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to score confidence' },
      { status: 500 }
    );
  }
}
```

## Pinecone Schema

```typescript
interface ConfidencePineconeMetadata {
  requestId: string;
  agentName: 'confidence-scorer';
  agentChain: string[];
  overallConfidence: number;
  decision: string;
  agentScoreCount: number;
  timestamp: string;
}
```

## Request ID Integration

```typescript
const updatedContext = addAgentToChain(requestContext, 'confidence-scorer');
```

## Testing

Create `lib/agents/confidence-scorer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ConfidenceScorer } from './confidence-scorer';
import { generateRequestId } from '@/lib/utils/request-id';
import { ConfidenceScore } from '@/types';

describe('ConfidenceScorer', () => {
  const scorer = new ConfidenceScorer();

  it('should aggregate confidence scores', async () => {
    const requestContext = generateRequestId();
    const scores: ConfidenceScore[] = [
      {
        agentName: 'thought-agent',
        score: 0.8,
        reasoning: 'High confidence',
        timestamp: new Date(),
      },
      {
        agentName: 'planner-agent',
        score: 0.7,
        reasoning: 'Medium-high confidence',
        timestamp: new Date(),
      },
    ];

    const result = await scorer.scoreConfidence(scores, requestContext);

    expect(result.overallConfidence).toBeGreaterThanOrEqual(0);
    expect(result.overallConfidence).toBeLessThanOrEqual(1);
    expect(result.decision).toBeDefined();
  });
});
```

## Next Blueprint

**AGENT-07-META-AGENT.md** - Self-awareness layer that questions reasoning.


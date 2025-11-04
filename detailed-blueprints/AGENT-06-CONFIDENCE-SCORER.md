# Agent Implementation Blueprint 06: Confidence Scorer

## Overview

The **Confidence Scorer** quantifies uncertainty at every decision point. It aggregates confidence scores from multiple agents and provides routing decisions based on confidence thresholds.

**Key Responsibilities:**
- Aggregate confidence scores from all agents
- Calculate overall confidence in the reasoning chain
- Route decisions based on confidence thresholds
- Provide confidence visualization
- Store confidence assessments in MongoDB for history tracking

**Important Note:** This is **NOT a BaseAgent** - it's a utility class that aggregates scores and makes routing decisions. It does not extend BaseAgent and does not call LLMs directly.

## Prerequisites

- **AGENT-01** (Request ID System) - Required for chaining
- Previous agents (Thought, Planner, Critic) that produce confidence scores
- Understanding of confidence aggregation
- MongoDB connection configured

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
 * This is a utility class - it does NOT extend BaseAgent.
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
   * 
   * Can be enhanced with agent-specific weights in the future.
   */
  private aggregateScores(scores: ConfidenceScore[]): number {
    if (scores.length === 0) return 0.5; // Default medium confidence

    // Simple average (could be weighted by agent importance)
    // Example weights: thought-agent: 0.3, planner-agent: 0.3, critic-agent: 0.4
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

### Step 3: Create MongoDB Storage

Create `lib/storage/confidence-outputs-storage.ts`:

```typescript
/**
 * Confidence Outputs Storage using MongoDB
 * 
 * Stores ConfidenceScorerOutput results for history tracking and analytics.
 */

import { getCollection } from './mongodb-client'
import { ConfidenceScorerOutput } from '@/types'

const COLLECTION_NAME = 'confidence_outputs'

/**
 * Ensure indexes for confidence outputs collection
 */
async function ensureIndexes(): Promise<void> {
  try {
    const collection = await getCollection(COLLECTION_NAME)
    
    // Create indexes
    await collection.createIndex({ requestId: 1 })
    await collection.createIndex({ agentName: 1 })
    await collection.createIndex({ timestamp: -1 }) // Descending for newest first
    await collection.createIndex({ overallConfidence: 1 }) // For filtering by confidence
    await collection.createIndex({ decision: 1 }) // For filtering by decision
    
    console.log('[MongoDB] Indexes ensured for confidence_outputs collection')
  } catch (error) {
    console.error('[MongoDB] Failed to create indexes:', error)
    // Don't throw - indexes might already exist
  }
}

/**
 * Confidence Outputs Storage Class
 */
export class ConfidenceOutputsStorage {
  /**
   * Ensure indexes are created (call once on startup)
   */
  async initialize(): Promise<void> {
    await ensureIndexes()
  }

  /**
   * Store a confidence scorer output
   */
  async save(output: ConfidenceScorerOutput): Promise<void> {
    const collection = await getCollection<ConfidenceScorerOutput & { _id?: any }>(
      COLLECTION_NAME
    )

    // Prepare document for storage
    const doc: any = {
      requestId: output.requestId,
      agentName: output.agentName,
      timestamp: output.timestamp instanceof Date ? output.timestamp : new Date(output.timestamp),
      overallConfidence: output.overallConfidence,
      agentScores: output.agentScores.map(score => ({
        ...score,
        timestamp: score.timestamp instanceof Date ? score.timestamp : new Date(score.timestamp),
      })),
      decision: output.decision,
      thresholdUsed: output.thresholdUsed,
      reasoning: output.reasoning,
      createdAt: new Date(),
    }

    // Store requestContext separately for easier querying
    if (output.requestContext) {
      doc.requestContext = {
        requestId: output.requestContext.requestId,
        agentChain: output.requestContext.agentChain,
        status: output.requestContext.status,
        createdAt: output.requestContext.createdAt instanceof Date 
          ? output.requestContext.createdAt 
          : new Date(output.requestContext.createdAt),
      }
      
      // Include userQuery if present
      if (output.requestContext.userQuery) {
        doc.requestContext.userQuery = output.requestContext.userQuery
      }
    }

    // Upsert by requestId and agentName (one output per request)
    await collection.updateOne(
      { requestId: output.requestId, agentName: output.agentName },
      { $set: doc },
      { upsert: true }
    )
  }

  /**
   * Get an output by request ID
   */
  async getByRequestId(requestId: string): Promise<ConfidenceScorerOutput | null> {
    const collection = await getCollection<ConfidenceScorerOutput>(COLLECTION_NAME)

    const result = await collection.findOne({ requestId, agentName: 'confidence-scorer' })

    if (!result) {
      return null
    }

    // Ensure timestamps are Dates
    return {
      ...result,
      timestamp: result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp),
      agentScores: result.agentScores.map(score => ({
        ...score,
        timestamp: score.timestamp instanceof Date ? score.timestamp : new Date(score.timestamp),
      })),
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    } as ConfidenceScorerOutput
  }

  /**
   * Get all outputs with optional filters
   */
  async getAll(filters?: {
    minConfidence?: number
    maxConfidence?: number
    decision?: 'execute' | 'review' | 'rethink' | 'escalate'
    startDate?: Date
    endDate?: Date
  }): Promise<ConfidenceScorerOutput[]> {
    const collection = await getCollection<ConfidenceScorerOutput>(COLLECTION_NAME)

    const query: any = {}

    if (filters) {
      if (filters.minConfidence !== undefined || filters.maxConfidence !== undefined) {
        query.overallConfidence = {}
        if (filters.minConfidence !== undefined) {
          query.overallConfidence.$gte = filters.minConfidence
        }
        if (filters.maxConfidence !== undefined) {
          query.overallConfidence.$lte = filters.maxConfidence
        }
      }

      if (filters.decision) {
        query.decision = filters.decision
      }

      if (filters.startDate || filters.endDate) {
        query.timestamp = {}
        if (filters.startDate) {
          query.timestamp.$gte = filters.startDate instanceof Date 
            ? filters.startDate 
            : new Date(filters.startDate)
        }
        if (filters.endDate) {
          query.timestamp.$lte = filters.endDate instanceof Date 
            ? filters.endDate 
            : new Date(filters.endDate)
        }
      }
    }

    const results = await collection
      .find(query)
      .sort({ timestamp: -1 })
      .toArray()

    return results.map((result) => ({
      ...result,
      timestamp: result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp),
      agentScores: result.agentScores.map(score => ({
        ...score,
        timestamp: score.timestamp instanceof Date ? score.timestamp : new Date(score.timestamp),
      })),
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    })) as ConfidenceScorerOutput[]
  }

  /**
   * Count total outputs
   */
  async count(): Promise<number> {
    const collection = await getCollection(COLLECTION_NAME)
    return collection.countDocuments({ agentName: 'confidence-scorer' })
  }
}

// Singleton instance
let storageInstance: ConfidenceOutputsStorage | null = null

/**
 * Get the singleton ConfidenceOutputsStorage instance
 */
export function getConfidenceOutputsStorage(): ConfidenceOutputsStorage {
  if (!storageInstance) {
    storageInstance = new ConfidenceOutputsStorage()
  }
  return storageInstance
}
```

### Step 4: Create API Route

Create `app/api/agents/confidence-scorer/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { ConfidenceScorer } from '@/lib/agents/confidence-scorer'
import { getConfidenceOutputsStorage } from '@/lib/storage/confidence-outputs-storage'
import { getRequestMongoDBStorage } from '@/lib/storage/request-mongodb-storage'
import { ConfidenceScore, RequestContext } from '@/types'
import { logger } from '@/utils/logger'

/**
 * API Route for Confidence Scorer
 * 
 * POST /api/agents/confidence-scorer
 * 
 * Body:
 * {
 *   agentScores: ConfidenceScore[];  // Required: Array of confidence scores from agents
 *   requestContext: RequestContext;  // Required: Request context
 * }
 * 
 * Returns:
 * {
 *   overallConfidence: number;
 *   agentScores: ConfidenceScore[];
 *   decision: 'execute' | 'review' | 'rethink' | 'escalate';
 *   thresholdUsed: {...};
 *   reasoning: string;
 *   requestId: string;
 *   requestContext: RequestContext;
 *   ...
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { agentScores, requestContext } = body

    // Validate required fields
    if (!Array.isArray(agentScores)) {
      logger.warn(`[Confidence Scorer API] Missing or invalid agentScores array`, { body })
      return NextResponse.json(
        { error: 'agentScores (array) is required' },
        { status: 400 }
      )
    }

    if (!requestContext || !requestContext.requestId) {
      logger.warn(`[Confidence Scorer API] Missing requestContext`, { body })
      return NextResponse.json(
        { error: 'requestContext with requestId is required' },
        { status: 400 }
      )
    }

    // Initialize scorer
    const scorer = new ConfidenceScorer()

    // Update request context status
    const requestStorage = getRequestMongoDBStorage()
    const updatedRequestContext: RequestContext = {
      ...requestContext,
      status: 'in-progress',
    }
    await requestStorage.save(updatedRequestContext)

    // Score confidence
    logger.info(`[Confidence Scorer API] Scoring confidence`, {
      requestId: requestContext.requestId,
      agentScoresCount: agentScores.length,
    })

    const result = await scorer.scoreConfidence(agentScores, updatedRequestContext)

    // Store output in MongoDB
    try {
      const outputsStorage = getConfidenceOutputsStorage()
      await outputsStorage.save(result)
    } catch (error: any) {
      logger.error(`[Confidence Scorer API] Failed to store output:`, error.message)
      // Don't fail the request if storage fails
    }

    // Update request context to completed
    result.requestContext.status = 'completed'
    await requestStorage.save(result.requestContext)

    logger.info(`[Confidence Scorer API] Confidence scoring completed`, {
      requestId: result.requestId,
      overallConfidence: result.overallConfidence,
      decision: result.decision,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    logger.error(`[Confidence Scorer API] Error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to score confidence' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint - returns confidence output by requestId
 * 
 * Query params:
 * - requestId: string (required) - Returns confidence output for that request
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const requestId = searchParams.get('requestId')

    if (!requestId) {
      return NextResponse.json(
        { error: 'requestId query parameter is required' },
        { status: 400 }
      )
    }

    const outputsStorage = getConfidenceOutputsStorage()
    const output = await outputsStorage.getByRequestId(requestId)
    
    if (!output) {
      return NextResponse.json(
        { error: 'Confidence output not found for this request' },
        { status: 404 }
      )
    }

    return NextResponse.json(output, { status: 200 })
  } catch (error: any) {
    logger.error(`[Confidence Scorer API] GET error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch confidence output' },
      { status: 500 }
    )
  }
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
    const requestContext = generateRequestId('test query');
    const scores: ConfidenceScore[] = [
      {
        agentName: 'thought-agent',
        score: 0.8,
        reasoning: 'High confidence in reasoning',
        timestamp: new Date(),
      },
      {
        agentName: 'planner-agent',
        score: 0.7,
        reasoning: 'Medium-high confidence in plan',
        timestamp: new Date(),
      },
    ];

    const result = await scorer.scoreConfidence(scores, requestContext);

    expect(result.requestId).toBe(requestContext.requestId);
    expect(result.overallConfidence).toBeGreaterThanOrEqual(0);
    expect(result.overallConfidence).toBeLessThanOrEqual(1);
    expect(result.decision).toBeDefined();
    expect(['execute', 'review', 'rethink', 'escalate']).toContain(result.decision);
  });

  it('should make execute decision for high confidence', async () => {
    const requestContext = generateRequestId();
    const scores: ConfidenceScore[] = [
      {
        agentName: 'thought-agent',
        score: 0.9,
        reasoning: 'Very high confidence',
        timestamp: new Date(),
      },
    ];

    const result = await scorer.scoreConfidence(scores, requestContext);
    expect(result.decision).toBe('execute');
  });

  it('should make rethink decision for low confidence', async () => {
    const requestContext = generateRequestId();
    const scores: ConfidenceScore[] = [
      {
        agentName: 'thought-agent',
        score: 0.3,
        reasoning: 'Low confidence',
        timestamp: new Date(),
      },
    ];

    const result = await scorer.scoreConfidence(scores, requestContext);
    expect(result.decision).toBe('rethink');
  });
});
```

## MongoDB Storage Schema

The confidence outputs are stored in the `confidence_outputs` collection with the following structure:

```typescript
{
  _id: ObjectId,
  requestId: string,
  agentName: 'confidence-scorer',
  timestamp: Date,
  overallConfidence: number,
  agentScores: Array<{
    agentName: string,
    score: number,
    reasoning: string,
    timestamp: Date
  }>,
  decision: 'execute' | 'review' | 'rethink' | 'escalate',
  thresholdUsed: {
    execute: number,
    review: number,
    rethink: number,
    escalate: number
  },
  reasoning: string,
  requestContext: {
    requestId: string,
    agentChain: string[],
    status: string,
    createdAt: Date,
    userQuery?: string
  },
  createdAt: Date
}
```

## Next Blueprint

**AGENT-07-META-AGENT.md** - Self-awareness layer that questions reasoning quality.

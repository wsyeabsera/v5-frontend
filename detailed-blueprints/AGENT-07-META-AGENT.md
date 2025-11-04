# Agent Implementation Blueprint 07: Meta-Agent

## Overview

The **Meta-Agent** provides self-awareness - it questions the reasoning process itself and manages dynamic reasoning depth. It acts as a quality gatekeeper that can trigger replanning or deeper reasoning when confidence is low.

**Key Responsibilities:**
- Assess overall reasoning quality
- Detect when to think deeper or reconsider
- Manage dynamic reasoning depth
- Act as quality gatekeeper
- Trigger replanning when needed
- Store meta assessments in MongoDB for history tracking

## Prerequisites

- **AGENT-01** (Request ID System) - Required
- **AGENT-06** (Confidence Scorer) - Recommended but optional (provides confidence metrics)
- Previous agents (Thought, Planner, Critic) for context assessment
- BaseAgent pattern implemented
- Agent configuration system (MongoDB storage)

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
import { MetaAgentOutput, RequestContext, ConfidenceScorerOutput, ThoughtAgentOutput, PlannerAgentOutput, CriticAgentOutput } from '@/types';
import { addAgentToChain } from '@/lib/utils/request-id';

/**
 * Meta-Agent
 * 
 * Self-awareness layer that questions reasoning quality and manages depth.
 * Extends BaseAgent to follow the standard agent pattern.
 */
export class MetaAgent extends BaseAgent {
  /**
   * Base system prompt that guides the Meta Agent's behavior
   */
  private readonly baseSystemPrompt = `You are a Meta-Agent - you question the reasoning process itself.

Your job is to:
1. Assess the overall quality of reasoning
2. Detect gaps or weaknesses in the thinking
3. Decide if deeper reasoning is needed
4. Determine if replanning is necessary
5. Provide recommendations

Think critically about the reasoning process, not just the output. You are evaluating the quality of thinking itself.

CRITICAL EVALUATION CRITERIA:
- Reasoning Quality: Is the thought process sound? Are there logical gaps?
- Completeness: Are all aspects of the problem considered?
- Confidence Alignment: Does the confidence match the quality of reasoning?
- Plan Soundness: Is the plan feasible and well-structured?
- Critique Integration: Were critique issues properly addressed?

FORMAT REQUIREMENTS:

You MUST respond with ONLY a valid JSON object in this exact format:

{
  "reasoningQuality": 0.0-1.0,
  "shouldReplan": true|false,
  "shouldDeepenReasoning": true|false,
  "recommendedActions": ["action1", "action2"],
  "assessment": "Human-readable assessment of the reasoning quality"
}

Remember: You are outputting JSON only, no text before or after the JSON object.`;

  // Thresholds for decisions
  private readonly REASONING_QUALITY_THRESHOLD = 0.6;
  private readonly REPLAN_THRESHOLD = 0.4;

  constructor() {
    super('meta-agent');
  }

  /**
   * Assess reasoning quality
   */
  async assessReasoning(
    context: {
      thoughts?: ThoughtAgentOutput;
      plan?: PlannerAgentOutput;
      critique?: CriticAgentOutput;
      confidenceScore?: ConfidenceScorerOutput;
    },
    requestContext: RequestContext
  ): Promise<MetaAgentOutput> {
    // Initialize agent (loads config from MongoDB)
    await this.initialize();

    const updatedContext = addAgentToChain(requestContext, 'meta-agent');

    const prompt = this.buildAssessmentPrompt(context);

    const messages = [
      { role: 'system' as const, content: this.baseSystemPrompt },
      { role: 'user' as const, content: prompt },
    ];

    const response = await this.callLLM(messages, {
      temperature: 0.4, // Lower temperature for more consistent assessment
      maxTokens: 1500,
      responseFormat: { type: 'json_object' },
    });

    // Parse JSON response
    const assessment = this.parseAssessmentResponse(response);
    const reasoningQuality = assessment.reasoningQuality;
    const shouldReplan = reasoningQuality < this.REPLAN_THRESHOLD;
    const shouldDeepenReasoning = reasoningQuality < this.REASONING_QUALITY_THRESHOLD;

    return {
      requestId: updatedContext.requestId,
      agentName: 'meta-agent',
      timestamp: new Date(),
      requestContext: updatedContext,
      reasoningQuality,
      shouldReplan,
      shouldDeepenReasoning,
      recommendedActions: assessment.recommendedActions,
      assessment: assessment.assessment,
    };
  }

  /**
   * Build assessment prompt with context from other agents
   */
  private buildAssessmentPrompt(context: {
    thoughts?: ThoughtAgentOutput;
    plan?: PlannerAgentOutput;
    critique?: CriticAgentOutput;
    confidenceScore?: ConfidenceScorerOutput;
  }): string {
    let prompt = `Assess the quality of this reasoning chain:\n\n`;

    // Add confidence score if available
    if (context.confidenceScore) {
      prompt += `CONFIDENCE SCORE:\n`;
      prompt += `- Overall Confidence: ${(context.confidenceScore.overallConfidence * 100).toFixed(0)}%\n`;
      prompt += `- Decision: ${context.confidenceScore.decision}\n`;
      prompt += `- Agent Scores: ${context.confidenceScore.agentScores.map(s => `${s.agentName}: ${(s.score * 100).toFixed(0)}%`).join(', ')}\n\n`;
    }

    // Add thought reasoning if available
    if (context.thoughts && context.thoughts.thoughts.length > 0) {
      const thought = context.thoughts.thoughts[0];
      prompt += `THOUGHT REASONING:\n`;
      prompt += `- Reasoning: ${thought.reasoning.substring(0, 500)}${thought.reasoning.length > 500 ? '...' : ''}\n`;
      prompt += `- Approaches: ${thought.approaches.join(', ')}\n`;
      prompt += `- Uncertainties: ${thought.uncertainties.length} identified\n`;
      prompt += `- Confidence: ${(thought.confidence * 100).toFixed(0)}%\n\n`;
    }

    // Add plan if available
    if (context.plan) {
      prompt += `PLAN:\n`;
      prompt += `- Goal: ${context.plan.plan.goal}\n`;
      prompt += `- Steps: ${context.plan.plan.steps.length}\n`;
      prompt += `- Confidence: ${(context.plan.plan.confidence * 100).toFixed(0)}%\n`;
      prompt += `- Estimated Complexity: ${(context.plan.plan.estimatedComplexity * 100).toFixed(0)}%\n\n`;
    }

    // Add critique if available
    if (context.critique) {
      prompt += `CRITIQUE:\n`;
      prompt += `- Overall Score: ${(context.critique.critique.overallScore * 100).toFixed(0)}%\n`;
      prompt += `- Issues Found: ${context.critique.critique.issues.length}\n`;
      prompt += `- Recommendation: ${context.critique.critique.recommendation}\n`;
      if (context.critique.critique.issues.length > 0) {
        prompt += `- Key Issues: ${context.critique.critique.issues.slice(0, 3).map(i => i.description).join('; ')}\n`;
      }
      prompt += `\n`;
    }

    prompt += `Based on all this information, assess the overall reasoning quality and provide your assessment in the required JSON format.`;

    return prompt;
  }

  /**
   * Parse JSON assessment response
   */
  private parseAssessmentResponse(response: string): {
    reasoningQuality: number;
    recommendedActions: string[];
    assessment: string;
  } {
    try {
      // Clean response - remove any markdown code blocks
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Find JSON object
      let jsonStart = cleanResponse.indexOf('{');
      if (jsonStart === -1) {
        throw new Error('No JSON object found in response');
      }

      let braceCount = 0;
      let jsonEnd = -1;
      for (let i = jsonStart; i < cleanResponse.length; i++) {
        if (cleanResponse[i] === '{') braceCount++;
        if (cleanResponse[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            jsonEnd = i + 1;
            break;
          }
        }
      }

      if (jsonEnd === -1) {
        throw new Error('Incomplete JSON object in response');
      }

      const jsonStr = cleanResponse.substring(jsonStart, jsonEnd);
      const parsed = JSON.parse(jsonStr);

      return {
        reasoningQuality: Math.max(0, Math.min(1, parsed.reasoningQuality || 0.5)),
        recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : [],
        assessment: parsed.assessment || 'No assessment provided',
      };
    } catch (error: any) {
      // Fallback parsing if JSON parsing fails
      const reasoningQuality = this.extractReasoningQuality(response);
      const recommendedActions = this.extractActions(response);
      
      return {
        reasoningQuality,
        recommendedActions,
        assessment: response.substring(0, 500),
      };
    }
  }

  /**
   * Extract reasoning quality from text (fallback method)
   */
  private extractReasoningQuality(response: string): number {
    const section = this.extractSection(response, 'REASONING_QUALITY');
    const match = section?.match(/[\d.]+/);
    const score = match ? parseFloat(match[0]) : 0.5;
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Extract actions from text (fallback method)
   */
  private extractActions(response: string): string[] {
    return this.extractList(response, 'ACTIONS');
  }
}
```

### Step 3: Create MongoDB Storage

Create `lib/storage/meta-outputs-storage.ts`:

```typescript
/**
 * Meta Outputs Storage using MongoDB
 * 
 * Stores MetaAgentOutput results for history tracking and analytics.
 */

import { getCollection } from './mongodb-client'
import { MetaAgentOutput } from '@/types'

const COLLECTION_NAME = 'meta_outputs'

/**
 * Ensure indexes for meta outputs collection
 */
async function ensureIndexes(): Promise<void> {
  try {
    const collection = await getCollection(COLLECTION_NAME)
    
    // Create indexes
    await collection.createIndex({ requestId: 1 })
    await collection.createIndex({ agentName: 1 })
    await collection.createIndex({ timestamp: -1 }) // Descending for newest first
    await collection.createIndex({ reasoningQuality: 1 }) // For filtering by quality
    await collection.createIndex({ shouldReplan: 1 }) // For filtering by replan flag
    await collection.createIndex({ shouldDeepenReasoning: 1 }) // For filtering by deepen flag
    
    console.log('[MongoDB] Indexes ensured for meta_outputs collection')
  } catch (error) {
    console.error('[MongoDB] Failed to create indexes:', error)
    // Don't throw - indexes might already exist
  }
}

/**
 * Meta Outputs Storage Class
 */
export class MetaOutputsStorage {
  /**
   * Ensure indexes are created (call once on startup)
   */
  async initialize(): Promise<void> {
    await ensureIndexes()
  }

  /**
   * Store a meta agent output
   */
  async save(output: MetaAgentOutput): Promise<void> {
    const collection = await getCollection<MetaAgentOutput & { _id?: any }>(
      COLLECTION_NAME
    )

    // Prepare document for storage
    const doc: any = {
      requestId: output.requestId,
      agentName: output.agentName,
      timestamp: output.timestamp instanceof Date ? output.timestamp : new Date(output.timestamp),
      reasoningQuality: output.reasoningQuality,
      shouldReplan: output.shouldReplan,
      shouldDeepenReasoning: output.shouldDeepenReasoning,
      recommendedActions: output.recommendedActions,
      assessment: output.assessment,
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
  async getByRequestId(requestId: string): Promise<MetaAgentOutput | null> {
    const collection = await getCollection<MetaAgentOutput>(COLLECTION_NAME)

    const result = await collection.findOne({ requestId, agentName: 'meta-agent' })

    if (!result) {
      return null
    }

    // Ensure timestamps are Dates
    return {
      ...result,
      timestamp: result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp),
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    } as MetaAgentOutput
  }

  /**
   * Get all outputs with optional filters
   */
  async getAll(filters?: {
    minReasoningQuality?: number
    maxReasoningQuality?: number
    shouldReplan?: boolean
    shouldDeepenReasoning?: boolean
    startDate?: Date
    endDate?: Date
  }): Promise<MetaAgentOutput[]> {
    const collection = await getCollection<MetaAgentOutput>(COLLECTION_NAME)

    const query: any = {}

    if (filters) {
      if (filters.minReasoningQuality !== undefined || filters.maxReasoningQuality !== undefined) {
        query.reasoningQuality = {}
        if (filters.minReasoningQuality !== undefined) {
          query.reasoningQuality.$gte = filters.minReasoningQuality
        }
        if (filters.maxReasoningQuality !== undefined) {
          query.reasoningQuality.$lte = filters.maxReasoningQuality
        }
      }

      if (filters.shouldReplan !== undefined) {
        query.shouldReplan = filters.shouldReplan
      }

      if (filters.shouldDeepenReasoning !== undefined) {
        query.shouldDeepenReasoning = filters.shouldDeepenReasoning
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
      requestContext: result.requestContext ? {
        ...result.requestContext,
        createdAt: result.requestContext.createdAt instanceof Date 
          ? result.requestContext.createdAt 
          : new Date(result.requestContext.createdAt),
      } : undefined,
    })) as MetaAgentOutput[]
  }

  /**
   * Count total outputs
   */
  async count(): Promise<number> {
    const collection = await getCollection(COLLECTION_NAME)
    return collection.countDocuments({ agentName: 'meta-agent' })
  }
}

// Singleton instance
let storageInstance: MetaOutputsStorage | null = null

/**
 * Get the singleton MetaOutputsStorage instance
 */
export function getMetaOutputsStorage(): MetaOutputsStorage {
  if (!storageInstance) {
    storageInstance = new MetaOutputsStorage()
  }
  return storageInstance
}
```

### Step 4: Create API Route

Create `app/api/agents/meta-agent/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { MetaAgent } from '@/lib/agents/meta-agent'
import { getMetaOutputsStorage } from '@/lib/storage/meta-outputs-storage'
import { getAgentConfigStorage } from '@/lib/storage/agent-config-storage'
import { getRequestMongoDBStorage } from '@/lib/storage/request-mongodb-storage'
import { RequestContext } from '@/types'
import { logger } from '@/utils/logger'

/**
 * API Route for Meta Agent
 * 
 * POST /api/agents/meta-agent
 * 
 * Body:
 * {
 *   context: {                    // Required: Context from other agents
 *     thoughts?: ThoughtAgentOutput;
 *     plan?: PlannerAgentOutput;
 *     critique?: CriticAgentOutput;
 *     confidenceScore?: ConfidenceScorerOutput;
 *   };
 *   requestContext: RequestContext; // Required: Request context
 *   agentId?: string;               // Optional: Agent config ID (defaults to 'meta-agent')
 * }
 * 
 * Returns:
 * {
 *   reasoningQuality: number;
 *   shouldReplan: boolean;
 *   shouldDeepenReasoning: boolean;
 *   recommendedActions: string[];
 *   assessment: string;
 *   requestId: string;
 *   requestContext: RequestContext;
 *   ...
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { context, requestContext, agentId } = body

    // Validate required fields
    if (!context || typeof context !== 'object') {
      logger.warn(`[Meta Agent API] Missing context`, { body })
      return NextResponse.json(
        { error: 'context (object) is required' },
        { status: 400 }
      )
    }

    if (!requestContext || !requestContext.requestId) {
      logger.warn(`[Meta Agent API] Missing requestContext`, { body })
      return NextResponse.json(
        { error: 'requestContext with requestId is required' },
        { status: 400 }
      )
    }

    // Resolve agent config
    const targetAgentId = agentId || 'meta-agent'
    const agentStorage = getAgentConfigStorage()
    const agentConfig = await agentStorage.getAgentConfig(targetAgentId)

    if (!agentConfig || !agentConfig.enabled) {
      logger.warn(`[Meta Agent API] Agent config not found or disabled`, { agentId: targetAgentId })
      return NextResponse.json(
        { error: `Agent '${targetAgentId}' not found or disabled. Please configure it in Settings > Agent Configurations.` },
        { status: 404 }
      )
    }

    // Initialize agent
    const agent = new MetaAgent()
    await agent.initialize(req.headers)

    // Update request context status
    const requestStorage = getRequestMongoDBStorage()
    const updatedRequestContext: RequestContext = {
      ...requestContext,
      status: 'in-progress',
    }
    await requestStorage.save(updatedRequestContext)

    // Assess reasoning
    logger.info(`[Meta Agent API] Assessing reasoning quality`, {
      requestId: requestContext.requestId,
      hasThoughts: !!context.thoughts,
      hasPlan: !!context.plan,
      hasCritique: !!context.critique,
      hasConfidenceScore: !!context.confidenceScore,
    })

    const result = await agent.assessReasoning(context, updatedRequestContext)

    // Store output in MongoDB
    try {
      const outputsStorage = getMetaOutputsStorage()
      await outputsStorage.save(result)
    } catch (error: any) {
      logger.error(`[Meta Agent API] Failed to store output:`, error.message)
      // Don't fail the request if storage fails
    }

    // Update request context to completed
    result.requestContext.status = 'completed'
    await requestStorage.save(result.requestContext)

    logger.info(`[Meta Agent API] Reasoning assessment completed`, {
      requestId: result.requestId,
      reasoningQuality: result.reasoningQuality,
      shouldReplan: result.shouldReplan,
      shouldDeepenReasoning: result.shouldDeepenReasoning,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    logger.error(`[Meta Agent API] Error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to assess reasoning' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint - returns meta output by requestId
 * 
 * Query params:
 * - requestId: string (optional) - If provided, returns meta output for that request
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const requestId = searchParams.get('requestId')

    // If requestId is provided, fetch meta output
    if (requestId) {
      const outputsStorage = getMetaOutputsStorage()
      const output = await outputsStorage.getByRequestId(requestId)
      
      if (!output) {
        return NextResponse.json(
          { error: 'Meta output not found for this request' },
          { status: 404 }
        )
      }

      return NextResponse.json(output, { status: 200 })
    }

    // Otherwise, return agent config
    const storage = getAgentConfigStorage()
    const config = await storage.getAgentConfig('meta-agent')

    if (!config) {
      return NextResponse.json(
        { error: 'Agent config not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ config }, { status: 200 })
  } catch (error: any) {
    logger.error(`[Meta Agent API] GET error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch agent config' },
      { status: 500 }
    )
  }
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
  it('should assess reasoning quality', async () => {
    const agent = new MetaAgent();
    // Note: initialize() requires MongoDB connection and agent config
    // In real tests, you'd mock these dependencies
    
    const requestContext = generateRequestId('test query');
    const result = await agent.assessReasoning({}, requestContext);

    expect(result.requestId).toBe(requestContext.requestId);
    expect(result.reasoningQuality).toBeGreaterThanOrEqual(0);
    expect(result.reasoningQuality).toBeLessThanOrEqual(1);
    expect(typeof result.shouldReplan).toBe('boolean');
    expect(typeof result.shouldDeepenReasoning).toBe('boolean');
    expect(Array.isArray(result.recommendedActions)).toBe(true);
  });
});
```

## MongoDB Storage Schema

The meta outputs are stored in the `meta_outputs` collection with the following structure:

```typescript
{
  _id: ObjectId,
  requestId: string,
  agentName: 'meta-agent',
  timestamp: Date,
  reasoningQuality: number,
  shouldReplan: boolean,
  shouldDeepenReasoning: boolean,
  recommendedActions: string[],
  assessment: string,
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

## Integration with Other Agents

The Meta Agent is typically called after Thought, Planner, and Critic agents have run:

```typescript
// Example usage in orchestrator
const thoughtOutput = await thoughtAgent.generateThought(userQuery, requestContext);
const planOutput = await plannerAgent.generatePlan(thoughtOutput, requestContext);
const critiqueOutput = await criticAgent.critiquePlan(planOutput, requestContext);
const confidenceOutput = await confidenceScorer.scoreConfidence([
  { agentName: 'thought-agent', score: thoughtOutput.thoughts[0].confidence, ... },
  { agentName: 'planner-agent', score: planOutput.plan.confidence, ... },
  { agentName: 'critic-agent', score: critiqueOutput.critique.overallScore, ... },
], requestContext);

const metaOutput = await metaAgent.assessReasoning({
  thoughts: thoughtOutput,
  plan: planOutput,
  critique: critiqueOutput,
  confidenceScore: confidenceOutput,
}, requestContext);

// Use metaOutput.shouldReplan or metaOutput.shouldDeepenReasoning to decide next steps
```

## Next Blueprint

**AGENT-11-ORCHESTRATOR.md** - Modular orchestrator system that coordinates all agents.

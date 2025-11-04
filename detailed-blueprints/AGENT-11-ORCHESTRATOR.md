# Agent Implementation Blueprint 11: Orchestrator System

## Overview

The **Orchestrator System** provides intelligent coordination of all agents in the cognitive architecture. It uses LLM-powered decision-making to route queries through appropriate agent sequences based on complexity and requirements.

**Key Responsibilities:**
- Route queries to appropriate agent sequences
- Coordinate agent execution based on complexity
- Make intelligent routing decisions using LLMs
- Handle replanning and adaptive flows
- Store orchestration history in MongoDB

**Architecture:**
```
BaseOrchestrator (abstract)
  ├── SimpleOrchestrator (complexity < 0.4)
  │   └── Flow: Complexity → Thought → Planner → Executor (skip Critic)
  ├── StandardOrchestrator (complexity 0.4-0.7)
  │   └── Flow: Complexity → Thought → Planner → Critic → Meta Agent → Executor
  └── AdaptiveOrchestrator (complexity > 0.7)
      └── Flow: Multi-pass reasoning, can loop back, uses all agents
```

## Prerequisites

- **AGENT-01** (Request ID System) - Required
- **AGENT-02** (Complexity Detector) - Required for routing decisions
- **AGENT-03** (Thought Agent) - Required
- **AGENT-04** (Planner Agent) - Required
- **AGENT-05** (Critic Agent) - Required for Standard and Adaptive
- **AGENT-06** (Confidence Scorer) - Recommended for Adaptive
- **AGENT-07** (Meta Agent) - Required for Standard and Adaptive
- **AGENT-08** (Executor Agent) - Required
- BaseAgent pattern implemented
- Agent configuration system (MongoDB storage)

## Step-by-Step Implementation

### Step 1: Add Orchestrator Types

Add to `types/index.ts`:

```typescript
/**
 * Orchestrator Type
 */
export type OrchestratorType = 'simple' | 'standard' | 'adaptive';

/**
 * Orchestrator Output
 */
export interface OrchestratorOutput extends AgentOutput {
  orchestratorType: OrchestratorType;
  flow: string[]; // Agent sequence executed
  results: {
    complexity?: ComplexityDetectorOutput;
    thought?: ThoughtAgentOutput;
    plan?: Plan;
    critique?: CriticAgentOutput;
    metaAssessment?: MetaAgentOutput;
    confidenceScore?: ConfidenceScorerOutput;
    execution?: ExecutorAgentOutput;
  };
  metadata: {
    totalDuration: number;
    agentSequence: string[];
    confidence: number;
    replanCount?: number; // For adaptive orchestrator
    skipCritic?: boolean; // For simple orchestrator
  };
}
```

### Step 2: Implement Base Orchestrator

Create `lib/agents/orchestrator/base-orchestrator.ts`:

```typescript
import { BaseAgent } from '../base-agent';
import { RequestContext, OrchestratorOutput, ComplexityDetectorOutput } from '@/types';
import { ThoughtAgent } from '../thought-agent';
import { PlannerAgent } from '../planner-agent';
import { CriticAgent } from '../critic-agent';
import { ExecutorAgent } from '../executor-agent';
import { MetaAgent } from '../meta-agent';
import { ConfidenceScorer } from '../confidence-scorer';
import { detectComplexity } from '../complexity-detector/orchestrator';
import { logger } from '@/utils/logger';

/**
 * Base Orchestrator
 * 
 * Abstract base class for all orchestrator implementations.
 * Provides common functionality for agent coordination.
 */
export abstract class BaseOrchestrator extends BaseAgent {
  protected thoughtAgent: ThoughtAgent;
  protected plannerAgent: PlannerAgent;
  protected criticAgent: CriticAgent;
  protected executorAgent: ExecutorAgent;
  protected metaAgent: MetaAgent;
  protected confidenceScorer: ConfidenceScorer;

  constructor(orchestratorId: string) {
    super(orchestratorId);
    // Initialize agent instances (dependency injection pattern)
    this.thoughtAgent = new ThoughtAgent();
    this.plannerAgent = new PlannerAgent();
    this.criticAgent = new CriticAgent();
    this.executorAgent = new ExecutorAgent();
    this.metaAgent = new MetaAgent();
    this.confidenceScorer = new ConfidenceScorer();
  }

  /**
   * Main orchestration method - must be implemented by subclasses
   */
  abstract orchestrate(
    userQuery: string,
    requestContext?: RequestContext,
    headers?: Headers
  ): Promise<OrchestratorOutput>;

  /**
   * Detect complexity of query
   */
  protected async detectComplexity(
    userQuery: string,
    requestContext?: RequestContext,
    headers?: Headers
  ): Promise<ComplexityDetectorOutput> {
    return await detectComplexity(
      userQuery,
      requestContext?.requestId,
      'complexity-detector',
      undefined,
      headers
    );
  }

  /**
   * Initialize all agents
   */
  protected async initializeAgents(headers?: Headers): Promise<void> {
    await Promise.all([
      this.thoughtAgent.initialize(headers),
      this.plannerAgent.initialize(headers),
      this.criticAgent.initialize(headers),
      this.executorAgent.initialize(headers),
      this.metaAgent.initialize(headers),
    ]);
  }

  /**
   * Build metadata for output
   */
  protected buildMetadata(
    startTime: number,
    flow: string[],
    results: OrchestratorOutput['results'],
    replanCount?: number,
    skipCritic?: boolean
  ): OrchestratorOutput['metadata'] {
    // Calculate overall confidence from results
    let confidence = 0.5; // Default
    if (results.confidenceScore) {
      confidence = results.confidenceScore.overallConfidence;
    } else if (results.metaAssessment) {
      confidence = results.metaAssessment.reasoningQuality;
    } else if (results.thought) {
      confidence = results.thought.thoughts[0]?.confidence || 0.5;
    }

    return {
      totalDuration: Date.now() - startTime,
      agentSequence: flow,
      confidence,
      replanCount,
      skipCritic,
    };
  }
}
```

### Step 3: Implement Simple Orchestrator

Create `lib/agents/orchestrator/simple-orchestrator.ts`:

```typescript
import { BaseOrchestrator } from './base-orchestrator';
import { RequestContext, OrchestratorOutput, OrchestratorType } from '@/types';
import { generateRequestId } from '@/lib/utils/request-id';
import { logger } from '@/utils/logger';

/**
 * Simple Orchestrator
 * 
 * Fast path for simple queries (complexity < 0.4).
 * Skips Critic Agent for speed.
 * 
 * Flow: Complexity Detector → Thought → Planner → Executor
 */
export class SimpleOrchestrator extends BaseOrchestrator {
  constructor() {
    super('simple-orchestrator');
  }

  async orchestrate(
    userQuery: string,
    requestContext?: RequestContext,
    headers?: Headers
  ): Promise<OrchestratorOutput> {
    const startTime = Date.now();
    const flow: string[] = [];

    // Initialize orchestrator and all agents
    await this.initialize(headers);
    await this.initializeAgents(headers);

    // Generate or use existing request context
    let context = requestContext || generateRequestId(userQuery);
    flow.push('complexity-detector');

    // Step 1: Detect complexity
    logger.info(`[SimpleOrchestrator] Detecting complexity`);
    const complexity = await this.detectComplexity(userQuery, context, headers);
    context = complexity.requestContext;
    flow.push('thought-agent');

    // Step 2: Generate thoughts
    logger.info(`[SimpleOrchestrator] Generating thoughts`);
    const thoughtOutput = await this.thoughtAgent.generateThought(
      userQuery,
      context,
      {
        complexityScore: complexity.complexity.score,
        reasoningPasses: complexity.complexity.reasoningPasses,
      }
    );
    context = thoughtOutput.requestContext;
    flow.push('planner-agent');

    // Step 3: Generate plan
    logger.info(`[SimpleOrchestrator] Generating plan`);
    const planOutput = await this.plannerAgent.generatePlan(
      thoughtOutput,
      userQuery,
      context
    );
    context = planOutput.requestContext;
    flow.push('executor-agent');

    // Step 4: Execute plan (skip Critic for speed)
    logger.info(`[SimpleOrchestrator] Executing plan`);
    const executionOutput = await this.executorAgent.executePlan(
      planOutput.plan,
      context,
      undefined, // No critique
      undefined, // No user feedback
      userQuery
    );
    context = executionOutput.requestContext;

    // Build output
    return {
      requestId: context.requestId,
      agentName: 'simple-orchestrator',
      timestamp: new Date(),
      requestContext: context,
      orchestratorType: 'simple' as OrchestratorType,
      flow,
      results: {
        complexity,
        thought: thoughtOutput,
        plan: planOutput.plan,
        execution: executionOutput,
      },
      metadata: this.buildMetadata(startTime, flow, {
        complexity,
        thought: thoughtOutput,
        plan: planOutput.plan,
        execution: executionOutput,
      }, undefined, true), // skipCritic = true
    };
  }
}
```

### Step 4: Implement Standard Orchestrator

Create `lib/agents/orchestrator/standard-orchestrator.ts`:

```typescript
import { BaseOrchestrator } from './base-orchestrator';
import { RequestContext, OrchestratorOutput, OrchestratorType } from '@/types';
import { generateRequestId } from '@/lib/utils/request-id';
import { logger } from '@/utils/logger';

/**
 * Standard Orchestrator
 * 
 * Full pipeline for medium complexity queries (0.4-0.7).
 * Includes all quality checks.
 * 
 * Flow: Complexity → Thought → Planner → Critic → Meta Agent → Executor
 */
export class StandardOrchestrator extends BaseOrchestrator {
  constructor() {
    super('standard-orchestrator');
  }

  async orchestrate(
    userQuery: string,
    requestContext?: RequestContext,
    headers?: Headers
  ): Promise<OrchestratorOutput> {
    const startTime = Date.now();
    const flow: string[] = [];

    // Initialize orchestrator and all agents
    await this.initialize(headers);
    await this.initializeAgents(headers);

    // Generate or use existing request context
    let context = requestContext || generateRequestId(userQuery);
    flow.push('complexity-detector');

    // Step 1: Detect complexity
    logger.info(`[StandardOrchestrator] Detecting complexity`);
    const complexity = await this.detectComplexity(userQuery, context, headers);
    context = complexity.requestContext;
    flow.push('thought-agent');

    // Step 2: Generate thoughts
    logger.info(`[StandardOrchestrator] Generating thoughts`);
    const thoughtOutput = await this.thoughtAgent.generateThought(
      userQuery,
      context,
      {
        complexityScore: complexity.complexity.score,
        reasoningPasses: complexity.complexity.reasoningPasses,
      }
    );
    context = thoughtOutput.requestContext;
    flow.push('planner-agent');

    // Step 3: Generate plan
    logger.info(`[StandardOrchestrator] Generating plan`);
    const planOutput = await this.plannerAgent.generatePlan(
      thoughtOutput,
      userQuery,
      context
    );
    context = planOutput.requestContext;
    flow.push('critic-agent');

    // Step 4: Critique plan
    logger.info(`[StandardOrchestrator] Critiquing plan`);
    const critiqueOutput = await this.criticAgent.critiquePlan(
      planOutput.plan,
      context,
      userQuery
    );
    context = critiqueOutput.requestContext;
    flow.push('meta-agent');

    // Step 5: Meta assessment
    logger.info(`[StandardOrchestrator] Meta assessment`);
    const metaOutput = await this.metaAgent.assessReasoning(
      {
        thoughts: thoughtOutput,
        plan: planOutput,
        critique: critiqueOutput,
      },
      context
    );
    context = metaOutput.requestContext;

    // If meta agent says we should replan, log warning but continue
    if (metaOutput.shouldReplan) {
      logger.warn(`[StandardOrchestrator] Meta agent recommends replanning, but continuing with current plan`);
    }

    flow.push('executor-agent');

    // Step 6: Execute plan
    logger.info(`[StandardOrchestrator] Executing plan`);
    const executionOutput = await this.executorAgent.executePlan(
      planOutput.plan,
      context,
      critiqueOutput,
      undefined, // No user feedback
      userQuery
    );
    context = executionOutput.requestContext;

    // Build output
    return {
      requestId: context.requestId,
      agentName: 'standard-orchestrator',
      timestamp: new Date(),
      requestContext: context,
      orchestratorType: 'standard' as OrchestratorType,
      flow,
      results: {
        complexity,
        thought: thoughtOutput,
        plan: planOutput.plan,
        critique: critiqueOutput,
        metaAssessment: metaOutput,
        execution: executionOutput,
      },
      metadata: this.buildMetadata(startTime, flow, {
        complexity,
        thought: thoughtOutput,
        plan: planOutput.plan,
        critique: critiqueOutput,
        metaAssessment: metaOutput,
        execution: executionOutput,
      }),
    };
  }
}
```

### Step 5: Implement Adaptive Orchestrator

Create `lib/agents/orchestrator/adaptive-orchestrator.ts`:

```typescript
import { BaseOrchestrator } from './base-orchestrator';
import { RequestContext, OrchestratorOutput, OrchestratorType } from '@/types';
import { generateRequestId } from '@/lib/utils/request-id';
import { logger } from '@/utils/logger';

/**
 * Adaptive Orchestrator
 * 
 * Advanced orchestration for complex queries (>0.7).
 * Can trigger multi-pass reasoning and replanning.
 * 
 * Flow: Complexity → Thought → Planner → Critic → Meta Agent → (if needed) Replan → Executor
 */
export class AdaptiveOrchestrator extends BaseOrchestrator {
  private readonly MAX_REPLAN_ATTEMPTS = 3;

  constructor() {
    super('adaptive-orchestrator');
  }

  async orchestrate(
    userQuery: string,
    requestContext?: RequestContext,
    headers?: Headers
  ): Promise<OrchestratorOutput> {
    const startTime = Date.now();
    const flow: string[] = [];
    let replanCount = 0;

    // Initialize orchestrator and all agents
    await this.initialize(headers);
    await this.initializeAgents(headers);

    // Generate or use existing request context
    let context = requestContext || generateRequestId(userQuery);
    flow.push('complexity-detector');

    // Step 1: Detect complexity
    logger.info(`[AdaptiveOrchestrator] Detecting complexity`);
    const complexity = await this.detectComplexity(userQuery, context, headers);
    context = complexity.requestContext;

    // Multi-pass reasoning loop
    let thoughtOutput: any;
    let planOutput: any;
    let critiqueOutput: any;
    let metaOutput: any;
    let confidenceOutput: any;

    // Determine reasoning passes from complexity
    const reasoningPasses = complexity.complexity.reasoningPasses;

    // Step 2: Multi-pass thought generation
    flow.push('thought-agent');
    logger.info(`[AdaptiveOrchestrator] Generating thoughts (${reasoningPasses} passes)`);
    
    if (reasoningPasses === 1) {
      thoughtOutput = await this.thoughtAgent.generateThought(
        userQuery,
        context,
        {
          complexityScore: complexity.complexity.score,
          reasoningPasses: 1,
        }
      );
    } else {
      // Multi-pass reasoning
      let previousThought: any = null;
      for (let pass = 1; pass <= reasoningPasses; pass++) {
        if (pass === 1) {
          thoughtOutput = await this.thoughtAgent.generateThought(
            userQuery,
            context,
            {
              complexityScore: complexity.complexity.score,
              reasoningPasses,
            }
          );
          previousThought = thoughtOutput.thoughts[0];
        } else {
          thoughtOutput = await this.thoughtAgent.generateThoughtLoop(
            userQuery,
            previousThought,
            pass,
            reasoningPasses,
            context
          );
          previousThought = thoughtOutput.thoughts[0];
        }
        context = thoughtOutput.requestContext;
      }
    }

    // Replanning loop
    let shouldReplan = true;
    let replanAttempts = 0;

    while (shouldReplan && replanAttempts < this.MAX_REPLAN_ATTEMPTS) {
      replanAttempts++;
      if (replanAttempts > 1) {
        logger.info(`[AdaptiveOrchestrator] Replanning attempt ${replanAttempts}`);
        flow.push(`replan-${replanAttempts}`);
        replanCount++;
      }

      // Step 3: Generate/regenerate plan
      flow.push('planner-agent');
      logger.info(`[AdaptiveOrchestrator] Generating plan`);
      planOutput = await this.plannerAgent.generatePlan(
        thoughtOutput,
        userQuery,
        context
      );
      context = planOutput.requestContext;
      flow.push('critic-agent');

      // Step 4: Critique plan
      logger.info(`[AdaptiveOrchestrator] Critiquing plan`);
      critiqueOutput = await this.criticAgent.critiquePlan(
        planOutput.plan,
        context,
        userQuery
      );
      context = critiqueOutput.requestContext;
      flow.push('confidence-scorer');

      // Step 5: Score confidence
      logger.info(`[AdaptiveOrchestrator] Scoring confidence`);
      confidenceOutput = await this.confidenceScorer.scoreConfidence(
        [
          {
            agentName: 'thought-agent',
            score: thoughtOutput.thoughts[0]?.confidence || 0.5,
            reasoning: 'Thought agent confidence',
            timestamp: new Date(),
          },
          {
            agentName: 'planner-agent',
            score: planOutput.plan.confidence,
            reasoning: 'Planner agent confidence',
            timestamp: new Date(),
          },
          {
            agentName: 'critic-agent',
            score: critiqueOutput.critique.overallScore,
            reasoning: 'Critic agent confidence',
            timestamp: new Date(),
          },
        ],
        context
      );
      context = confidenceOutput.requestContext;
      flow.push('meta-agent');

      // Step 6: Meta assessment
      logger.info(`[AdaptiveOrchestrator] Meta assessment`);
      metaOutput = await this.metaAgent.assessReasoning(
        {
          thoughts: thoughtOutput,
          plan: planOutput,
          critique: critiqueOutput,
          confidenceScore: confidenceOutput,
        },
        context
      );
      context = metaOutput.requestContext;

      // Decide if we should replan
      shouldReplan = metaOutput.shouldReplan && replanAttempts < this.MAX_REPLAN_ATTEMPTS;
      
      if (shouldReplan) {
        logger.warn(`[AdaptiveOrchestrator] Meta agent recommends replanning (attempt ${replanAttempts}/${this.MAX_REPLAN_ATTEMPTS})`);
        // Could refine thoughts based on feedback here
      }
    }

    if (replanAttempts >= this.MAX_REPLAN_ATTEMPTS && shouldReplan) {
      logger.warn(`[AdaptiveOrchestrator] Max replan attempts reached, proceeding with current plan`);
    }

    flow.push('executor-agent');

    // Step 7: Execute plan
    logger.info(`[AdaptiveOrchestrator] Executing plan`);
    const executionOutput = await this.executorAgent.executePlan(
      planOutput.plan,
      context,
      critiqueOutput,
      undefined, // No user feedback
      userQuery
    );
    context = executionOutput.requestContext;

    // Build output
    return {
      requestId: context.requestId,
      agentName: 'adaptive-orchestrator',
      timestamp: new Date(),
      requestContext: context,
      orchestratorType: 'adaptive' as OrchestratorType,
      flow,
      results: {
        complexity,
        thought: thoughtOutput,
        plan: planOutput.plan,
        critique: critiqueOutput,
        metaAssessment: metaOutput,
        confidenceScore: confidenceOutput,
        execution: executionOutput,
      },
      metadata: this.buildMetadata(
        startTime,
        flow,
        {
          complexity,
          thought: thoughtOutput,
          plan: planOutput.plan,
          critique: critiqueOutput,
          metaAssessment: metaOutput,
          confidenceScore: confidenceOutput,
          execution: executionOutput,
        },
        replanCount
      ),
    };
  }
}
```

### Step 6: Implement Orchestrator Factory

Create `lib/agents/orchestrator/orchestrator-factory.ts`:

```typescript
import { BaseOrchestrator } from './base-orchestrator';
import { SimpleOrchestrator } from './simple-orchestrator';
import { StandardOrchestrator } from './standard-orchestrator';
import { AdaptiveOrchestrator } from './adaptive-orchestrator';
import { OrchestratorType, ComplexityDetectorOutput } from '@/types';
import { detectComplexity } from '../complexity-detector/orchestrator';
import { logger } from '@/utils/logger';

/**
 * Orchestrator Factory
 * 
 * Auto-selects the appropriate orchestrator based on query complexity
 * or can be explicitly configured.
 */
export class OrchestratorFactory {
  /**
   * Create orchestrator based on complexity
   */
  static async createOrchestrator(
    userQuery: string,
    explicitType?: OrchestratorType,
    headers?: Headers
  ): Promise<BaseOrchestrator> {
    // If explicit type provided, use it
    if (explicitType) {
      logger.info(`[OrchestratorFactory] Using explicit orchestrator type: ${explicitType}`);
      return this.createByType(explicitType);
    }

    // Otherwise, detect complexity and select automatically
    logger.info(`[OrchestratorFactory] Auto-selecting orchestrator based on complexity`);
    const complexity = await detectComplexity(
      userQuery,
      undefined,
      'complexity-detector',
      undefined,
      headers
    );

    const score = complexity.complexity.score;

    if (score < 0.4) {
      logger.info(`[OrchestratorFactory] Selected SimpleOrchestrator (complexity: ${score.toFixed(2)})`);
      return new SimpleOrchestrator();
    } else if (score < 0.7) {
      logger.info(`[OrchestratorFactory] Selected StandardOrchestrator (complexity: ${score.toFixed(2)})`);
      return new StandardOrchestrator();
    } else {
      logger.info(`[OrchestratorFactory] Selected AdaptiveOrchestrator (complexity: ${score.toFixed(2)})`);
      return new AdaptiveOrchestrator();
    }
  }

  /**
   * Create orchestrator by explicit type
   */
  static createByType(type: OrchestratorType): BaseOrchestrator {
    switch (type) {
      case 'simple':
        return new SimpleOrchestrator();
      case 'standard':
        return new StandardOrchestrator();
      case 'adaptive':
        return new AdaptiveOrchestrator();
      default:
        throw new Error(`Unknown orchestrator type: ${type}`);
    }
  }
}
```

### Step 7: Create MongoDB Storage

Create `lib/storage/orchestrator-outputs-storage.ts`:

```typescript
/**
 * Orchestrator Outputs Storage using MongoDB
 * 
 * Stores OrchestratorOutput results for history tracking and analytics.
 */

import { getCollection } from './mongodb-client'
import { OrchestratorOutput } from '@/types'

const COLLECTION_NAME = 'orchestrator_outputs'

/**
 * Ensure indexes for orchestrator outputs collection
 */
async function ensureIndexes(): Promise<void> {
  try {
    const collection = await getCollection(COLLECTION_NAME)
    
    // Create indexes
    await collection.createIndex({ requestId: 1 })
    await collection.createIndex({ orchestratorType: 1 })
    await collection.createIndex({ timestamp: -1 }) // Descending for newest first
    await collection.createIndex({ 'metadata.confidence': 1 }) // For filtering by confidence
    await collection.createIndex({ 'metadata.replanCount': 1 }) // For filtering by replan count
    
    console.log('[MongoDB] Indexes ensured for orchestrator_outputs collection')
  } catch (error) {
    console.error('[MongoDB] Failed to create indexes:', error)
    // Don't throw - indexes might already exist
  }
}

/**
 * Orchestrator Outputs Storage Class
 */
export class OrchestratorOutputsStorage {
  /**
   * Ensure indexes are created (call once on startup)
   */
  async initialize(): Promise<void> {
    await ensureIndexes()
  }

  /**
   * Store an orchestrator output
   */
  async save(output: OrchestratorOutput): Promise<void> {
    const collection = await getCollection<OrchestratorOutput & { _id?: any }>(
      COLLECTION_NAME
    )

    // Prepare document for storage
    const doc: any = {
      requestId: output.requestId,
      agentName: output.agentName,
      timestamp: output.timestamp instanceof Date ? output.timestamp : new Date(output.timestamp),
      orchestratorType: output.orchestratorType,
      flow: output.flow,
      results: output.results, // Store full results object
      metadata: output.metadata,
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
  async getByRequestId(requestId: string): Promise<OrchestratorOutput | null> {
    const collection = await getCollection<OrchestratorOutput>(COLLECTION_NAME)

    const result = await collection.findOne({ requestId })

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
    } as OrchestratorOutput
  }

  /**
   * Get all outputs with optional filters
   */
  async getAll(filters?: {
    orchestratorType?: 'simple' | 'standard' | 'adaptive'
    minConfidence?: number
    maxConfidence?: number
    startDate?: Date
    endDate?: Date
  }): Promise<OrchestratorOutput[]> {
    const collection = await getCollection<OrchestratorOutput>(COLLECTION_NAME)

    const query: any = {}

    if (filters) {
      if (filters.orchestratorType) {
        query.orchestratorType = filters.orchestratorType
      }

      if (filters.minConfidence !== undefined || filters.maxConfidence !== undefined) {
        query['metadata.confidence'] = {}
        if (filters.minConfidence !== undefined) {
          query['metadata.confidence'].$gte = filters.minConfidence
        }
        if (filters.maxConfidence !== undefined) {
          query['metadata.confidence'].$lte = filters.maxConfidence
        }
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
    })) as OrchestratorOutput[]
  }

  /**
   * Count total outputs
   */
  async count(): Promise<number> {
    const collection = await getCollection(COLLECTION_NAME)
    return collection.countDocuments()
  }
}

// Singleton instance
let storageInstance: OrchestratorOutputsStorage | null = null

/**
 * Get the singleton OrchestratorOutputsStorage instance
 */
export function getOrchestratorOutputsStorage(): OrchestratorOutputsStorage {
  if (!storageInstance) {
    storageInstance = new OrchestratorOutputsStorage()
  }
  return storageInstance
}
```

### Step 8: Create Main API Route

Create `app/api/orchestrator/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { OrchestratorFactory } from '@/lib/agents/orchestrator/orchestrator-factory'
import { getOrchestratorOutputsStorage } from '@/lib/storage/orchestrator-outputs-storage'
import { getRequestMongoDBStorage } from '@/lib/storage/request-mongodb-storage'
import { OrchestratorType } from '@/types'
import { logger } from '@/utils/logger'

/**
 * Main Orchestrator API Route
 * 
 * POST /api/orchestrator
 * 
 * Body:
 * {
 *   userQuery: string;              // Required: User query to orchestrate
 *   orchestratorType?: OrchestratorType; // Optional: Force specific orchestrator type
 * }
 * 
 * Returns:
 * {
 *   orchestratorType: OrchestratorType;
 *   flow: string[];
 *   results: {...};
 *   metadata: {...};
 *   requestId: string;
 *   requestContext: RequestContext;
 *   ...
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userQuery, orchestratorType } = body

    // Validate required fields
    if (!userQuery || typeof userQuery !== 'string') {
      logger.warn(`[Orchestrator API] Missing userQuery`, { body })
      return NextResponse.json(
        { error: 'userQuery (string) is required' },
        { status: 400 }
      )
    }

    // Create orchestrator
    logger.info(`[Orchestrator API] Creating orchestrator`, {
      userQueryLength: userQuery.length,
      explicitType: orchestratorType,
    })

    const orchestrator = await OrchestratorFactory.createOrchestrator(
      userQuery,
      orchestratorType,
      req.headers
    )

    // Orchestrate
    logger.info(`[Orchestrator API] Starting orchestration`, {
      orchestratorType: orchestrator.constructor.name,
    })

    const result = await orchestrator.orchestrate(userQuery, undefined, req.headers)

    // Store output in MongoDB
    try {
      const outputsStorage = getOrchestratorOutputsStorage()
      await outputsStorage.save(result)
    } catch (error: any) {
      logger.error(`[Orchestrator API] Failed to store output:`, error.message)
      // Don't fail the request if storage fails
    }

    // Update request context to completed
    const requestStorage = getRequestMongoDBStorage()
    result.requestContext.status = 'completed'
    await requestStorage.save(result.requestContext)

    logger.info(`[Orchestrator API] Orchestration completed`, {
      requestId: result.requestId,
      orchestratorType: result.orchestratorType,
      flow: result.flow,
      duration: result.metadata.totalDuration,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    logger.error(`[Orchestrator API] Error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to orchestrate query' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint - returns orchestrator output by requestId
 * 
 * Query params:
 * - requestId: string (optional) - If provided, returns orchestrator output for that request
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const requestId = searchParams.get('requestId')

    if (requestId) {
      const outputsStorage = getOrchestratorOutputsStorage()
      const output = await outputsStorage.getByRequestId(requestId)
      
      if (!output) {
        return NextResponse.json(
          { error: 'Orchestrator output not found for this request' },
          { status: 404 }
        )
      }

      return NextResponse.json(output, { status: 200 })
    }

    return NextResponse.json(
      { error: 'requestId query parameter is required' },
      { status: 400 }
    )
  } catch (error: any) {
    logger.error(`[Orchestrator API] GET error:`, error.message, error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch orchestrator output' },
      { status: 500 }
    )
  }
}
```

## Request ID Integration

All orchestrators use the Request ID system:

```typescript
// Generate or use existing request context
let context = requestContext || generateRequestId(userQuery);

// Each agent adds itself to the chain
context = addAgentToChain(context, 'agent-name');
```

## Testing

Create `lib/agents/orchestrator/orchestrator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { OrchestratorFactory } from './orchestrator-factory';
import { SimpleOrchestrator } from './simple-orchestrator';
import { StandardOrchestrator } from './standard-orchestrator';
import { AdaptiveOrchestrator } from './adaptive-orchestrator';

describe('OrchestratorFactory', () => {
  it('should create SimpleOrchestrator for explicit type', () => {
    const orchestrator = OrchestratorFactory.createByType('simple');
    expect(orchestrator).toBeInstanceOf(SimpleOrchestrator);
  });

  it('should create StandardOrchestrator for explicit type', () => {
    const orchestrator = OrchestratorFactory.createByType('standard');
    expect(orchestrator).toBeInstanceOf(StandardOrchestrator);
  });

  it('should create AdaptiveOrchestrator for explicit type', () => {
    const orchestrator = OrchestratorFactory.createByType('adaptive');
    expect(orchestrator).toBeInstanceOf(AdaptiveOrchestrator);
  });

  it('should auto-select orchestrator based on complexity', async () => {
    // Simple query
    const simpleOrchestrator = await OrchestratorFactory.createOrchestrator('list all facilities');
    expect(simpleOrchestrator).toBeInstanceOf(SimpleOrchestrator);

    // Complex query
    const complexOrchestrator = await OrchestratorFactory.createOrchestrator(
      'analyze all facilities, identify contamination patterns, compare with historical data, and suggest improvements'
    );
    expect(complexOrchestrator).toBeInstanceOf(AdaptiveOrchestrator);
  });
});
```

## MongoDB Storage Schema

The orchestrator outputs are stored in the `orchestrator_outputs` collection with the following structure:

```typescript
{
  _id: ObjectId,
  requestId: string,
  agentName: string, // 'simple-orchestrator' | 'standard-orchestrator' | 'adaptive-orchestrator'
  timestamp: Date,
  orchestratorType: 'simple' | 'standard' | 'adaptive',
  flow: string[], // Agent sequence executed
  results: {
    complexity?: ComplexityDetectorOutput,
    thought?: ThoughtAgentOutput,
    plan?: Plan,
    critique?: CriticAgentOutput,
    metaAssessment?: MetaAgentOutput,
    confidenceScore?: ConfidenceScorerOutput,
    execution?: ExecutorAgentOutput
  },
  metadata: {
    totalDuration: number,
    agentSequence: string[],
    confidence: number,
    replanCount?: number,
    skipCritic?: boolean
  },
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

## Configuration

Orchestrators can be configured via MongoDB AgentConfig:

```typescript
// Example agent configs for orchestrators
{
  agentId: 'simple-orchestrator',
  enabled: true,
  modelId: 'claude-sonnet-4',
  parameters: {
    temperature: 0.3,
    maxTokens: 2000,
  }
}

{
  agentId: 'standard-orchestrator',
  enabled: true,
  modelId: 'claude-sonnet-4',
  parameters: {
    temperature: 0.4,
    maxTokens: 3000,
  }
}

{
  agentId: 'adaptive-orchestrator',
  enabled: true,
  modelId: 'claude-sonnet-4',
  parameters: {
    temperature: 0.5,
    maxTokens: 4000,
  }
}
```

## Integration Example

```typescript
// In a chat interface or API route
import { OrchestratorFactory } from '@/lib/agents/orchestrator/orchestrator-factory';

// Auto-select orchestrator
const orchestrator = await OrchestratorFactory.createOrchestrator(userQuery);
const result = await orchestrator.orchestrate(userQuery);

// Or explicitly use a specific orchestrator
const simpleOrchestrator = OrchestratorFactory.createByType('simple');
const result = await simpleOrchestrator.orchestrate(userQuery);

// Access results
console.log('Execution result:', result.results.execution);
console.log('Confidence:', result.metadata.confidence);
console.log('Flow:', result.flow);
```

## Next Steps

1. Test each orchestrator type with various queries
2. Verify Request ID propagation through all agents
3. Test replanning logic in AdaptiveOrchestrator
4. Monitor performance and adjust thresholds
5. Integrate with chat interface


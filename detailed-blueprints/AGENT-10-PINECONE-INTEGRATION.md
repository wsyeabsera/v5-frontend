# Agent Implementation Blueprint 10: Pinecone Integration

## Overview

This blueprint provides the **central Pinecone integration guide** for storing and retrieving agent outputs. Pinecone enables the system to learn from past reasoning patterns and improve over time.

**Key Responsibilities:**
- Store all agent outputs as vectors in Pinecone
- Enable semantic search across past reasoning
- Retrieve similar thoughts/plans for improvement
- Maintain metadata for request ID chaining

## Prerequisites

- Pinecone account and API key
- Pinecone index created
- Understanding of vector embeddings
- `@pinecone-database/pinecone` package installed

## Step-by-Step Implementation

### Step 1: Install Dependencies

```bash
npm install @pinecone-database/pinecone openai
# or use your preferred embedding model
```

### Step 2: Create Pinecone Client

Create `lib/pinecone/client.ts`:

```typescript
import { Pinecone } from '@pinecone-database/pinecone';

/**
 * Pinecone Client
 * 
 * Singleton client for Pinecone operations.
 * Initialize once and reuse across the application.
 */
let pineconeClient: Pinecone | null = null;

/**
 * Get or create Pinecone client
 * 
 * This is a singleton pattern - we only want one client instance.
 * 
 * @returns Pinecone client instance
 */
export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY environment variable is required');
    }

    pineconeClient = new Pinecone({
      apiKey,
    });
  }

  return pineconeClient;
}

/**
 * Get Pinecone index
 * 
 * @param indexName - Name of the index (default: 'agent-outputs')
 * @returns Index instance
 */
export function getPineconeIndex(indexName: string = 'agent-outputs') {
  const client = getPineconeClient();
  return client.index(indexName);
}
```

### Step 3: Create Embedding Service

Create `lib/pinecone/embeddings.ts`:

```typescript
import OpenAI from 'openai';

/**
 * Generate embedding for text
 * 
 * This converts text into a vector that can be stored in Pinecone.
 * We use OpenAI's text-embedding-3-small model (cost-effective, good quality).
 * 
 * @param text - Text to embed
 * @returns Embedding vector (array of numbers)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY required for embeddings');
  }

  const openai = new OpenAI({ apiKey });

  const response = await await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts (batch)
 * 
 * More efficient than calling generateEmbedding multiple times.
 * 
 * @param texts - Array of texts to embed
 * @returns Array of embedding vectors
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY required for embeddings');
  }

  const openai = new OpenAI({ apiKey });

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });

  return response.data.map(item => item.embedding);
}
```

### Step 4: Create Storage Service

Create `lib/pinecone/storage.ts`:

```typescript
import { getPineconeIndex } from './client';
import { generateEmbedding } from './embeddings';
import { AgentOutput } from '@/types';

/**
 * Store agent output in Pinecone
 * 
 * This is the main function for storing agent outputs.
 * It:
 * 1. Generates an embedding from the content
 * 2. Stores the vector with metadata
 * 3. Links it to the Request ID for chaining
 * 
 * @param output - Agent output to store
 * @param content - Text content to embed (for semantic search)
 * @param namespace - Optional namespace (default: agent name)
 */
export async function storeAgentOutput(
  output: AgentOutput,
  content: string,
  namespace?: string
): Promise<void> {
  // Generate embedding from content
  const embedding = await generateEmbedding(content);

  // Get index
  const index = getPineconeIndex();
  const ns = index.namespace(namespace || output.agentName);

  // Create vector ID (unique per request + agent)
  const vectorId = `${output.requestId}-${output.agentName}-${Date.now()}`;

  // Prepare metadata
  const metadata = {
    requestId: output.requestId,
    agentName: output.agentName,
    agentChain: JSON.stringify(output.requestContext.agentChain),
    timestamp: output.timestamp.toISOString(),
    // Include agent-specific metadata
    ...extractAgentMetadata(output),
  };

  // Upsert to Pinecone
  await ns.upsert([
    {
      id: vectorId,
      values: embedding,
      metadata,
    },
  ]);
}

/**
 * Extract agent-specific metadata
 * 
 * Different agents have different output structures.
 * This extracts relevant metadata for each agent type.
 */
function extractAgentMetadata(output: AgentOutput): Record<string, any> {
  const base: Record<string, any> = {};

  // Add agent-specific fields
  // Example: if output has 'complexity' field, include it
  if ('complexity' in output) {
    base.complexityScore = (output as any).complexity?.score;
  }

  if ('confidence' in output) {
    base.confidence = (output as any).confidence;
  }

  if ('overallConfidence' in output) {
    base.overallConfidence = (output as any).overallConfidence;
  }

  // Add more agent-specific fields as needed

  return base;
}

/**
 * Retrieve similar agent outputs
 * 
 * This enables finding similar past reasoning for improvement.
 * 
 * @param query - Text query to search for
 * @param agentName - Filter by agent name (optional)
 * @param requestId - Filter by request ID (optional)
 * @param topK - Number of results (default: 5)
 * @returns Array of similar outputs with scores
 */
export async function findSimilarOutputs(
  query: string,
  options: {
    agentName?: string;
    requestId?: string;
    topK?: number;
  } = {}
): Promise<Array<{ output: any; score: number }>> {
  const { agentName, requestId, topK = 5 } = options;

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);

  // Get index
  const index = getPineconeIndex();
  const ns = index.namespace(agentName || 'default');

  // Build filter
  const filter: any = {};
  if (requestId) {
    filter.requestId = { $eq: requestId };
  }

  // Query Pinecone
  const queryResponse = await ns.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
  });

  // Transform results
  return (queryResponse.matches || []).map(match => ({
    output: match.metadata,
    score: match.score || 0,
  }));
}

/**
 * Retrieve all outputs for a Request ID
 * 
 * This enables tracing a complete reasoning chain.
 * 
 * @param requestId - Request ID to query
 * @returns Array of all agent outputs in the chain
 */
export async function getRequestChain(requestId: string): Promise<any[]> {
  const index = getPineconeIndex();
  
  // Query all namespaces (or use a unified namespace)
  const results: any[] = [];
  
  // Query each agent namespace
  const agentNames = [
    'complexity-detector',
    'thought-agent',
    'planner-agent',
    'critic-agent',
    'confidence-scorer',
    'meta-agent',
    'simulation-agent',
    'reflection-agent',
  ];

  for (const agentName of agentNames) {
    try {
      const ns = index.namespace(agentName);
      const queryResponse = await ns.query({
        vector: new Array(1536).fill(0), // Dummy vector for metadata-only query
        topK: 100,
        includeMetadata: true,
        filter: {
          requestId: { $eq: requestId },
        },
      });

      results.push(...(queryResponse.matches || []));
    } catch (error) {
      // Namespace might not exist, continue
      console.warn(`Namespace ${agentName} not found`);
    }
  }

  // Sort by timestamp
  return results
    .map(m => m.metadata)
    .sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
}
```

### Step 5: Create Storage Helper for Each Agent

Create `lib/pinecone/agent-storage.ts`:

```typescript
import { storeAgentOutput, findSimilarOutputs } from './storage';
import {
  ComplexityDetectorOutput,
  ThoughtAgentOutput,
  PlannerAgentOutput,
  CriticAgentOutput,
  ConfidenceScorerOutput,
  MetaAgentOutput,
  SimulationAgentOutput,
  ReflectionAgentOutput,
} from '@/types';

/**
 * Store Complexity Detector output
 */
export async function storeComplexityOutput(output: ComplexityDetectorOutput): Promise<void> {
  const content = `Complexity analysis: ${output.userQuery}. Score: ${output.complexity.score}. Reasoning passes: ${output.complexity.reasoningPasses}`;
  await storeAgentOutput(output, content, 'complexity-detector');
}

/**
 * Store Thought Agent output
 */
export async function storeThoughtOutput(output: ThoughtAgentOutput): Promise<void> {
  const primaryThought = output.thoughts[0];
  const content = `Thought: ${primaryThought?.reasoning}. Approaches: ${primaryThought?.approaches.join(', ')}`;
  await storeAgentOutput(output, content, 'thought-agent');
}

/**
 * Store Planner Agent output
 */
export async function storePlannerOutput(output: PlannerAgentOutput): Promise<void> {
  const content = `Plan: ${output.plan.goal}. Steps: ${output.plan.steps.map(s => s.description).join(', ')}`;
  await storeAgentOutput(output, content, 'planner-agent');
}

/**
 * Store Critic Agent output
 */
export async function storeCriticOutput(output: CriticAgentOutput): Promise<void> {
  const content = `Critique: Score ${output.critique.overallScore}. Recommendation: ${output.critique.recommendation}. ${output.critique.rationale}`;
  await storeAgentOutput(output, content, 'critic-agent');
}

/**
 * Store Confidence Scorer output
 */
export async function storeConfidenceOutput(output: ConfidenceScorerOutput): Promise<void> {
  const content = `Confidence: ${output.overallConfidence}. Decision: ${output.decision}. ${output.reasoning}`;
  await storeAgentOutput(output, content, 'confidence-scorer');
}

/**
 * Store Meta-Agent output
 */
export async function storeMetaOutput(output: MetaAgentOutput): Promise<void> {
  const content = `Meta-assessment: Quality ${output.reasoningQuality}. Should replan: ${output.shouldReplan}. ${output.assessment}`;
  await storeAgentOutput(output, content, 'meta-agent');
}

/**
 * Store Simulation Agent output
 */
export async function storeSimulationOutput(output: SimulationAgentOutput): Promise<void> {
  const content = `Simulation: ${output.mostLikelyOutcome}. Risk: ${output.riskLevel}. Scenarios: ${output.scenarios.length}`;
  await storeAgentOutput(output, content, 'simulation-agent');
}

/**
 * Store Reflection Agent output
 */
export async function storeReflectionOutput(output: ReflectionAgentOutput): Promise<void> {
  const content = `Reflection: Success rate ${output.successRate}. Insights: ${output.insights.join(', ')}`;
  await storeAgentOutput(output, content, 'reflection-agent');
}
```

### Step 6: Environment Variables

Add to `.env.local`:

```env
PINECONE_API_KEY=your-pinecone-api-key
OPENAI_API_KEY=your-openai-api-key
PINECONE_INDEX_NAME=agent-outputs
```

### Step 7: Update Agent Pages to Store

In each agent page, add storage button:

```typescript
// In agent page component
const handleStoreInPinecone = async () => {
  try {
    if (!result) return;

    // Import appropriate storage function
    const { storeThoughtOutput } = await import('@/lib/pinecone/agent-storage');
    await storeThoughtOutput(result);

    alert('Stored in Pinecone successfully!');
  } catch (error: any) {
    alert(`Failed to store: ${error.message}`);
  }
};
```

## Pinecone Index Setup

### Create Index

```bash
# Using Pinecone CLI or web console
# Index name: agent-outputs
# Dimensions: 1536 (for text-embedding-3-small)
# Metric: cosine
# Pod type: p1.x1 (or your preference)
```

### Namespace Strategy

Use namespaces per agent:
- `complexity-detector`
- `thought-agent`
- `planner-agent`
- `critic-agent`
- `confidence-scorer`
- `meta-agent`
- `simulation-agent`
- `reflection-agent`

This enables:
- Filtering by agent type
- Independent querying
- Better organization

## Usage Examples

### Store Output

```typescript
import { storeThoughtOutput } from '@/lib/pinecone/agent-storage';

const thoughtResult = await thoughtAgent.generateThought(...);
await storeThoughtOutput(thoughtResult);
```

### Find Similar Thoughts

```typescript
import { findSimilarOutputs } from '@/lib/pinecone/storage';

const similar = await findSimilarOutputs(
  'How should I analyze facility health?',
  { agentName: 'thought-agent', topK: 3 }
);
```

### Get Complete Chain

```typescript
import { getRequestChain } from '@/lib/pinecone/storage';

const chain = await getRequestChain('request-id-123');
// Returns all agent outputs for this request
```

## Testing

Create `lib/pinecone/storage.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { storeAgentOutput, getRequestChain } from './storage';
import { generateRequestId } from '@/lib/utils/request-id';

describe('Pinecone Storage', () => {
  it('should store agent output', async () => {
    const output = {
      requestId: 'test-123',
      agentName: 'test-agent',
      timestamp: new Date(),
      requestContext: generateRequestId(),
    };

    // This would require actual Pinecone connection
    // Skip in unit tests, test in integration tests
    // await storeAgentOutput(output, 'test content');
  });
});
```

## Next Steps

1. Set up Pinecone index
2. Add environment variables
3. Test storage and retrieval
4. Integrate with all agent pages
5. Enable semantic search for improvement

## Complete Integration Checklist

- [ ] Pinecone account created
- [ ] Index created with correct dimensions
- [ ] Environment variables set
- [ ] Storage functions implemented for each agent
- [ ] Storage buttons added to agent pages
- [ ] Retrieval functions tested
- [ ] Request chain querying working
- [ ] Similar output search working


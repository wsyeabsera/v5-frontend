# Agent Implementation Blueprint 01: Request ID System

## Overview

This blueprint establishes the **Request ID system** - a foundational component that enables agents to track and chain their work together. Every agent execution chain starts with a unique Request ID that gets passed through all subsequent agents, allowing you to:

- **Trace complete reasoning chains** from start to finish
- **Link all agent outputs** in Pinecone under one session
- **Debug multi-agent workflows** by following a single request
- **Query historical agent chains** by Request ID

## Why Request IDs Matter

Think of Request IDs like a "thread ID" in a conversation. When a user asks "analyze facility health", that single query might trigger:
1. Complexity Detector → generates Request ID `abc-123`
2. Thought Agent → receives and stores output with `abc-123`
3. Planner Agent → receives Thought output + `abc-123`
4. Critic Agent → receives Plan + `abc-123`
5. All stored in Pinecone with the same Request ID

This lets you later query: "Show me everything that happened in request `abc-123`" and see the complete reasoning chain.

## Prerequisites

- Existing Zustand store (`lib/store.ts`)
- TypeScript types file (`types/index.ts`)
- Understanding of UUID generation

## Step-by-Step Implementation

### Step 1: Install UUID Package

First, we need a way to generate unique IDs. We'll use the `uuid` package:

```bash
npm install uuid
npm install --save-dev @types/uuid
```

### Step 2: Create Request ID Utility Module

Create `lib/utils/request-id.ts`:

```typescript
import { v4 as uuidv4 } from 'uuid';

/**
 * Request ID represents a single user query session through all agents
 * 
 * Structure:
 * - requestId: Unique identifier for this reasoning chain
 * - createdAt: When the request was initiated
 * - agentChain: Array of agent names that have processed this request
 * - status: Current status of the request
 */
export interface RequestContext {
  requestId: string;
  createdAt: Date;
  agentChain: string[]; // e.g., ['complexity-detector', 'thought-agent', 'planner-agent']
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  userQuery?: string; // Original user query that started this chain
}

/**
 * Generate a new Request ID for a fresh reasoning chain
 * 
 * This should be called ONCE at the very beginning of an agent chain,
 * typically by the Complexity Detector (the first agent).
 * 
 * @param userQuery - Optional: The original user query (stored for context)
 * @returns A new RequestContext with a unique requestId
 * 
 * @example
 * const context = generateRequestId("List all facilities");
 * // Returns: { requestId: "550e8400-e29b-41d4-a716-446655440000", ... }
 */
export function generateRequestId(userQuery?: string): RequestContext {
  return {
    requestId: uuidv4(), // Generate a unique UUID v4
    createdAt: new Date(),
    agentChain: [], // Start with empty chain
    status: 'pending',
    userQuery,
  };
}

/**
 * Add an agent to the request chain
 * 
 * When an agent processes a request, it should call this to track
 * that it's been part of the chain. This helps with debugging and
 * understanding the flow.
 * 
 * @param context - Existing RequestContext
 * @param agentName - Name of the agent processing the request (e.g., 'thought-agent')
 * @returns Updated RequestContext with agent added to chain
 * 
 * @example
 * const updated = addAgentToChain(context, 'thought-agent');
 * // Agent chain now includes 'thought-agent'
 */
export function addAgentToChain(
  context: RequestContext,
  agentName: string
): RequestContext {
  // Only add if not already in chain (idempotent)
  if (!context.agentChain.includes(agentName)) {
    return {
      ...context,
      agentChain: [...context.agentChain, agentName],
    };
  }
  return context;
}

/**
 * Validate that a RequestContext has required fields
 * 
 * Useful for ensuring data integrity when passing contexts between agents
 * 
 * @param context - RequestContext to validate
 * @returns true if valid, false otherwise
 */
export function isValidRequestContext(context: any): context is RequestContext {
  return (
    typeof context === 'object' &&
    typeof context.requestId === 'string' &&
    context.requestId.length > 0 &&
    context.createdAt instanceof Date &&
    Array.isArray(context.agentChain)
  );
}

/**
 * Format RequestContext for logging/debugging
 * 
 * @param context - RequestContext to format
 * @returns Human-readable string representation
 */
export function formatRequestContext(context: RequestContext): string {
  return `[Request ${context.requestId.substring(0, 8)}...] Chain: ${context.agentChain.join(' → ')}`;
}
```

### Step 3: Extend Zustand Store for Request Tracking

Update `lib/store.ts` to include request tracking state:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RequestContext } from './utils/request-id';

// ... existing interfaces ...

interface AppState {
  // ... existing state ...

  // Request ID tracking for agent chains
  currentRequest: RequestContext | null;
  setCurrentRequest: (request: RequestContext | null) => void;
  
  // History of recent requests (for debugging/exploration)
  requestHistory: RequestContext[];
  addToRequestHistory: (request: RequestContext) => void;
  clearRequestHistory: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // ... existing state ...

      // Request tracking
      currentRequest: null,
      setCurrentRequest: (request) => set({ currentRequest: request }),
      
      requestHistory: [],
      addToRequestHistory: (request) =>
        set((state) => ({
          requestHistory: [request, ...state.requestHistory].slice(0, 50), // Keep last 50
        })),
      clearRequestHistory: () => set({ requestHistory: [] }),
    }),
    {
      name: 'mcp-client-storage',
      partialize: (state) => ({
        // Don't persist currentRequest (should be ephemeral)
        // But do persist recent history for debugging
        selectedModel: state.selectedModel,
        apiKeys: state.apiKeys,
        sidebarOpen: state.sidebarOpen,
        requestHistory: state.requestHistory,
      }),
    }
  )
);
```

### Step 4: Create Request ID Types

Add to `types/index.ts`:

```typescript
// ... existing types ...

/**
 * Request ID system types
 */
export interface RequestContext {
  requestId: string;
  createdAt: Date;
  agentChain: string[];
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  userQuery?: string;
}

/**
 * Base interface for all agent outputs that includes Request ID
 * 
 * Every agent's output should extend this to include the request context
 */
export interface AgentOutput {
  requestId: string; // Links this output to the request chain
  agentName: string; // Which agent produced this output
  timestamp: Date; // When this agent ran
  requestContext: RequestContext; // Full context for chaining
}
```

## Pinecone Schema

When storing agent outputs in Pinecone, include the Request ID in metadata:

```typescript
/**
 * Example: How to structure Pinecone vector metadata with Request ID
 */
interface PineconeMetadata {
  // Required: Request ID linking
  requestId: string; // The unique request ID
  agentName: string; // Which agent (e.g., 'thought-agent')
  agentChain: string[]; // Full chain up to this point
  
  // Content
  content: string; // The actual output content (for embedding)
  userQuery?: string; // Original user query
  
  // Metadata
  timestamp: string; // ISO 8601 timestamp
  status: string; // Processing status
  
  // Relationships (for chaining agents)
  parentAgent?: string; // Which agent's output was used as input
  parentRequestId?: string; // Can be same as requestId, but useful for forks
  
  // Optional: Additional context
  confidence?: number; // If agent provides confidence
  complexity?: number; // If complexity score is available
}
```

## Request ID Integration Pattern

Here's how each agent should use Request IDs:

### Pattern 1: First Agent (Complexity Detector)

```typescript
// Complexity Detector is typically the FIRST agent
import { generateRequestId, addAgentToChain } from '@/lib/utils/request-id';

async function processQuery(userQuery: string) {
  // Step 1: Generate NEW Request ID (only first agent does this)
  const requestContext = generateRequestId(userQuery);
  
  // Step 2: Mark that this agent is processing
  const updatedContext = addAgentToChain(requestContext, 'complexity-detector');
  
  // Step 3: Do agent work
  const result = await complexityDetector.detect(userQuery);
  
  // Step 4: Include Request ID in output
  return {
    ...result,
    requestId: updatedContext.requestId,
    requestContext: updatedContext,
  };
}
```

### Pattern 2: Subsequent Agents

```typescript
// Thought Agent, Planner, etc. RECEIVE and PROPAGATE Request ID
async function processWithContext(
  input: any,
  requestContext: RequestContext // Received from previous agent
) {
  // Step 1: Validate we have a Request ID
  if (!requestContext.requestId) {
    throw new Error('Request ID is required for agent chaining');
  }
  
  // Step 2: Add ourselves to the chain
  const updatedContext = addAgentToChain(requestContext, 'thought-agent');
  
  // Step 3: Do agent work
  const result = await thoughtAgent.generate(input);
  
  // Step 4: Include Request ID in output (propagate it forward)
  return {
    ...result,
    requestId: updatedContext.requestId, // Same Request ID!
    requestContext: updatedContext, // Updated with our agent in chain
  };
}
```

## Testing

Create `lib/utils/request-id.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  generateRequestId,
  addAgentToChain,
  isValidRequestContext,
  formatRequestContext,
} from './request-id';

describe('Request ID System', () => {
  it('should generate unique Request IDs', () => {
    const id1 = generateRequestId('query 1');
    const id2 = generateRequestId('query 2');
    
    // Each should have unique ID
    expect(id1.requestId).not.toBe(id2.requestId);
    
    // Should have valid structure
    expect(id1.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
  
  it('should store user query in context', () => {
    const context = generateRequestId('List all facilities');
    expect(context.userQuery).toBe('List all facilities');
  });
  
  it('should add agents to chain', () => {
    const context = generateRequestId();
    const updated = addAgentToChain(context, 'thought-agent');
    
    expect(updated.agentChain).toContain('thought-agent');
    expect(updated.requestId).toBe(context.requestId); // Same ID
  });
  
  it('should prevent duplicate agents in chain', () => {
    const context = generateRequestId();
    const updated1 = addAgentToChain(context, 'thought-agent');
    const updated2 = addAgentToChain(updated1, 'thought-agent');
    
    // Should only appear once
    expect(updated2.agentChain.filter(a => a === 'thought-agent').length).toBe(1);
  });
  
  it('should validate RequestContext structure', () => {
    const valid = generateRequestId();
    expect(isValidRequestContext(valid)).toBe(true);
    
    expect(isValidRequestContext({})).toBe(false);
    expect(isValidRequestContext({ requestId: '' })).toBe(false);
  });
});
```

## Next Steps

Once the Request ID system is implemented:

1. **Test the utilities** - Run the test suite to ensure UUID generation works
2. **Integrate with Complexity Detector** - First agent should generate Request IDs
3. **Update other agents** - Make sure all agents accept and propagate Request IDs
4. **Add to Pinecone storage** - Include Request ID in all Pinecone metadata

## Common Pitfalls to Avoid

1. **Don't generate new Request IDs in every agent** - Only the first agent (Complexity Detector) should generate it
2. **Don't forget to propagate** - Each agent must pass the Request ID to the next
3. **Don't lose the chain** - Always use `addAgentToChain` to track which agents processed the request
4. **Validate early** - Check that Request ID exists before processing in subsequent agents

## Next Blueprint

After implementing Request ID system, proceed to:
**AGENT-02-COMPLEXITY-DETECTOR.md** - This will be the first agent that generates Request IDs.


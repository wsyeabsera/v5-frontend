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


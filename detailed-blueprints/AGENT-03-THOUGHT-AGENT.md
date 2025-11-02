# Agent Implementation Blueprint 03: Thought Agent

## Overview

The **Thought Agent** generates internal reasoning and explores multiple solution approaches. It receives the Request ID from the Complexity Detector and uses it to link its outputs with the overall reasoning chain.

**Key Responsibilities:**
- Generate deep reasoning thoughts about user queries
- Explore multiple solution approaches
- Identify constraints, assumptions, and uncertainties
- Recommend tools that might help
- Store reasoning in Pinecone for pattern learning

## Prerequisites

- **AGENT-01** (Request ID System) - Required for chaining
- **AGENT-02** (Complexity Detector) - Provides Request ID and complexity score
- AI API access (Anthropic/OpenAI/Google) configured
- Understanding of LLM prompt engineering

## Step-by-Step Implementation

### Step 1: Add Thought Types

Add to `types/index.ts`:

```typescript
/**
 * Thought - Internal reasoning output from Thought Agent
 * 
 * This represents the AI's internal "thinking" before taking action.
 * It's like a senior engineer's thought process written down.
 */
export interface Thought {
  id: string; // Unique ID for this thought
  timestamp: Date;
  reasoning: string; // Natural language reasoning about the problem
  approaches: string[]; // Multiple possible approaches to solve it
  constraints: string[]; // Key constraints identified
  assumptions: string[]; // Assumptions being made
  uncertainties: string[]; // Areas of uncertainty
  confidence: number; // 0-1 confidence in this reasoning
}

/**
 * Thought Agent Result - Output with Request ID
 */
export interface ThoughtAgentOutput extends AgentOutput {
  thoughts: Thought[]; // One or more thoughts (for multi-pass reasoning)
  primaryApproach: string; // The main approach identified
  keyInsights: string[]; // Key insights extracted
  recommendedTools: string[]; // Tools that might be useful
  complexityScore?: number; // From Complexity Detector
  reasoningPass?: number; // Which pass this is (1, 2, or 3)
  totalPasses?: number; // Total passes planned
}
```

### Step 2: Create Base Agent Class

Create `lib/agents/base-agent.ts`:

```typescript
/**
 * Base Agent Class
 * 
 * All agents extend this base class to get common functionality:
 * - LLM calling utilities
 * - Response parsing helpers
 * - Error handling
 */
export abstract class BaseAgent {
  constructor(
    protected apiKey: string,
    protected modelId: string
  ) {}

  /**
   * Call LLM with messages
   * 
   * This method handles the actual API call to the AI service.
   * It uses the existing AI server endpoint for consistency.
   * 
   * @param messages - Array of system/user/assistant messages
   * @param options - Temperature, max tokens, etc.
   * @returns LLM response as string
   */
  protected async callLLM(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<string> {
    // Use the existing AI server endpoint
    const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:3002/stream';
    
    // For agents, we need non-streaming responses, so we might need a different endpoint
    // For now, we'll use the chat endpoint but expect JSON
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        modelId: this.modelId,
        apiKey: this.apiKey,
        stream: false, // We want a complete response for agents
        ...options,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM call failed: ${error}`);
    }

    // For streaming endpoints, we'd need to handle streaming
    // For now, assume we get JSON back
    const data = await response.json();
    return data.content || data.message || JSON.stringify(data);
  }

  /**
   * Extract a section from LLM response
   * 
   * LLM responses often have structured sections like "REASONING: ..."
   * This helper extracts those sections.
   * 
   * @param text - Full response text
   * @param section - Section name (e.g., "REASONING")
   * @returns Section content or null if not found
   */
  protected extractSection(text: string, section: string): string | null {
    // Look for "SECTION_NAME: content" pattern
    const regex = new RegExp(`${section}:\\s*([\\s\\S]*?)(?:\\n\\n[A-Z_]+:|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }

  /**
   * Extract list items from a section
   * 
   * Handles numbered lists, bullet lists, or dash-separated items.
   * 
   * @param text - Section text containing list
   * @param section - Optional section name to extract first
   * @returns Array of list items
   */
  protected extractList(text: string, section?: string): string[] {
    const content = section ? this.extractSection(text, section) : text;
    if (!content) return [];

    // Extract numbered, bulleted, or dashed items
    const items = content
      .split(/\n/)
      .map(line => line.replace(/^\d+\.\s*|^-\s*|^\*\s*/, '').trim())
      .filter(Boolean);

    return items;
  }
}
```

### Step 3: Implement Thought Agent

Create `lib/agents/thought-agent.ts`:

```typescript
import { BaseAgent } from './base-agent';
import { Thought, ThoughtAgentOutput, RequestContext } from '@/types';
import { addAgentToChain } from '@/lib/utils/request-id';

/**
 * Thought Agent
 * 
 * Generates internal reasoning and explores multiple solution approaches.
 * Think of this as the "brainstorming" phase before planning.
 * 
 * How it works:
 * 1. Receives user query and Request ID from Complexity Detector
 * 2. Uses LLM to generate deep reasoning thoughts
 * 3. Explores multiple approaches
 * 4. Identifies constraints, assumptions, uncertainties
 * 5. Recommends tools
 * 6. Stores output with Request ID for chaining
 */
export class ThoughtAgent extends BaseAgent {
  /**
   * System prompt that guides the Thought Agent's behavior
   * 
   * This prompt is sent to the LLM to establish the agent's "personality"
   * and instructions. We want the agent to think deeply and explore options.
   */
  private readonly systemPrompt = `You are a Thought Agent - your job is to think through problems deeply before taking action.

When given a user query:
1. Break down what the user is really asking for
2. Identify multiple possible approaches to solve it
3. List key constraints and requirements
4. Note any assumptions you're making
5. Identify areas of uncertainty (what you don't know)
6. Suggest which tools might be helpful

Think like a senior engineer planning a solution. Be thorough but concise.
Provide your reasoning in this structured format:

REASONING: [Your detailed reasoning about the problem]

APPROACHES:
1. [First possible approach]
2. [Second possible approach]
3. [Alternative approach if applicable]

CONSTRAINTS: [Key constraints, requirements, limitations]

ASSUMPTIONS: [Assumptions you're making]

UNCERTAINTIES: [What you're uncertain about]

TOOLS: [Which tools might help, comma-separated]`;

  /**
   * Generate initial thoughts for a user query
   * 
   * This is called for the first reasoning pass.
   * 
   * @param userQuery - User's query
   * @param requestContext - Request ID context from Complexity Detector
   * @param context - Additional context (previous thoughts, tools, etc.)
   * @returns ThoughtAgentOutput with reasoning thoughts
   */
  async generateThought(
    userQuery: string,
    requestContext: RequestContext,
    context: {
      previousThoughts?: Thought[];
      availableTools?: string[];
      complexityScore?: number;
      reasoningPasses?: number;
    } = {}
  ): Promise<ThoughtAgentOutput> {
    // Step 1: Add this agent to the request chain
    const updatedContext = addAgentToChain(requestContext, 'thought-agent');

    // Step 2: Build the prompt for the LLM
    const prompt = this.buildThoughtPrompt(userQuery, context);

    // Step 3: Call LLM
    const messages = [
      { role: 'system' as const, content: this.systemPrompt },
      { role: 'user' as const, content: prompt },
    ];

    const response = await this.callLLM(messages, {
      temperature: 0.7, // Creative thinking - explore multiple approaches
      maxTokens: 1500, // Enough for detailed reasoning
    });

    // Step 4: Parse the structured response
    const thought = this.parseThoughtResponse(response, userQuery, 1);

    // Step 5: Extract recommended tools
    const recommendedTools = this.extractToolSuggestions(response);

    // Step 6: Build output with Request ID
    return {
      // Agent output base
      requestId: updatedContext.requestId,
      agentName: 'thought-agent',
      timestamp: new Date(),
      requestContext: updatedContext,

      // Thought-specific output
      thoughts: [thought],
      primaryApproach: thought.approaches[0] || 'Unknown approach',
      keyInsights: this.extractKeyInsights(thought.reasoning),
      recommendedTools,
      complexityScore: context.complexityScore,
      reasoningPass: 1,
      totalPasses: context.reasoningPasses || 1,
    };
  }

  /**
   * Generate thoughts in a multi-pass reasoning loop
   * 
   * This is called for passes 2 and 3, when the query is complex.
   * It uses previous thoughts to go deeper.
   * 
   * @param userQuery - Original user query
   * @param previousThought - Thought from previous pass
   * @param passNumber - Which pass this is (2 or 3)
   * @param totalPasses - Total passes planned
   * @param requestContext - Request ID context
   * @returns ThoughtAgentOutput with refined thoughts
   */
  async generateThoughtLoop(
    userQuery: string,
    previousThought: Thought,
    passNumber: number,
    totalPasses: number,
    requestContext: RequestContext
  ): Promise<ThoughtAgentOutput> {
    // Add to chain
    const updatedContext = addAgentToChain(requestContext, 'thought-agent');

    // Build prompt that references previous thought
    const prompt = `Previous thought (pass ${passNumber - 1}/${totalPasses}):
${previousThought.reasoning}

Approaches considered:
${previousThought.approaches.join('\n')}

Uncertainties identified:
${previousThought.uncertainties.join('\n')}

Original user query: ${userQuery}

Think deeper. Refine your reasoning. Address the uncertainties. Consider alternative angles.
Challenge your assumptions. Explore edge cases.`;

    const messages = [
      { role: 'system' as const, content: this.systemPrompt },
      { role: 'user' as const, content: prompt },
    ];

    // Later passes: more focused, less creative
    const response = await this.callLLM(messages, {
      temperature: passNumber === 2 ? 0.6 : 0.5, // More focused as passes increase
      maxTokens: 1500,
    });

    const thought = this.parseThoughtResponse(response, userQuery, passNumber);

    return {
      requestId: updatedContext.requestId,
      agentName: 'thought-agent',
      timestamp: new Date(),
      requestContext: updatedContext,
      thoughts: [thought],
      primaryApproach: thought.approaches[0] || 'Unknown',
      keyInsights: this.extractKeyInsights(thought.reasoning),
      recommendedTools: this.extractToolSuggestions(response),
      reasoningPass: passNumber,
      totalPasses,
    };
  }

  /**
   * Build the prompt sent to the LLM
   * 
   * This method constructs a clear prompt that gives the LLM
   * all the context it needs to generate good reasoning.
   * 
   * @param query - User query
   * @param context - Additional context
   * @returns Formatted prompt string
   */
  private buildThoughtPrompt(
    query: string,
    context: {
      previousThoughts?: Thought[];
      availableTools?: string[];
      complexityScore?: number;
    }
  ): string {
    let prompt = `User Query: ${query}\n\n`;

    // Include complexity info if available
    if (context.complexityScore !== undefined) {
      prompt += `Complexity Score: ${(context.complexityScore * 100).toFixed(0)}%\n\n`;
    }

    // Include available tools
    if (context.availableTools && context.availableTools.length > 0) {
      prompt += `Available Tools: ${context.availableTools.join(', ')}\n\n`;
    }

    // Include previous thoughts if this is a follow-up
    if (context.previousThoughts && context.previousThoughts.length > 0) {
      prompt += `Previous Thoughts:\n${context.previousThoughts
        .map(t => `- ${t.reasoning.substring(0, 200)}...`)
        .join('\n')}\n\n`;
    }

    prompt += `Think through this problem deeply. Provide your reasoning in the structured format.`;

    return prompt;
  }

  /**
   * Parse LLM response into structured Thought object
   * 
   * The LLM is instructed to format its response in sections.
   * This method extracts each section and builds a Thought object.
   * 
   * @param response - Raw LLM response
   * @param userQuery - Original user query
   * @param passNumber - Which pass this is
   * @returns Structured Thought object
   */
  private parseThoughtResponse(
    response: string,
    userQuery: string,
    passNumber: number
  ): Thought {
    return {
      id: `thought-${Date.now()}-${passNumber}`,
      timestamp: new Date(),
      reasoning: this.extractSection(response, 'REASONING') || response,
      approaches: this.extractList(response, 'APPROACHES'),
      constraints: this.extractList(response, 'CONSTRAINTS'),
      assumptions: this.extractList(response, 'ASSUMPTIONS'),
      uncertainties: this.extractList(response, 'UNCERTAINTIES'),
      confidence: this.estimateConfidence(response),
    };
  }

  /**
   * Extract tool suggestions from LLM response
   * 
   * The LLM might mention tools in its response.
   * This extracts them for use by later agents.
   * 
   * @param response - LLM response
   * @returns Array of recommended tool names
   */
  private extractToolSuggestions(response: string): string[] {
    const toolsSection = this.extractSection(response, 'TOOLS');
    if (!toolsSection) return [];

    // Split by comma or newline
    return toolsSection
      .split(/[,\n]/)
      .map(t => t.trim())
      .filter(Boolean)
      .map(t => t.replace(/[^\w\s-]/g, '')); // Remove special chars
  }

  /**
   * Extract key insights from reasoning text
   * 
   * Insights are important points extracted from the reasoning.
   * This is a simple extraction - could be enhanced with NLP.
   * 
   * @param reasoning - Full reasoning text
   * @returns Array of key insights
   */
  private extractKeyInsights(reasoning: string): string[] {
    // Simple approach: split by sentences and take important ones
    const sentences = reasoning.split(/[.!?]+/).filter(Boolean);
    
    // Filter for sentences that seem like insights (contain keywords)
    const insightKeywords = ['important', 'key', 'critical', 'note', 'must', 'should', 'requires'];
    return sentences
      .filter(s => {
        const lower = s.toLowerCase();
        return insightKeywords.some(keyword => lower.includes(keyword));
      })
      .slice(0, 5) // Limit to 5 insights
      .map(s => s.trim());
  }

  /**
   * Estimate confidence based on response
   * 
   * More uncertainties = lower confidence.
   * This is a heuristic - could be enhanced with LLM confidence scoring.
   * 
   * @param response - LLM response
   * @returns Confidence score 0-1
   */
  private estimateConfidence(response: string): number {
    const uncertainties = this.extractList(response, 'UNCERTAINTIES');
    const baseConfidence = 0.7;
    const uncertaintyPenalty = Math.min(0.3, uncertainties.length * 0.1);
    return Math.max(0.3, baseConfidence - uncertaintyPenalty);
  }
}
```

### Step 4: Create API Route

Create `app/api/agents/thought-agent/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ThoughtAgent } from '@/lib/agents/thought-agent';
import { RequestContext } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userQuery,
      requestContext, // From Complexity Detector
      apiKey,
      modelId,
      context = {},
    } = body;

    // Validate
    if (!userQuery) {
      return NextResponse.json({ error: 'userQuery required' }, { status: 400 });
    }
    if (!requestContext || !requestContext.requestId) {
      return NextResponse.json({ error: 'requestContext with requestId required' }, { status: 400 });
    }
    if (!apiKey || !modelId) {
      return NextResponse.json({ error: 'apiKey and modelId required' }, { status: 400 });
    }

    // Initialize agent
    const agent = new ThoughtAgent(apiKey, modelId);

    // Generate thoughts
    const result = await agent.generateThought(userQuery, requestContext, context);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[Thought Agent API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate thoughts' },
      { status: 500 }
    );
  }
}
```

### Step 5: Create Agent Page

Create `app/agents/thought-agent/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ThoughtAgentOutput, RequestContext } from '@/types';
import { useStore } from '@/lib/store';

export default function ThoughtAgentPage() {
  const { selectedModel, apiKeys } = useStore();
  const [userQuery, setUserQuery] = useState('');
  const [requestContext, setRequestContext] = useState<RequestContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ThoughtAgentOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate Request ID (or receive from Complexity Detector)
  const handleGenerateRequestId = async () => {
    const response = await fetch('/api/agents/complexity-detector', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userQuery }),
    });
    const data = await response.json();
    setRequestContext(data.requestContext);
  };

  const handleGenerateThoughts = async () => {
    if (!requestContext) {
      setError('Please generate Request ID first');
      return;
    }
    if (!userQuery.trim()) {
      setError('Please enter a query');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiKey = apiKeys.anthropic || apiKeys.openai || apiKeys.google || '';
      if (!apiKey) {
        throw new Error('API key required - set it in Settings');
      }

      const response = await fetch('/api/agents/thought-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userQuery,
          requestContext,
          apiKey,
          modelId: selectedModel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate thoughts');
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
      <h1 className="text-4xl font-bold mb-2">Thought Agent</h1>
      <p className="text-muted-foreground mb-8">
        Generate deep reasoning thoughts and explore solution approaches
      </p>

      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Input</h2>
        <Textarea
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          placeholder="Enter a user query..."
          className="min-h-[100px] mb-4"
          disabled={loading}
        />
        <div className="flex gap-2">
          <Button onClick={handleGenerateRequestId} variant="outline">
            Generate Request ID
          </Button>
          <Button onClick={handleGenerateThoughts} disabled={loading || !requestContext}>
            {loading ? 'Generating...' : 'Generate Thoughts'}
          </Button>
        </div>
        {requestContext && (
          <p className="text-xs text-muted-foreground mt-2">
            Request ID: {requestContext.requestId.substring(0, 8)}...
          </p>
        )}
      </Card>

      {error && (
        <Card className="p-6 mb-6 border-red-500 bg-red-50 dark:bg-red-950">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </Card>
      )}

      {result && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Reasoning</h2>
            <p className="whitespace-pre-wrap">{result.thoughts[0]?.reasoning}</p>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Approaches</h2>
            <ul className="list-disc list-inside space-y-2">
              {result.thoughts[0]?.approaches.map((approach, i) => (
                <li key={i}>{approach}</li>
              ))}
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Constraints & Assumptions</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-2">Constraints</h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {result.thoughts[0]?.constraints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">Assumptions</h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {result.thoughts[0]?.assumptions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Uncertainties</h2>
            <ul className="list-disc list-inside space-y-1">
              {result.thoughts[0]?.uncertainties.map((u, i) => (
                <li key={i} className="text-sm">{u}</li>
              ))}
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Recommended Tools</h2>
            <div className="flex flex-wrap gap-2">
              {result.recommendedTools.map((tool, i) => (
                <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  {tool}
                </span>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
```

## Pinecone Schema

```typescript
interface ThoughtPineconeMetadata {
  requestId: string;
  agentName: 'thought-agent';
  agentChain: string[];
  content: string; // The reasoning text
  userQuery: string;
  primaryApproach: string;
  confidence: number;
  reasoningPass?: number;
  totalPasses?: number;
  recommendedTools: string[];
  constraints: string[];
  assumptions: string[];
  uncertainties: string[];
  timestamp: string;
}
```

## Request ID Integration

The Thought Agent **receives and propagates** the Request ID:

```typescript
// In generateThought:
const updatedContext = addAgentToChain(requestContext, 'thought-agent'); // Add ourselves

return {
  requestId: updatedContext.requestId, // Same Request ID!
  requestContext: updatedContext, // Pass to next agent
  // ... rest of output
};
```

## Testing

Create `lib/agents/thought-agent.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ThoughtAgent } from './thought-agent';
import { generateRequestId } from '@/lib/utils/request-id';

describe('ThoughtAgent', () => {
  const apiKey = process.env.TEST_API_KEY || 'test-key';
  const modelId = 'claude-sonnet';
  const agent = new ThoughtAgent(apiKey, modelId);

  it('should generate thoughts with Request ID', async () => {
    const requestContext = generateRequestId('test query');
    const result = await agent.generateThought('List all facilities', requestContext);

    expect(result.requestId).toBe(requestContext.requestId);
    expect(result.thoughts.length).toBeGreaterThan(0);
    expect(result.thoughts[0].reasoning).toBeDefined();
  });
});
```

## Next Steps

1. Test with various queries
2. Verify Request ID propagation
3. Test multi-pass reasoning
4. Store in Pinecone
5. Proceed to Planner Agent

## Next Blueprint

**AGENT-04-PLANNER-AGENT.md** - Converts thoughts into structured action plans.


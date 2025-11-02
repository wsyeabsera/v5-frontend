# Agent Implementation Blueprint 02: Complexity Detector

## Overview

The **Complexity Detector** is typically the **first agent** in the chain. It analyzes user queries to determine how much reasoning depth is needed (1, 2, or 3 reasoning passes). Importantly, this agent is responsible for **generating the Request ID** that will be used by all subsequent agents.

**Key Responsibilities:**
- Analyze query complexity using heuristics
- Determine reasoning passes needed (1 = simple, 2 = medium, 3 = complex)
- Generate Request ID for the agent chain
- Store results in Pinecone for pattern learning

## Prerequisites

- **AGENT-01** (Request ID System) must be completed first
- Understanding of heuristic scoring algorithms
- Pinecone account/index configured

## Step-by-Step Implementation

### Step 1: Create Agent Types

Add to `types/index.ts`:

```typescript
/**
 * Complexity Score - Output of Complexity Detector
 * 
 * This determines how many reasoning passes other agents should perform.
 * Simple queries get 1 pass, complex queries get 3 passes.
 */
export interface ComplexityScore {
  score: number; // 0.0 (simple) to 1.0 (very complex)
  reasoningPasses: number; // 1, 2, or 3
  factors: {
    queryLength: number; // Normalized query length (0-1)
    hasMultipleQuestions: boolean; // Multiple "?" in query
    requiresMultiStep: boolean; // Contains step/sequence keywords
    involvesAnalysis: boolean; // Contains analysis keywords
    needsDataAggregation: boolean; // Contains aggregation keywords
  };
}

/**
 * Complexity Detector Output - Includes Request ID for chaining
 */
export interface ComplexityDetectorOutput extends AgentOutput {
  complexity: ComplexityScore;
  userQuery: string; // Original query analyzed
  detectedKeywords: string[]; // Keywords that influenced scoring
}
```

### Step 2: Implement Complexity Detector Class

Create `lib/agents/complexity-detector.ts`:

```typescript
import { ComplexityScore, ComplexityDetectorOutput, AgentOutput } from '@/types';
import { generateRequestId, addAgentToChain, RequestContext } from '@/lib/utils/request-id';

/**
 * Complexity Detector Agent
 * 
 * This agent analyzes user queries to determine reasoning complexity.
 * It's typically the FIRST agent in a chain, so it generates the Request ID.
 * 
 * How it works:
 * 1. Analyzes query using heuristics (keywords, length, structure)
 * 2. Scores complexity from 0.0 (simple) to 1.0 (very complex)
 * 3. Maps score to reasoning passes (1, 2, or 3)
 * 4. Generates Request ID for agent chaining
 */
export class ComplexityDetector {
  /**
   * Keyword patterns that indicate multi-step operations
   * 
   * These keywords suggest the user wants sequential actions,
   * which increases complexity.
   */
  private readonly MULTI_STEP_KEYWORDS = [
    'then', 'after', 'next', 'follow', 'sequence', 'step',
    'first', 'second', 'finally', 'then do', 'after that'
  ];

  /**
   * Keywords that indicate analysis operations
   * 
   * Analysis requires deeper reasoning, so these increase complexity.
   */
  private readonly ANALYSIS_KEYWORDS = [
    'analyze', 'compare', 'evaluate', 'assess', 'examine',
    'review', 'study', 'investigate', 'analyze', 'break down'
  ];

  /**
   * Keywords that indicate data aggregation
   * 
   * Aggregating data across multiple sources increases complexity.
   */
  private readonly AGGREGATION_KEYWORDS = [
    'all', 'every', 'total', 'summarize', 'overview', 'summary',
    'across', 'combined', 'aggregate', 'consolidate'
  ];

  /**
   * Thresholds for determining reasoning passes
   * 
   * These thresholds map complexity scores to reasoning passes:
   * - score <= 0.4: 1 pass (simple queries like "list facilities")
   * - 0.4 < score <= 0.7: 2 passes (medium queries like "analyze facility X")
   * - score > 0.7: 3 passes (complex queries like "analyze all facilities, compare trends, suggest improvements")
   */
  private readonly SIMPLE_THRESHOLD = 0.4;
  private readonly COMPLEX_THRESHOLD = 0.7;

  /**
   * Weight factors for complexity calculation
   * 
   * These weights determine how much each factor contributes to the final score.
   * Multi-step and analysis are weighted higher because they require more reasoning.
   */
  private readonly WEIGHTS = {
    queryLength: 0.2,        // 20% - length is less important
    multipleQuestions: 0.15, // 15% - multiple questions add some complexity
    multiStep: 0.25,         // 25% - multi-step is quite complex
    analysis: 0.25,          // 25% - analysis requires deep thinking
    aggregation: 0.15,       // 15% - aggregation adds some complexity
  };

  /**
   * Detect query complexity and generate Request ID
   * 
   * This is the main entry point for the Complexity Detector.
   * It generates a Request ID (since it's usually the first agent),
   * analyzes the query, and returns both the complexity score and Request ID.
   * 
   * @param userQuery - The user's query to analyze
   * @param context - Optional context (previous messages, available tools)
   * @returns ComplexityDetectorOutput with complexity score and Request ID
   * 
   * @example
   * const detector = new ComplexityDetector();
   * const result = await detector.detectComplexity("List all facilities");
   * // Returns: { complexity: { score: 0.2, reasoningPasses: 1 }, requestId: "..." }
   */
  async detectComplexity(
    userQuery: string,
    context?: {
      previousMessages?: number;
      availableTools?: number;
    }
  ): Promise<ComplexityDetectorOutput> {
    // Step 1: Generate Request ID (this agent is first in chain)
    // The Request ID will be propagated to all subsequent agents
    const requestContext = generateRequestId(userQuery);
    const updatedContext = addAgentToChain(requestContext, 'complexity-detector');

    // Step 2: Analyze query using heuristics
    const complexity = this.analyzeComplexity(userQuery, context);

    // Step 3: Extract detected keywords for transparency
    const detectedKeywords = this.extractDetectedKeywords(userQuery);

    // Step 4: Build output with Request ID included
    return {
      // Agent output base properties
      requestId: updatedContext.requestId,
      agentName: 'complexity-detector',
      timestamp: new Date(),
      requestContext: updatedContext,

      // Complexity-specific output
      complexity,
      userQuery,
      detectedKeywords,
    };
  }

  /**
   * Core complexity analysis logic
   * 
   * This method uses heuristics to calculate complexity.
   * It examines:
   * - Query length (longer = more complex, up to a point)
   * - Multiple questions (more questions = more complex)
   * - Multi-step indicators (keywords suggesting sequences)
   * - Analysis indicators (keywords suggesting deep reasoning)
   * - Aggregation indicators (keywords suggesting data gathering)
   * 
   * @param query - Query to analyze
   * @param context - Optional context
   * @returns ComplexityScore with score and reasoning passes
   */
  private analyzeComplexity(
    query: string,
    context?: { previousMessages?: number; availableTools?: number }
  ): ComplexityScore {
    // Factor 1: Query length (normalized to 0-1)
    // Longer queries tend to be more complex, but cap at 500 chars
    const queryLength = this.normalize(query.length, 0, 500);

    // Factor 2: Multiple questions
    // Count question marks - each additional question adds complexity
    const questionCount = (query.match(/\?/g) || []).length;
    const hasMultipleQuestions = questionCount > 1 ? 1 : 0;

    // Factor 3: Multi-step indicators
    // Check if query contains keywords suggesting sequential operations
    const requiresMultiStep = this.hasKeywords(query, this.MULTI_STEP_KEYWORDS) ? 1 : 0;

    // Factor 4: Analysis indicators
    // Check if query requires analytical thinking
    const involvesAnalysis = this.hasKeywords(query, this.ANALYSIS_KEYWORDS) ? 1 : 0;

    // Factor 5: Aggregation indicators
    // Check if query needs to gather/aggregate data
    const needsDataAggregation = this.hasKeywords(query, this.AGGREGATION_KEYWORDS) ? 1 : 0;

    // Calculate weighted complexity score
    // Each factor is multiplied by its weight and summed
    const score =
      queryLength * this.WEIGHTS.queryLength +
      hasMultipleQuestions * this.WEIGHTS.multipleQuestions +
      requiresMultiStep * this.WEIGHTS.multiStep +
      involvesAnalysis * this.WEIGHTS.analysis +
      needsDataAggregation * this.WEIGHTS.aggregation;

    // Determine reasoning passes based on score
    // Higher score = more reasoning passes needed
    let reasoningPasses = 1; // Default: simple, 1 pass
    if (score > this.COMPLEX_THRESHOLD) {
      reasoningPasses = 3; // Very complex: 3 passes
    } else if (score > this.SIMPLE_THRESHOLD) {
      reasoningPasses = 2; // Medium complexity: 2 passes
    }

    return {
      score: Math.min(1.0, Math.max(0.0, score)), // Clamp to 0-1
      reasoningPasses,
      factors: {
        queryLength,
        hasMultipleQuestions: hasMultipleQuestions === 1,
        requiresMultiStep: requiresMultiStep === 1,
        involvesAnalysis: involvesAnalysis === 1,
        needsDataAggregation: needsDataAggregation === 1,
      },
    };
  }

  /**
   * Check if query contains any of the given keywords
   * 
   * This is case-insensitive and checks for whole words or partial matches.
   * 
   * @param query - Query to search
   * @param keywords - Keywords to look for
   * @returns true if any keyword is found
   */
  private hasKeywords(query: string, keywords: string[]): boolean {
    const lowerQuery = query.toLowerCase();
    return keywords.some(keyword => lowerQuery.includes(keyword.toLowerCase()));
  }

  /**
   * Extract which keywords were detected in the query
   * 
   * This helps with transparency - shows WHY the complexity score is what it is.
   * 
   * @param query - Query to analyze
   * @returns Array of detected keywords
   */
  private extractDetectedKeywords(query: string): string[] {
    const detected: string[] = [];
    const allKeywords = [
      ...this.MULTI_STEP_KEYWORDS,
      ...this.ANALYSIS_KEYWORDS,
      ...this.AGGREGATION_KEYWORDS,
    ];

    const lowerQuery = query.toLowerCase();
    for (const keyword of allKeywords) {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        detected.push(keyword);
      }
    }

    return detected;
  }

  /**
   * Normalize a value to 0-1 range
   * 
   * This is used to normalize query length to a 0-1 score.
   * 
   * @param value - Value to normalize
   * @param min - Minimum expected value
   * @param max - Maximum expected value
   * @returns Normalized value between 0 and 1
   */
  private normalize(value: number, min: number, max: number): number {
    if (max === min) return 0; // Avoid division by zero
    return Math.min(1, Math.max(0, (value - min) / (max - min)));
  }
}
```

### Step 3: Create API Route

Create `app/api/agents/complexity-detector/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ComplexityDetector } from '@/lib/agents/complexity-detector';

/**
 * API Route for Complexity Detector Agent
 * 
 * POST /api/agents/complexity-detector
 * 
 * Body:
 * {
 *   userQuery: string;
 *   context?: {
 *     previousMessages?: number;
 *     availableTools?: number;
 *   };
 * }
 * 
 * Returns:
 * {
 *   complexity: ComplexityScore;
 *   requestId: string;
 *   requestContext: RequestContext;
 *   detectedKeywords: string[];
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userQuery, context } = body;

    // Validate input
    if (!userQuery || typeof userQuery !== 'string') {
      return NextResponse.json(
        { error: 'userQuery (string) is required' },
        { status: 400 }
      );
    }

    // Initialize detector
    const detector = new ComplexityDetector();

    // Run complexity detection
    const result = await detector.detectComplexity(userQuery, context);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[Complexity Detector API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to detect complexity' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for health check
 */
export async function GET() {
  return NextResponse.json({
    agent: 'complexity-detector',
    status: 'ready',
    description: 'Analyzes query complexity and generates Request IDs',
  });
}
```

### Step 4: Create Agent Page

Create `app/agents/complexity-detector/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ComplexityDetectorOutput } from '@/types';

/**
 * Complexity Detector Agent Page
 * 
 * This is a development/testing page for the Complexity Detector.
 * It allows you to:
 * - Enter a user query
 * - See complexity analysis
 * - View the generated Request ID
 * - See detected keywords
 * - Store results in Pinecone
 */
export default function ComplexityDetectorPage() {
  const [userQuery, setUserQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComplexityDetectorOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle complexity detection
   */
  const handleDetect = async () => {
    if (!userQuery.trim()) {
      setError('Please enter a query');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/agents/complexity-detector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userQuery }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to detect complexity');
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
      <h1 className="text-4xl font-bold mb-2">Complexity Detector Agent</h1>
      <p className="text-muted-foreground mb-8">
        Analyze query complexity and generate Request IDs for agent chaining
      </p>

      {/* Input Section */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Input</h2>
        <Textarea
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          placeholder="Enter a user query to analyze..."
          className="min-h-[100px] mb-4"
          disabled={loading}
        />
        <Button onClick={handleDetect} disabled={loading || !userQuery.trim()}>
          {loading ? 'Analyzing...' : 'Detect Complexity'}
        </Button>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="p-6 mb-6 border-red-500 bg-red-50 dark:bg-red-950">
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
            Error
          </h3>
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </Card>
      )}

      {/* Results Display */}
      {result && (
        <div className="space-y-6">
          {/* Request ID */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Request ID</h2>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Request ID:</p>
              <code className="block p-2 bg-muted rounded text-sm">
                {result.requestId}
              </code>
              <p className="text-sm text-muted-foreground">
                Agent Chain: {result.requestContext.agentChain.join(' → ')}
              </p>
            </div>
          </Card>

          {/* Complexity Score */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Complexity Analysis</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Complexity Score</p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex-1 bg-muted h-4 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${result.complexity.score * 100}%` }}
                    />
                  </div>
                  <span className="text-2xl font-bold">
                    {(result.complexity.score * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Reasoning Passes</p>
                <p className="text-3xl font-bold">{result.complexity.reasoningPasses}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {result.complexity.reasoningPasses === 1 && 'Simple query - single pass'}
                  {result.complexity.reasoningPasses === 2 && 'Medium complexity - two passes'}
                  {result.complexity.reasoningPasses === 3 && 'Complex query - three passes'}
                </p>
              </div>
            </div>
          </Card>

          {/* Factors */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Complexity Factors</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded">
                <span>Query Length</span>
                <span className="font-mono">
                  {(result.complexity.factors.queryLength * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded">
                <span>Multiple Questions</span>
                <span>{result.complexity.factors.hasMultipleQuestions ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded">
                <span>Multi-Step</span>
                <span>{result.complexity.factors.requiresMultiStep ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded">
                <span>Analysis Required</span>
                <span>{result.complexity.factors.involvesAnalysis ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded">
                <span>Data Aggregation</span>
                <span>{result.complexity.factors.needsDataAggregation ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </Card>

          {/* Detected Keywords */}
          {result.detectedKeywords.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Detected Keywords</h2>
              <div className="flex flex-wrap gap-2">
                {result.detectedKeywords.map((keyword, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Store in Pinecone Button */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Storage</h2>
            <Button
              onClick={async () => {
                // TODO: Implement Pinecone storage (see AGENT-10)
                alert('Pinecone storage will be implemented in AGENT-10');
              }}
            >
              Store in Pinecone
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
```

## Pinecone Schema

When storing Complexity Detector outputs in Pinecone:

```typescript
interface ComplexityPineconeMetadata {
  // Request ID (required for chaining)
  requestId: string;
  agentName: 'complexity-detector';
  agentChain: string[]; // ['complexity-detector']
  
  // Content (for embedding/search)
  content: string; // The user query being analyzed
  userQuery: string;
  
  // Complexity scores (for filtering/querying)
  complexityScore: number; // 0.0-1.0
  reasoningPasses: number; // 1, 2, or 3
  
  // Metadata
  timestamp: string; // ISO 8601
  detectedKeywords: string[]; // Keywords that influenced score
  factors: {
    queryLength: number;
    hasMultipleQuestions: boolean;
    requiresMultiStep: boolean;
    involvesAnalysis: boolean;
    needsDataAggregation: boolean;
  };
}
```

## Request ID Integration

The Complexity Detector **generates** the Request ID (since it's typically first):

```typescript
// In detectComplexity method:
const requestContext = generateRequestId(userQuery); // GENERATE new ID
const updatedContext = addAgentToChain(requestContext, 'complexity-detector');

// Include in output for propagation:
return {
  requestId: updatedContext.requestId, // Pass to next agent
  requestContext: updatedContext, // Full context
  // ... rest of output
};
```

## Testing

Create `lib/agents/complexity-detector.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ComplexityDetector } from './complexity-detector';

describe('ComplexityDetector', () => {
  const detector = new ComplexityDetector();

  it('should detect simple queries as low complexity', async () => {
    const result = await detector.detectComplexity('list all facilities');
    
    expect(result.complexity.score).toBeLessThan(0.4);
    expect(result.complexity.reasoningPasses).toBe(1);
    expect(result.requestId).toBeDefined();
  });

  it('should detect complex queries as high complexity', async () => {
    const result = await detector.detectComplexity(
      'analyze all facilities, identify contamination patterns, compare with historical data, and suggest improvements'
    );
    
    expect(result.complexity.score).toBeGreaterThan(0.7);
    expect(result.complexity.reasoningPasses).toBe(3);
    expect(result.requestId).toBeDefined();
  });

  it('should generate Request ID', async () => {
    const result = await detector.detectComplexity('test query');
    
    expect(result.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(result.requestContext.agentChain).toContain('complexity-detector');
  });
});
```

## Next Steps

1. **Test the detector** - Try various queries and verify complexity scores
2. **Verify Request ID generation** - Ensure IDs are unique and properly formatted
3. **Store in Pinecone** - Implement Pinecone storage (see AGENT-10)
4. **Proceed to Thought Agent** - Next agent that will use the Request ID

## Next Blueprint

After implementing Complexity Detector, proceed to:
**AGENT-03-THOUGHT-AGENT.md** - This agent will receive the Request ID from Complexity Detector.


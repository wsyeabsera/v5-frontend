# Core Reasoning Layers - Thought, Planner, and Dynamic Reasoning

## Overview

This blueprint covers the foundational reasoning components that transform simple chat into structured thinking:

1. **Thought Agent**: Generates internal reasoning and explores solution approaches
2. **Planner Agent**: Converts thoughts into structured, executable action plans
3. **Complexity Detector**: Evaluates task difficulty to determine reasoning depth
4. **Dynamic Reasoning Controller**: Orchestrates multi-pass thinking based on complexity

## Architecture

```
User Query
    ↓
Complexity Detector → [Simple: 1 pass | Complex: 3 passes]
    ↓
Thought Agent (reasoning pass 1)
    ↓
Planner Agent (converts thoughts to plan)
    ↓
[If complex → Thought Agent (pass 2) → Planner (refinement)]
    ↓
[If very complex → Thought Agent (pass 3) → Planner (optimization)]
    ↓
Final Plan
```

## 1. Complexity Detector

**Purpose**: Analyze user queries to determine required reasoning depth.

**Location**: `lib/agents/complexity-detector.ts`

### Implementation

```typescript
export interface ComplexityScore {
  score: number; // 0.0 (simple) to 1.0 (very complex)
  reasoningPasses: number; // 1, 2, or 3
  factors: {
    queryLength: number;
    hasMultipleQuestions: boolean;
    requiresMultiStep: boolean;
    involvesAnalysis: boolean;
    needsDataAggregation: boolean;
  };
}

export class ComplexityDetector {
  /**
   * Analyze query complexity using heuristics and LLM assessment
   */
  async detectComplexity(
    query: string,
    context?: {
      previousMessages?: number;
      availableTools?: number;
    }
  ): Promise<ComplexityScore> {
    // Heuristic factors
    const factors = {
      queryLength: this.normalize(query.length, 0, 500),
      hasMultipleQuestions: (query.match(/\?/g) || []).length > 1 ? 1 : 0,
      requiresMultiStep: this.hasMultiStepKeywords(query) ? 1 : 0,
      involvesAnalysis: this.hasAnalysisKeywords(query) ? 1 : 0,
      needsDataAggregation: this.hasAggregationKeywords(query) ? 1 : 0,
    };

    // Weighted complexity score
    const score =
      factors.queryLength * 0.2 +
      factors.hasMultipleQuestions * 0.15 +
      factors.requiresMultiStep * 0.25 +
      factors.involvesAnalysis * 0.25 +
      factors.needsDataAggregation * 0.15;

    // Determine reasoning passes
    let reasoningPasses = 1;
    if (score > 0.7) reasoningPasses = 3;
    else if (score > 0.4) reasoningPasses = 2;

    return {
      score,
      reasoningPasses,
      factors,
    };
  }

  private hasMultiStepKeywords(query: string): boolean {
    const keywords = ['then', 'after', 'next', 'follow', 'sequence', 'step'];
    return keywords.some(k => query.toLowerCase().includes(k));
  }

  private hasAnalysisKeywords(query: string): boolean {
    const keywords = ['analyze', 'compare', 'evaluate', 'assess', 'examine', 'review'];
    return keywords.some(k => query.toLowerCase().includes(k));
  }

  private hasAggregationKeywords(query: string): boolean {
    const keywords = ['all', 'every', 'total', 'summarize', 'overview', 'summary'];
    return keywords.some(k => query.toLowerCase().includes(k));
  }

  private normalize(value: number, min: number, max: number): number {
    return Math.min(1, Math.max(0, (value - min) / (max - min)));
  }
}
```

## 2. Thought Agent

**Purpose**: Generate internal reasoning and explore multiple solution approaches.

**Location**: `lib/agents/thought-agent.ts`

### Interface

```typescript
export interface Thought {
  id: string;
  timestamp: Date;
  reasoning: string; // Natural language reasoning
  approaches: string[]; // Multiple possible approaches
  constraints: string[]; // Key constraints identified
  assumptions: string[]; // Assumptions made
  uncertainties: string[]; // Areas of uncertainty
  confidence: number; // 0-1 confidence in this thought
}

export interface ThoughtAgentResult {
  thoughts: Thought[];
  primaryApproach: string;
  keyInsights: string[];
  recommendedTools: string[];
}
```

### Implementation

```typescript
import { BaseAgent } from './base-agent';
import { Thought, ThoughtAgentResult } from '@/types';

export class ThoughtAgent extends BaseAgent {
  private readonly systemPrompt = `You are a Thought Agent - your job is to think through problems deeply before taking action.

When given a user query:
1. Break down what the user is really asking for
2. Identify multiple possible approaches
3. List key constraints and requirements
4. Note any assumptions you're making
5. Identify areas of uncertainty
6. Suggest which tools might be helpful

Be thorough but concise. Think like a senior engineer planning a solution.`;

  /**
   * Generate reasoning thoughts for a user query
   */
  async generateThought(
    userQuery: string,
    context: {
      previousThoughts?: Thought[];
      availableTools?: string[];
      conversationHistory?: Array<{ role: string; content: string }>;
    } = {}
  ): Promise<ThoughtAgentResult> {
    const messages = [
      {
        role: 'system' as const,
        content: this.systemPrompt,
      },
      {
        role: 'user' as const,
        content: this.buildThoughtPrompt(userQuery, context),
      },
    ];

    const response = await this.callLLM(messages, {
      temperature: 0.7, // Creative thinking
      maxTokens: 1000,
    });

    // Parse structured response
    const thought = this.parseThoughtResponse(response, userQuery);
    
    return {
      thoughts: [thought],
      primaryApproach: thought.approaches[0] || 'Unknown',
      keyInsights: thought.reasoning.split('\n').filter(Boolean),
      recommendedTools: this.extractToolSuggestions(response),
    };
  }

  /**
   * Generate multiple thoughts in a reasoning loop
   */
  async generateThoughtLoop(
    userQuery: string,
    previousThought: Thought | null,
    passNumber: number,
    maxPasses: number
  ): Promise<Thought> {
    const prompt = previousThought
      ? `Previous thought (pass ${passNumber - 1}/${maxPasses}):
${previousThought.reasoning}

Approaches considered:
${previousThought.approaches.join('\n')}

Uncertainties:
${previousThought.uncertainties.join('\n')}

User query: ${userQuery}

Think deeper. Refine your reasoning. Address the uncertainties. Consider alternative angles.`
      : `User query: ${userQuery}

Think through this problem. Generate your initial reasoning.`;

    const messages = [
      { role: 'system' as const, content: this.systemPrompt },
      { role: 'user' as const, content: prompt },
    ];

    const response = await this.callLLM(messages, {
      temperature: passNumber === 1 ? 0.8 : 0.6, // More creative first pass
      maxTokens: 1200,
    });

    return this.parseThoughtResponse(response, userQuery, passNumber);
  }

  private buildThoughtPrompt(
    query: string,
    context: {
      previousThoughts?: Thought[];
      availableTools?: string[];
      conversationHistory?: Array<{ role: string; content: string }>;
    }
  ): string {
    let prompt = `User Query: ${query}\n\n`;

    if (context.availableTools && context.availableTools.length > 0) {
      prompt += `Available Tools: ${context.availableTools.join(', ')}\n\n`;
    }

    if (context.previousThoughts && context.previousThoughts.length > 0) {
      prompt += `Previous Thoughts:\n${context.previousThoughts
        .map(t => `- ${t.reasoning.substring(0, 200)}...`)
        .join('\n')}\n\n`;
    }

    prompt += `Think through this problem. Provide your reasoning in this format:

REASONING: [Your detailed reasoning about the problem]

APPROACHES:
1. [First approach]
2. [Second approach]
3. [Alternative approach if applicable]

CONSTRAINTS: [Key constraints, requirements, limitations]

ASSUMPTIONS: [Assumptions you're making]

UNCERTAINTIES: [What you're uncertain about]

TOOLS: [Which tools might help]`;

    return prompt;
  }

  private parseThoughtResponse(
    response: string,
    userQuery: string,
    passNumber: number = 1
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

  private extractSection(text: string, section: string): string | null {
    const regex = new RegExp(`${section}:\\s*([\\s\\S]*?)(?:\\n\\n|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }

  private extractList(text: string, section: string): string[] {
    const sectionText = this.extractSection(text, section);
    if (!sectionText) return [];

    // Extract numbered or bulleted items
    const items = sectionText
      .split(/\n/)
      .map(line => line.replace(/^\d+\.\s*|^-\s*|^\*\s*/, '').trim())
      .filter(Boolean);

    return items;
  }

  private extractToolSuggestions(response: string): string[] {
    const toolsSection = this.extractSection(response, 'TOOLS');
    if (!toolsSection) return [];

    return toolsSection
      .split(/[,\n]/)
      .map(t => t.trim())
      .filter(Boolean);
  }

  private estimateConfidence(response: string): number {
    // Simple heuristic: more uncertainties = lower confidence
    const uncertainties = this.extractList(response, 'UNCERTAINTIES');
    const baseConfidence = 0.7;
    const uncertaintyPenalty = Math.min(0.3, uncertainties.length * 0.1);
    return Math.max(0.3, baseConfidence - uncertaintyPenalty);
  }
}
```

## 3. Planner Agent

**Purpose**: Convert thoughts into structured, executable action plans.

**Location**: `lib/agents/planner-agent.ts`

### Interface

```typescript
export interface Plan {
  id: string;
  goal: string;
  steps: PlanStep[];
  estimatedComplexity: number;
  confidence: number;
  dependencies: string[]; // Step IDs that depend on others
}

export interface PlanStep {
  id: string;
  order: number;
  description: string;
  action: string; // Tool name or action type
  parameters?: Record<string, any>;
  expectedOutcome: string;
  dependencies?: string[]; // IDs of steps that must complete first
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

export interface PlannerAgentResult {
  plan: Plan;
  alternativePlans?: Plan[];
  rationale: string;
}
```

### Implementation

```typescript
import { BaseAgent } from './base-agent';
import { Thought, Plan, PlanStep, PlannerAgentResult } from '@/types';

export class PlannerAgent extends BaseAgent {
  private readonly systemPrompt = `You are a Planner Agent - your job is to convert reasoning thoughts into structured, executable action plans.

Create detailed plans with:
1. Clear goal statement
2. Ordered steps with dependencies
3. Specific tool calls where needed
4. Expected outcomes for each step
5. Proper sequencing (consider dependencies)

Format your plans clearly. Think like a project manager breaking down work.`;

  /**
   * Generate an action plan from thoughts
   */
  async generatePlan(
    thoughts: Thought[],
    userQuery: string,
    availableTools: string[]
  ): Promise<PlannerAgentResult> {
    const messages = [
      {
        role: 'system' as const,
        content: this.systemPrompt,
      },
      {
        role: 'user' as const,
        content: this.buildPlanningPrompt(thoughts, userQuery, availableTools),
      },
    ];

    const response = await this.callLLM(messages, {
      temperature: 0.5, // More structured, less creative
      maxTokens: 2000,
    });

    const plan = this.parsePlanResponse(response, userQuery, thoughts);
    
    return {
      plan,
      rationale: this.extractRationale(response),
    };
  }

  /**
   * Refine an existing plan based on feedback or new information
   */
  async refinePlan(
    originalPlan: Plan,
    feedback: {
      issues?: string[];
      newRequirements?: string[];
      context?: any;
    }
  ): Promise<Plan> {
    const messages = [
      { role: 'system' as const, content: this.systemPrompt },
      {
        role: 'user' as const,
        content: `Original Plan:
${this.formatPlanForPrompt(originalPlan)}

Feedback/Issues:
${feedback.issues?.join('\n') || 'None'}

New Requirements:
${feedback.newRequirements?.join('\n') || 'None'}

Refine this plan. Fix issues. Incorporate new requirements.`,
      },
    ];

    const response = await this.callLLM(messages, {
      temperature: 0.4,
      maxTokens: 2000,
    });

    return this.parsePlanResponse(response, originalPlan.goal);
  }

  private buildPlanningPrompt(
    thoughts: Thought[],
    userQuery: string,
    availableTools: string[]
  ): string {
    const primaryThought = thoughts[thoughts.length - 1]; // Use most recent thought

    return `User Query: ${userQuery}

Thought Agent Reasoning:
${primaryThought.reasoning}

Approaches Considered:
${primaryThought.approaches.join('\n')}

Constraints:
${primaryThought.constraints.join('\n')}

Available Tools: ${availableTools.join(', ')}

Create a detailed action plan. Format:

GOAL: [Clear statement of the objective]

STEPS:
1. [Step description]
   Action: [tool name or action]
   Parameters: {key: value}
   Expected: [what should happen]
   Depends on: [step numbers if any]

2. [Next step]
   ...

RATIONALE: [Why this plan will work]`;
  }

  private parsePlanResponse(
    response: string,
    goal: string,
    thoughts?: Thought[]
  ): Plan {
    const goalMatch = this.extractSection(response, 'GOAL');
    const stepsText = this.extractSection(response, 'STEPS');
    
    const steps = this.parseSteps(stepsText || response);
    
    // Calculate confidence based on thought confidence if available
    const baseConfidence = thoughts?.length
      ? thoughts.reduce((sum, t) => sum + t.confidence, 0) / thoughts.length
      : 0.7;

    return {
      id: `plan-${Date.now()}`,
      goal: goalMatch || goal,
      steps,
      estimatedComplexity: this.estimateComplexity(steps),
      confidence: baseConfidence * 0.9, // Slightly lower than thought confidence
      dependencies: this.extractDependencies(steps),
    };
  }

  private parseSteps(stepsText: string): PlanStep[] {
    const stepRegex = /(\d+)\.\s*([^\n]+)(?:\n\s*Action:\s*([^\n]+))?(?:\n\s*Parameters:\s*([^\n]+))?(?:\n\s*Expected:\s*([^\n]+))?(?:\n\s*Depends on:\s*([^\n]+))?/gi;
    const matches = Array.from(stepsText.matchAll(stepRegex));

    return matches.map((match, index) => {
      const order = parseInt(match[1]) || index + 1;
      const description = match[2]?.trim() || '';
      const action = match[3]?.trim() || 'unknown';
      const parametersText = match[4]?.trim();
      const expectedOutcome = match[5]?.trim() || 'Success';
      const dependenciesText = match[6]?.trim();

      let parameters: Record<string, any> = {};
      if (parametersText) {
        try {
          parameters = JSON.parse(parametersText);
        } catch {
          // If not JSON, treat as key-value pairs
          parameters = { value: parametersText };
        }
      }

      const dependencies = dependenciesText
        ? dependenciesText.split(',').map(d => `step-${d.trim()}`)
        : [];

      return {
        id: `step-${order}`,
        order,
        description,
        action,
        parameters,
        expectedOutcome,
        dependencies,
        status: 'pending' as const,
      };
    });
  }

  private extractDependencies(steps: PlanStep[]): string[] {
    const deps = new Set<string>();
    steps.forEach(step => {
      step.dependencies?.forEach(dep => deps.add(dep));
    });
    return Array.from(deps);
  }

  private estimateComplexity(steps: PlanStep[]): number {
    // More steps = higher complexity
    return Math.min(1, steps.length / 10);
  }

  private extractRationale(response: string): string {
    return this.extractSection(response, 'RATIONALE') || 'Plan created based on reasoning.';
  }

  private formatPlanForPrompt(plan: Plan): string {
    return `GOAL: ${plan.goal}

STEPS:
${plan.steps.map(s => `${s.order}. ${s.description}
   Action: ${s.action}
   Expected: ${s.expectedOutcome}`).join('\n')}`;
  }
}
```

## 4. Dynamic Reasoning Controller

**Purpose**: Orchestrate multi-pass reasoning based on complexity.

**Location**: `lib/orchestrator/reasoning-controller.ts`

### Implementation

```typescript
import { ComplexityDetector, ComplexityScore } from '../agents/complexity-detector';
import { ThoughtAgent, Thought } from '../agents/thought-agent';
import { PlannerAgent, Plan } from '../agents/planner-agent';

export interface ReasoningResult {
  thoughts: Thought[];
  finalPlan: Plan;
  reasoningPasses: number;
  complexity: ComplexityScore;
}

export class ReasoningController {
  constructor(
    private complexityDetector: ComplexityDetector,
    private thoughtAgent: ThoughtAgent,
    private plannerAgent: PlannerAgent
  ) {}

  /**
   * Execute dynamic reasoning loop based on complexity
   */
  async executeReasoning(
    userQuery: string,
    context: {
      availableTools?: string[];
      conversationHistory?: Array<{ role: string; content: string }>;
    } = {}
  ): Promise<ReasoningResult> {
    // Step 1: Detect complexity
    const complexity = await this.complexityDetector.detectComplexity(
      userQuery,
      context
    );

    console.log(`[Reasoning] Complexity: ${complexity.score.toFixed(2)}, Passes: ${complexity.reasoningPasses}`);

    // Step 2: Execute reasoning passes
    const thoughts: Thought[] = [];
    let previousThought: Thought | null = null;

    for (let pass = 1; pass <= complexity.reasoningPasses; pass++) {
      console.log(`[Reasoning] Pass ${pass}/${complexity.reasoningPasses}`);

      const thought = await this.thoughtAgent.generateThoughtLoop(
        userQuery,
        previousThought,
        pass,
        complexity.reasoningPasses
      );

      thoughts.push(thought);
      previousThought = thought;

      // Brief pause between passes for clarity
      if (pass < complexity.reasoningPasses) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Step 3: Generate plan from final thought
    const finalPlan = await this.plannerAgent.generatePlan(
      thoughts,
      userQuery,
      context.availableTools || []
    );

    return {
      thoughts,
      finalPlan: finalPlan.plan,
      reasoningPasses: complexity.reasoningPasses,
      complexity,
    };
  }

  /**
   * Execute single-pass reasoning for simple queries
   */
  async quickReasoning(
    userQuery: string,
    availableTools: string[] = []
  ): Promise<{ thought: Thought; plan: Plan }> {
    const thoughtResult = await this.thoughtAgent.generateThought(
      userQuery,
      { availableTools }
    );

    const plannerResult = await this.plannerAgent.generatePlan(
      thoughtResult.thoughts,
      userQuery,
      availableTools
    );

    return {
      thought: thoughtResult.thoughts[0],
      plan: plannerResult.plan,
    };
  }
}
```

## Base Agent

**Location**: `lib/agents/base-agent.ts`

All agents extend this base class:

```typescript
export abstract class BaseAgent {
  constructor(
    protected apiKey: string,
    protected modelId: string
  ) {}

  /**
   * Call LLM with messages
   */
  protected async callLLM(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<string> {
    // Use your existing AI server or direct API call
    const response = await fetch('/api/ai-completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        modelId: this.modelId,
        apiKey: this.apiKey,
        ...options,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM call failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content || data.message || '';
  }

  /**
   * Extract section from LLM response
   */
  protected extractSection(text: string, section: string): string | null {
    const regex = new RegExp(`${section}:\\s*([\\s\\S]*?)(?:\\n\\n[A-Z]+:|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }
}
```

## Integration with Chat API

**Location**: `app/api/intelligent-chat/route.ts`

```typescript
import { ReasoningController } from '@/lib/orchestrator/reasoning-controller';
import { ComplexityDetector } from '@/lib/agents/complexity-detector';
import { ThoughtAgent } from '@/lib/agents/thought-agent';
import { PlannerAgent } from '@/lib/agents/planner-agent';
import { listMCPTools } from '@/lib/mcp-prompts';

export async function POST(req: Request) {
  const { messages, modelId, apiKey } = await req.json();
  const userQuery = messages[messages.length - 1]?.content || '';

  // Get available tools
  const tools = await listMCPTools().catch(() => []);
  const toolNames = tools.map(t => t.name);

  // Initialize agents
  const complexityDetector = new ComplexityDetector();
  const thoughtAgent = new ThoughtAgent(apiKey, modelId);
  const plannerAgent = new PlannerAgent(apiKey, modelId);
  const reasoningController = new ReasoningController(
    complexityDetector,
    thoughtAgent,
    plannerAgent
  );

  // Execute reasoning
  const reasoningResult = await reasoningController.executeReasoning(userQuery, {
    availableTools: toolNames,
    conversationHistory: messages.slice(0, -1),
  });

  // Build enhanced system prompt with reasoning
  const systemPrompt = `You are an intelligent assistant. Here's your reasoning:

${reasoningResult.thoughts.map(t => `Thought: ${t.reasoning}`).join('\n\n')}

Plan:
${reasoningResult.finalPlan.steps.map(s => `${s.order}. ${s.description}`).join('\n')}

Execute this plan using available tools.`;

  // Continue with normal chat flow...
  // (Proxy to AI server with enhanced context)
}
```

## Testing

**Location**: `lib/agents/complexity-detector.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { ComplexityDetector } from './complexity-detector';

describe('ComplexityDetector', () => {
  const detector = new ComplexityDetector();

  it('should detect simple queries as low complexity', async () => {
    const result = await detector.detectComplexity('list all facilities');
    expect(result.score).toBeLessThan(0.4);
    expect(result.reasoningPasses).toBe(1);
  });

  it('should detect complex queries as high complexity', async () => {
    const result = await detector.detectComplexity(
      'analyze all facilities, identify contamination patterns, compare with historical data, and suggest improvements'
    );
    expect(result.score).toBeGreaterThan(0.7);
    expect(result.reasoningPasses).toBe(3);
  });
});
```

## Next Steps

1. **Create Base Agent** (`lib/agents/base-agent.ts`)
   - Abstract class with LLM calling utilities
   - Common helper methods

2. **Implement Complexity Detector** (`lib/agents/complexity-detector.ts`)
   - Heuristic-based complexity scoring
   - Integration with LLM for advanced assessment (optional)

3. **Implement Thought Agent** (`lib/agents/thought-agent.ts`)
   - Generate reasoning thoughts
   - Support multi-pass thinking

4. **Implement Planner Agent** (`lib/agents/planner-agent.ts`)
   - Convert thoughts to structured plans
   - Handle plan refinement

5. **Create Reasoning Controller** (`lib/orchestrator/reasoning-controller.ts`)
   - Orchestrate reasoning loops
   - Manage complexity-based passes

6. **Integrate with Intelligent Chat API**
   - New route: `app/api/intelligent-chat/route.ts`
   - Enhance system prompts with reasoning

7. **Add to Types** (`types/index.ts`)
   - `Thought`, `Plan`, `PlanStep` interfaces
   - `ComplexityScore` interface

8. **Test Each Component**
   - Unit tests for each agent
   - Integration tests for reasoning controller

## Dependencies

- Base Agent must be created first
- Types should be added before implementing agents
- Reasoning Controller depends on all three agents

## Next Blueprint

Read `09-QUALITY-ASSURANCE-LAYERS.md` to add Critic Agent, Meta-Cognition, and Confidence Modeling.


# Agent Implementation Blueprint 08: Simulation Agent (Advanced/Optional)

## Overview

The **Simulation Agent** mentally simulates plan outcomes before execution. It's an advanced layer that enables lookahead reasoning and early risk detection.

**Key Responsibilities:**
- Predict potential outcomes of executing a plan
- Identify risks before they occur
- Simulate different scenarios
- Provide "what-if" analysis

## Prerequisites

- **AGENT-01** (Request ID System)
- **AGENT-04** (Planner Agent) - Provides plans to simulate
- Understanding of scenario planning

## Step-by-Step Implementation

### Step 1: Add Simulation Types

Add to `types/index.ts`:

```typescript
/**
 * Simulation Scenario
 */
export interface SimulationScenario {
  id: string;
  description: string;
  predictedOutcome: string;
  probability: number; // 0.0-1.0
  risks: string[];
  benefits: string[];
}

/**
 * Simulation Agent Output
 */
export interface SimulationAgentOutput extends AgentOutput {
  scenarios: SimulationScenario[];
  mostLikelyOutcome: string;
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: string;
}
```

### Step 2: Implement Simulation Agent

Create `lib/agents/simulation-agent.ts`:

```typescript
import { BaseAgent } from './base-agent';
import { Plan, SimulationAgentOutput, SimulationScenario, RequestContext } from '@/types';
import { addAgentToChain } from '@/lib/utils/request-id';

/**
 * Simulation Agent
 * 
 * Mentally simulates plan outcomes before execution.
 * This is optional and can be skipped for simple queries.
 */
export class SimulationAgent extends BaseAgent {
  private readonly systemPrompt = `You are a Simulation Agent - you predict outcomes before execution.

Your job is to:
1. Simulate what might happen if a plan is executed
2. Consider multiple scenarios (best case, worst case, typical)
3. Identify potential risks and benefits
4. Estimate probabilities
5. Provide recommendations

Think like a risk analyst doing scenario planning.`;

  /**
   * Simulate plan execution
   */
  async simulatePlan(
    plan: Plan,
    context: any,
    requestContext: RequestContext
  ): Promise<SimulationAgentOutput> {
    const updatedContext = addAgentToChain(requestContext, 'simulation-agent');

    const prompt = this.buildSimulationPrompt(plan, context);

    const messages = [
      { role: 'system' as const, content: this.systemPrompt },
      { role: 'user' as const, content: prompt },
    ];

    const response = await this.callLLM(messages, {
      temperature: 0.6, // Some creativity for scenario exploration
      maxTokens: 2000,
    });

    const scenarios = this.parseScenarios(response);
    const mostLikelyOutcome = this.extractMostLikelyOutcome(response);
    const riskLevel = this.assessRiskLevel(scenarios);

    return {
      requestId: updatedContext.requestId,
      agentName: 'simulation-agent',
      timestamp: new Date(),
      requestContext: updatedContext,
      scenarios,
      mostLikelyOutcome,
      riskLevel,
      recommendation: this.extractRecommendation(response),
    };
  }

  private buildSimulationPrompt(plan: Plan, context: any): string {
    return `Plan to Simulate:
GOAL: ${plan.goal}

STEPS:
${plan.steps.map(s => `${s.order}. ${s.description}`).join('\n')}

Simulate potential outcomes. Provide:

SCENARIOS:
1. [Scenario description]
   Outcome: [what happens]
   Probability: [0.0-1.0]
   Risks: [list of risks]
   Benefits: [list of benefits]

2. [Next scenario...]

MOST_LIKELY: [Most likely outcome]

RISK_LEVEL: [low/medium/high]

RECOMMENDATION: [Should we proceed?]`;
  }

  private parseScenarios(response: string): SimulationScenario[] {
    const scenariosSection = this.extractSection(response, 'SCENARIOS');
    if (!scenariosSection) return [];

    // Parse scenario format (simplified - could be enhanced)
    const scenarioRegex = /(\d+)\.\s*([^\n]+)\n\s*Outcome:\s*([^\n]+)\n\s*Probability:\s*([\d.]+)/gi;
    const matches = Array.from(scenariosSection.matchAll(scenarioRegex));

    return matches.map((match, index) => ({
      id: `scenario-${index + 1}`,
      description: match[2]?.trim() || '',
      predictedOutcome: match[3]?.trim() || '',
      probability: parseFloat(match[4]) || 0.5,
      risks: [], // Could parse from response
      benefits: [],
    }));
  }

  private extractMostLikelyOutcome(response: string): string {
    return this.extractSection(response, 'MOST_LIKELY') || 'Unknown';
  }

  private assessRiskLevel(scenarios: SimulationScenario[]): 'low' | 'medium' | 'high' {
    // Simple heuristic: count high-risk scenarios
    const highRiskCount = scenarios.filter(s => 
      s.risks.some(r => r.toLowerCase().includes('high') || r.toLowerCase().includes('critical'))
    ).length;

    if (highRiskCount >= 2) return 'high';
    if (highRiskCount >= 1) return 'medium';
    return 'low';
  }

  private extractRecommendation(response: string): string {
    return this.extractSection(response, 'RECOMMENDATION') || 'Proceed with caution';
  }
}
```

### Step 3: Create API Route

Create `app/api/agents/simulation-agent/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { SimulationAgent } from '@/lib/agents/simulation-agent';
import { Plan, RequestContext } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plan, context, requestContext, apiKey, modelId } = body;

    if (!plan) return NextResponse.json({ error: 'plan required' }, { status: 400 });
    if (!requestContext?.requestId) {
      return NextResponse.json({ error: 'requestContext required' }, { status: 400 });
    }

    const agent = new SimulationAgent(apiKey, modelId);
    const result = await agent.simulatePlan(plan, context, requestContext);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to simulate plan' },
      { status: 500 }
    );
  }
}
```

## Pinecone Schema

```typescript
interface SimulationPineconeMetadata {
  requestId: string;
  agentName: 'simulation-agent';
  agentChain: string[];
  scenarioCount: number;
  riskLevel: string;
  mostLikelyOutcome: string;
  timestamp: string;
}
```

## Request ID Integration

```typescript
const updatedContext = addAgentToChain(requestContext, 'simulation-agent');
```

## Note on Optional Nature

This agent is **optional** and can be skipped for:
- Simple queries (complexity score < 0.4)
- Real-time requirements (where simulation adds latency)
- Low-risk operations

Consider making it configurable or conditional based on complexity/risk.

## Next Blueprint

**AGENT-09-REFLECTION-AGENT.md** - Post-execution learning and improvement.


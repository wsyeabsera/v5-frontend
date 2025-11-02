# Advanced Layers - Simulation and Imagination

## Overview

This blueprint covers the most advanced cognitive layer:

1. **Simulation Agent**: Mentally simulates plan outcomes before execution
2. **Risk Prediction**: Identifies potential failures and side effects
3. **Lookahead Reasoning**: Enables multi-step anticipation

This layer enables "imagination" - the system can think through "what if" scenarios before taking action.

## Architecture

```
Plan from Planner Agent
    ↓
Simulation Agent (imagines outcomes)
    ↓
Multiple Scenario Simulations
    ├─→ Best Case Scenario
    ├─→ Expected Scenario
    ├─→ Worst Case Scenario
    └─→ Edge Cases
    ↓
Risk Assessment
    ├─→ Potential Failures
    ├─→ Side Effects
    └─→ Dependencies
    ↓
Risk Report to Critic Agent
    ↓
Plan Refinement or Approval
```

## 1. Simulation Agent

**Purpose**: Mentally simulate plan execution and predict outcomes before taking action.

**Location**: `lib/agents/simulation-agent.ts`

### Interface

```typescript
export interface SimulationScenario {
  id: string;
  type: 'best_case' | 'expected' | 'worst_case' | 'edge_case';
  description: string;
  simulatedSteps: SimulatedStep[];
  finalOutcome: string;
  successProbability: number; // 0.0 to 1.0
  estimatedDuration: number; // milliseconds
  risks: Risk[];
}

export interface SimulatedStep {
  stepId: string;
  simulatedAction: string;
  expectedResult: string;
  potentialIssues: string[];
  dependencies: string[];
}

export interface Risk {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'failure' | 'delay' | 'side_effect' | 'dependency';
  description: string;
  affectedSteps: string[];
  mitigation?: string;
  probability: number; // 0.0 to 1.0
}

export interface SimulationResult {
  planId: string;
  scenarios: SimulationScenario[];
  overallRisk: number; // 0.0 to 1.0
  recommendation: 'proceed' | 'revise' | 'abort';
  confidence: number; // 0.0 to 1.0
  keyFindings: string[];
  suggestedImprovements: string[];
}
```

### Implementation

```typescript
import { BaseAgent } from './base-agent';
import { Plan, PlanStep } from '@/types';
import { SimulationResult, SimulationScenario, Risk } from '@/types';

export class SimulationAgent extends BaseAgent {
  private readonly systemPrompt = `You are a Simulation Agent - you mentally simulate plan execution to predict outcomes.

Your job is to:
1. Imagine how a plan would execute in different scenarios
2. Identify potential risks and failures
3. Predict side effects and dependencies
4. Assess overall plan safety and feasibility

Think like a systems engineer doing failure mode analysis. Be thorough but realistic.`;

  /**
   * Simulate plan execution across multiple scenarios
   */
  async simulatePlan(
    plan: Plan,
    context: {
      availableTools?: string[];
      historicalData?: any;
      constraints?: string[];
    } = {}
  ): Promise<SimulationResult> {
    const messages = [
      {
        role: 'system' as const,
        content: this.systemPrompt,
      },
      {
        role: 'user' as const,
        content: this.buildSimulationPrompt(plan, context),
      },
    ];

    const response = await this.callLLM(messages, {
      temperature: 0.6, // Creative thinking for scenarios
      maxTokens: 3000,
    });

    return this.parseSimulationResult(response, plan.id);
  }

  /**
   * Quick risk check (faster, less thorough)
   */
  async quickRiskCheck(plan: Plan): Promise<{
    hasRisks: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    criticalRisks: number;
  }> {
    // Heuristic-based quick check
    const risks: string[] = [];

    // Check for steps with no dependencies (potential race conditions)
    const independentSteps = plan.steps.filter(s => 
      !s.dependencies || s.dependencies.length === 0
    );
    if (independentSteps.length > 3) {
      risks.push('Many independent steps - potential ordering issues');
    }

    // Check for circular dependencies
    if (this.hasCircularDependencies(plan.steps)) {
      risks.push('Circular dependencies detected');
    }

    // Check for steps referencing unknown tools
    // (Would need tool registry for full check)

    const hasRisks = risks.length > 0;
    const riskLevel = risks.length > 2 ? 'high' : risks.length > 0 ? 'medium' : 'low';
    const criticalRisks = risks.filter(r => r.includes('critical') || r.includes('Circular')).length;

    return {
      hasRisks,
      riskLevel,
      criticalRisks,
    };
  }

  private buildSimulationPrompt(
    plan: Plan,
    context: {
      availableTools?: string[];
      historicalData?: any;
      constraints?: string[];
    }
  ): string {
    let prompt = `Plan to Simulate:
GOAL: ${plan.goal}

STEPS:
${plan.steps
  .map(
    s => `${s.order}. ${s.description}
   Action: ${s.action}
   Parameters: ${JSON.stringify(s.parameters || {})}
   Expected: ${s.expectedOutcome}
   Depends on: ${s.dependencies?.join(', ') || 'none'}`
  )
  .join('\n\n')}`;

    if (context.availableTools && context.availableTools.length > 0) {
      prompt += `\n\nAvailable Tools: ${context.availableTools.join(', ')}`;
    }

    if (context.constraints && context.constraints.length > 0) {
      prompt += `\n\nConstraints: ${context.constraints.join(', ')}`;
    }

    prompt += `

Simulate this plan execution. Consider multiple scenarios:

SCENARIOS:

1. BEST_CASE_SCENARIO:
   Description: [Everything goes perfectly]
   Simulated Steps: [Step-by-step ideal execution]
   Final Outcome: [Ideal result]
   Success Probability: [0.0-1.0]
   Estimated Duration: [time estimate]

2. EXPECTED_SCENARIO:
   Description: [Normal execution with typical issues]
   Simulated Steps: [Realistic step-by-step execution]
   Final Outcome: [Likely result]
   Success Probability: [0.0-1.0]
   Estimated Duration: [time estimate]
   Potential Issues: [List any]

3. WORST_CASE_SCENARIO:
   Description: [Everything that could go wrong]
   Simulated Steps: [Step-by-step failure scenarios]
   Final Outcome: [Worst possible result]
   Success Probability: [0.0-1.0]
   Estimated Duration: [time estimate]
   Failure Points: [Where things break]

4. EDGE_CASE_SCENARIO:
   Description: [Unusual but possible scenarios]
   Simulated Steps: [Edge case execution]
   Final Outcome: [Edge case result]
   Success Probability: [0.0-1.0]

RISKS:
[For each risk:]
- [SEVERITY: low/medium/high/critical] [TYPE: failure/delay/side_effect/dependency]
  Description: [Risk description]
  Affected Steps: [step numbers]
  Probability: [0.0-1.0]
  Mitigation: [How to reduce risk]

OVERALL_RISK: [0.0-1.0]
RECOMMENDATION: [proceed/revise/abort]
CONFIDENCE: [0.0-1.0]

KEY_FINDINGS:
- [Important finding 1]
- [Important finding 2]

SUGGESTED_IMPROVEMENTS:
- [Improvement 1]
- [Improvement 2]`;

    return prompt;
  }

  private parseSimulationResult(
    response: string,
    planId: string
  ): SimulationResult {
    const scenarios = this.parseScenarios(response);
    const risks = this.parseRisks(response);
    const overallRisk = this.extractScore(response, 'OVERALL_RISK');
    const recommendation = this.extractRecommendation(response);
    const confidence = this.extractScore(response, 'CONFIDENCE');
    const keyFindings = this.extractList(response, 'KEY_FINDINGS');
    const suggestedImprovements = this.extractList(response, 'SUGGESTED_IMPROVEMENTS');

    return {
      planId,
      scenarios,
      overallRisk,
      recommendation,
      confidence,
      keyFindings,
      suggestedImprovements,
      risks: risks, // Aggregate all risks from scenarios
    };
  }

  private parseScenarios(response: string): SimulationScenario[] {
    const scenarios: SimulationScenario[] = [];
    const scenarioTypes: SimulationScenario['type'][] = [
      'best_case',
      'expected',
      'worst_case',
      'edge_case',
    ];

    for (const type of scenarioTypes) {
      const section = this.extractSection(response, `${type.toUpperCase()}_SCENARIO`);
      if (!section) continue;

      const description = this.extractField(section, 'Description') || '';
      const finalOutcome = this.extractField(section, 'Final Outcome') || '';
      const successProbability = this.extractScore(section, 'Success Probability') || 0.5;
      const estimatedDuration = this.extractDuration(section);

      // Parse simulated steps (simplified)
      const simulatedSteps = this.parseSimulatedSteps(section);
      const risks = this.extractRisksFromScenario(section);

      scenarios.push({
        id: `scenario-${type}-${Date.now()}`,
        type,
        description,
        simulatedSteps,
        finalOutcome,
        successProbability,
        estimatedDuration,
        risks,
      });
    }

    return scenarios;
  }

  private parseSimulatedSteps(text: string): SimulatedStep[] {
    const stepsSection = this.extractSection(text, 'Simulated Steps');
    if (!stepsSection) return [];

    // Parse step-by-step simulation
    const stepRegex = /Step\s+(\d+)[:.]\s*([^\n]+)/gi;
    const matches = Array.from(stepsSection.matchAll(stepRegex));

    return matches.map((match, index) => ({
      stepId: `step-${match[1]}`,
      simulatedAction: match[2]?.trim() || '',
      expectedResult: this.extractField(stepsSection, `Step ${match[1]}`) || '',
      potentialIssues: [],
      dependencies: [],
    }));
  }

  private parseRisks(response: string): Risk[] {
    const risksSection = this.extractSection(response, 'RISKS');
    if (!risksSection) return [];

    const riskRegex = /-\s*\[SEVERITY:\s*(\w+)\]\s*\[TYPE:\s*(\w+)\]\s*Description:\s*([^\n]+)(?:\s*Affected Steps:\s*([^\n]+))?(?:\s*Probability:\s*([0-9.]+))?(?:\s*Mitigation:\s*([^\n]+))?/gi;
    const matches = Array.from(risksSection.matchAll(riskRegex));

    return matches.map(match => ({
      severity: (match[1].toLowerCase() || 'medium') as Risk['severity'],
      type: (match[2].toLowerCase() || 'failure') as Risk['type'],
      description: match[3]?.trim() || '',
      affectedSteps: match[4]
        ? match[4].split(',').map(s => s.trim().replace('step-', ''))
        : [],
      probability: match[5] ? parseFloat(match[5]) : 0.5,
      mitigation: match[6]?.trim(),
    }));
  }

  private extractRisksFromScenario(text: string): Risk[] {
    const risks: Risk[] = [];

    // Extract potential issues
    const issuesSection = this.extractSection(text, 'Potential Issues') ||
                         this.extractSection(text, 'Failure Points');
    
    if (issuesSection) {
      const issues = issuesSection.split(/\n/).filter(Boolean);
      issues.forEach(issue => {
        if (issue.trim()) {
          risks.push({
            severity: 'medium',
            type: 'failure',
            description: issue.trim(),
            affectedSteps: [],
            probability: 0.3,
          });
        }
      });
    }

    return risks;
  }

  private extractField(text: string, field: string): string | null {
    const regex = new RegExp(`${field}:\\s*([^\n]+)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }

  private extractDuration(text: string): number {
    // Extract time estimates (simplified)
    const match = text.match(/(\d+)\s*(second|minute|hour|ms|s|m|h)/i);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      const multipliers: Record<string, number> = {
        ms: 1,
        second: 1000,
        s: 1000,
        minute: 60000,
        m: 60000,
        hour: 3600000,
        h: 3600000,
      };
      return value * (multipliers[unit] || 1000);
    }
    return 5000; // Default 5 seconds
  }

  private extractRecommendation(response: string): 'proceed' | 'revise' | 'abort' {
    const match = response.match(/RECOMMENDATION:\s*(\w+)/i);
    const rec = match?.[1]?.toLowerCase() || 'proceed';

    if (rec.includes('abort') || rec.includes('reject')) return 'abort';
    if (rec.includes('revise') || rec.includes('improve')) return 'revise';
    return 'proceed';
  }

  private hasCircularDependencies(steps: PlanStep[]): boolean {
    // Same implementation as in Critic Agent
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const hasCycle = (stepId: string): boolean => {
      if (visiting.has(stepId)) return true;
      if (visited.has(stepId)) return false;

      visiting.add(stepId);
      const step = steps.find(s => s.id === stepId);
      if (step?.dependencies) {
        for (const dep of step.dependencies) {
          if (hasCycle(dep)) return true;
        }
      }
      visiting.delete(stepId);
      visited.add(stepId);
      return false;
    };

    return steps.some(step => hasCycle(step.id));
  }

  private extractScore(text: string, label: string): number {
    const regex = new RegExp(`${label}:\\s*([0-9.]+)`, 'i');
    const match = text.match(regex);
    if (match) {
      return Math.max(0, Math.min(1, parseFloat(match[1])));
    }
    return 0.5;
  }

  private extractList(text: string, section: string): string[] {
    const sectionText = this.extractSection(text, section);
    if (!sectionText) return [];

    return sectionText
      .split(/\n/)
      .map(line => line.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean);
  }

  private extractSection(text: string, section: string): string | null {
    const regex = new RegExp(`${section}:\\s*([\\s\\S]*?)(?:\\n\\n[A-Z_]+:|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }
}
```

## 2. Integration with Critic Agent

**Location**: `lib/agents/critic-agent.ts` (enhancement)

The Critic Agent can use simulation results to improve its evaluation:

```typescript
import { SimulationAgent, SimulationResult } from './simulation-agent';

export class CriticAgent extends BaseAgent {
  constructor(
    // ... existing params
    private simulationAgent?: SimulationAgent
  ) {
    super(apiKey, modelId);
  }

  /**
   * Critique with simulation insights
   */
  async critiquePlanWithSimulation(
    plan: Plan,
    context: any
  ): Promise<Critique & { simulation?: SimulationResult }> {
    // Run simulation first
    let simulation: SimulationResult | null = null;
    if (this.simulationAgent) {
      simulation = await this.simulationAgent.simulatePlan(plan, context);
    }

    // Enhance critique with simulation insights
    const critique = await this.critiquePlan(plan, {
      ...context,
      simulationResults: simulation,
    });

    return {
      ...critique,
      simulation,
    };
  }
}
```

## 3. Integration with Orchestrator

**Location**: `lib/orchestrator/intelligence-orchestrator.ts` (partial addition)

```typescript
import { SimulationAgent } from '../agents/simulation-agent';

export class IntelligenceOrchestrator {
  constructor(
    // ... other components
    private simulationAgent?: SimulationAgent // Optional
  ) {}

  async processQuery(userQuery: string, context: any): Promise<IntelligenceResult> {
    // ... generate plan ...

    // Optional: Simulate plan if enabled and complexity is high
    let simulationResult: SimulationResult | null = null;
    if (
      this.simulationAgent &&
      reasoningResult.complexity.score > 0.7 &&
      context.enableSimulation !== false
    ) {
      console.log('[Orchestrator] Running simulation...');
      simulationResult = await this.simulationAgent.simulatePlan(plan, {
        availableTools: context.availableTools || [],
      });

      // Use simulation insights in critique
      if (simulationResult.recommendation === 'abort') {
        // Abort before execution
        return {
          ...result,
          action: 'abort',
          reason: 'Simulation identified critical risks',
          simulation: simulationResult,
        };
      }

      if (simulationResult.recommendation === 'revise') {
        // Refine plan based on simulation findings
        plan = await this.plannerAgent.refinePlan(plan, {
          issues: simulationResult.keyFindings,
          newRequirements: simulationResult.suggestedImprovements,
        });
      }
    }

    // ... continue with normal flow ...

    return {
      ...result,
      simulation: simulationResult,
    };
  }
}
```

## Usage Considerations

### When to Enable Simulation

1. **High Complexity Tasks**: When complexity score > 0.7
2. **Critical Operations**: When plan involves data modification or deletions
3. **User Request**: When user explicitly asks for "what if" analysis
4. **Cost-Benefit**: When simulation cost < potential failure cost

### Performance Trade-offs

- **Pros**: Prevents costly mistakes, identifies risks early
- **Cons**: Adds latency (extra LLM call), increases token usage
- **Mitigation**: 
  - Use quick risk check for simple plans
  - Cache simulation results for similar plans
  - Parallelize with critique when possible

### Configuration

```typescript
interface SimulationConfig {
  enabled: boolean;
  complexityThreshold: number; // Only simulate if complexity > this
  maxScenarios: number; // Limit number of scenarios
  includeEdgeCases: boolean;
  riskThreshold: number; // Abort if risk > this
}
```

## Testing

**Location**: `lib/agents/simulation-agent.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { SimulationAgent } from './simulation-agent';
import { Plan } from '@/types';

describe('SimulationAgent', () => {
  it('should identify risks in plans', async () => {
    const agent = new SimulationAgent('test-key', 'test-model');
    
    const riskyPlan: Plan = {
      id: 'test-plan',
      goal: 'Delete all data',
      steps: [
        {
          id: 'step-1',
          order: 1,
          description: 'Delete all facilities',
          action: 'delete_facility',
          status: 'pending',
        },
      ],
      estimatedComplexity: 0.8,
      confidence: 0.5,
      dependencies: [],
    };

    const riskCheck = await agent.quickRiskCheck(riskyPlan);
    expect(riskCheck.hasRisks).toBe(true);
  });
});
```

## Future Enhancements

1. **Monte Carlo Simulation**: Run multiple randomized simulations
2. **Historical Simulation**: Use past execution data to inform predictions
3. **Partial Simulation**: Simulate only risky steps
4. **Interactive Simulation**: Allow users to explore "what if" scenarios
5. **Simulation Visualization**: Show decision trees and outcomes

## Next Steps

1. **Implement Simulation Agent** (`lib/agents/simulation-agent.ts`)
   - Scenario generation
   - Risk identification
   - Outcome prediction

2. **Update Types** (`types/index.ts`)
   - Add simulation-related interfaces

3. **Integrate with Orchestrator**
   - Optional simulation before execution
   - Use simulation insights in critique

4. **Add Configuration**
   - Enable/disable simulation
   - Set complexity thresholds
   - Configure scenario types

5. **Test Simulation**
   - Unit tests for scenario generation
   - Integration tests with orchestrator
   - Performance benchmarks

## Dependencies

- Requires Planner Agent from blueprint 08
- Integrates with Critic Agent from blueprint 09
- Optional but recommended for high-complexity tasks

## Next Blueprint

Read `13-IMPLEMENTATION-GUIDE.md` for the complete step-by-step implementation roadmap.


# Quality Assurance Layers - Critic, Meta-Cognition, and Confidence

## Overview

This blueprint covers the quality assurance components that prevent errors and enable self-correction:

1. **Critic Agent**: Pre-execution plan evaluator that catches issues before they happen
2. **Meta-Agent**: Self-awareness layer that questions the reasoning process itself
3. **Confidence Scorer**: Quantifies uncertainty at every decision point

These layers work together to create feedback loops that improve reasoning quality.

## Architecture

```
Plan from Planner Agent
    ↓
Critic Agent (evaluates plan)
    ├─→ Score < 0.8? → Suggest improvements → Planner refines
    └─→ Score ≥ 0.8? → Proceed
    ↓
Meta-Agent (evaluates reasoning quality)
    ├─→ Confidence < 0.6? → Request replanning
    └─→ Confidence ≥ 0.6? → Proceed
    ↓
Confidence Scorer (final confidence check)
    ├─→ High (≥0.8): Execute immediately
    ├─→ Medium (0.6-0.8): Execute with caution
    ├─→ Low (0.4-0.6): Ask for clarification
    └─→ Very Low (<0.4): Request help or replan
    ↓
Execution or Replanning
```

## 1. Critic Agent

**Purpose**: Evaluate plans before execution to catch errors, identify risks, and suggest improvements.

**Location**: `lib/agents/critic-agent.ts`

### Interface

```typescript
export interface Critique {
  id: string;
  planId: string;
  overallScore: number; // 0.0 to 1.0
  feasibilityScore: number; // Can this plan actually work?
  correctnessScore: number; // Is this plan logically sound?
  efficiencyScore: number; // Is this the best approach?
  safetyScore: number; // Are there risks?
  issues: CritiqueIssue[];
  strengths: string[];
  suggestions: string[];
  recommendation: 'approve' | 'revise' | 'reject';
}

export interface CritiqueIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'logic' | 'feasibility' | 'efficiency' | 'safety' | 'completeness';
  description: string;
  suggestion: string;
  affectedSteps?: string[]; // Step IDs
}
```

### Implementation

```typescript
import { BaseAgent } from './base-agent';
import { Plan, PlanStep } from '@/types';
import { Critique, CritiqueIssue } from '@/types';

export class CriticAgent extends BaseAgent {
  private readonly systemPrompt = `You are a Critic Agent - a senior engineer reviewing plans before execution.

Your job is to evaluate action plans critically:
1. Check for logical errors or contradictions
2. Verify feasibility with available tools
3. Assess efficiency and completeness
4. Identify potential risks or safety issues
5. Suggest improvements when needed

Be thorough but fair. Your goal is preventing mistakes, not perfectionism.`;

  private readonly APPROVAL_THRESHOLD = 0.8;
  private readonly REVISION_THRESHOLD = 0.6;

  /**
   * Critique a plan before execution
   */
  async critiquePlan(
    plan: Plan,
    context: {
      userQuery: string;
      availableTools: string[];
      previousCritiques?: Critique[];
    }
  ): Promise<Critique> {
    const messages = [
      {
        role: 'system' as const,
        content: this.systemPrompt,
      },
      {
        role: 'user' as const,
        content: this.buildCritiquePrompt(plan, context),
      },
    ];

    const response = await this.callLLM(messages, {
      temperature: 0.3, // Critical analysis - be precise
      maxTokens: 2000,
    });

    return this.parseCritique(response, plan.id);
  }

  /**
   * Quick validation check (faster, less thorough)
   */
  async quickValidate(plan: Plan): Promise<{ valid: boolean; score: number }> {
    // Simplified validation for simple plans
    const issues: string[] = [];

    // Check for empty plan
    if (plan.steps.length === 0) {
      issues.push('Plan has no steps');
    }

    // Check for circular dependencies
    if (this.hasCircularDependencies(plan.steps)) {
      issues.push('Plan has circular dependencies');
    }

    // Check for invalid tool references
    // (Would need tool registry for full validation)

    const score = issues.length === 0 ? 0.9 : Math.max(0.3, 0.9 - issues.length * 0.2);

    return {
      valid: score >= this.APPROVAL_THRESHOLD,
      score,
    };
  }

  private buildCritiquePrompt(
    plan: Plan,
    context: {
      userQuery: string;
      availableTools: string[];
      previousCritiques?: Critique[];
    }
  ): string {
    let prompt = `User Query: ${context.userQuery}

Plan to Evaluate:
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
  .join('\n\n')}

Available Tools: ${context.availableTools.join(', ')}

Evaluate this plan. Provide detailed critique:

OVERALL_SCORE: [0.0-1.0]

FEASIBILITY_SCORE: [0.0-1.0] - Can this plan actually work?
CORRECTNESS_SCORE: [0.0-1.0] - Is this logically sound?
EFFICIENCY_SCORE: [0.0-1.0] - Is this the best approach?
SAFETY_SCORE: [0.0-1.0] - Are there risks?

STRENGTHS:
- [What this plan does well]

ISSUES:
1. [SEVERITY: low/medium/high/critical] [CATEGORY: logic/feasibility/efficiency/safety/completeness]
   [Description]
   Suggestion: [how to fix]
   Affected Steps: [step numbers if applicable]

2. [Next issue...]

SUGGESTIONS:
- [Improvement suggestion 1]
- [Improvement suggestion 2]

RECOMMENDATION: [approve/revise/reject]

RATIONALE: [Why this recommendation]`;

    if (context.previousCritiques && context.previousCritiques.length > 0) {
      prompt += `\n\nPrevious Critiques:
${context.previousCritiques
  .map(c => `Score: ${c.overallScore}, Issues: ${c.issues.length}`)
  .join('\n')}`;
    }

    return prompt;
  }

  private parseCritique(response: string, planId: string): Critique {
    const overallScore = this.extractScore(response, 'OVERALL_SCORE');
    const feasibilityScore = this.extractScore(response, 'FEASIBILITY_SCORE');
    const correctnessScore = this.extractScore(response, 'CORRECTNESS_SCORE');
    const efficiencyScore = this.extractScore(response, 'EFFICIENCY_SCORE');
    const safetyScore = this.extractScore(response, 'SAFETY_SCORE');

    const issues = this.parseIssues(response);
    const strengths = this.extractList(response, 'STRENGTHS');
    const suggestions = this.extractList(response, 'SUGGESTIONS');
    const recommendation = this.extractRecommendation(response);
    const rationale = this.extractSection(response, 'RATIONALE') || '';

    return {
      id: `critique-${Date.now()}`,
      planId,
      overallScore,
      feasibilityScore,
      correctnessScore,
      efficiencyScore,
      safetyScore,
      issues,
      strengths,
      suggestions,
      recommendation,
      rationale,
    };
  }

  private extractScore(text: string, label: string): number {
    const regex = new RegExp(`${label}:\\s*([0-9.]+)`, 'i');
    const match = text.match(regex);
    if (match) {
      const score = parseFloat(match[1]);
      return Math.max(0, Math.min(1, score));
    }
    return 0.5; // Default neutral
  }

  private parseIssues(text: string): CritiqueIssue[] {
    const issuesSection = text.match(/ISSUES:([\s\S]*?)(?:SUGGESTIONS:|RECOMMENDATION:|$)/i);
    if (!issuesSection) return [];

    const issueRegex = /(\d+)\.\s*\[SEVERITY:\s*(\w+)\]\s*\[CATEGORY:\s*(\w+)\]\s*([^\n]+)\s*Suggestion:\s*([^\n]+)(?:\s*Affected Steps:\s*([^\n]+))?/gi;
    const matches = Array.from(issuesSection[1].matchAll(issueRegex));

    return matches.map(match => ({
      severity: (match[2].toLowerCase() || 'medium') as CritiqueIssue['severity'],
      category: (match[3].toLowerCase() || 'logic') as CritiqueIssue['category'],
      description: match[4]?.trim() || '',
      suggestion: match[5]?.trim() || '',
      affectedSteps: match[6]
        ? match[6].split(',').map(s => s.trim().replace('step-', ''))
        : undefined,
    }));
  }

  private extractList(text: string, section: string): string[] {
    const sectionText = this.extractSection(text, section);
    if (!sectionText) return [];

    return sectionText
      .split(/\n/)
      .map(line => line.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean);
  }

  private extractRecommendation(text: string): 'approve' | 'revise' | 'reject' {
    const match = text.match(/RECOMMENDATION:\s*(\w+)/i);
    const rec = match?.[1]?.toLowerCase() || 'revise';

    if (rec.includes('approve')) return 'approve';
    if (rec.includes('reject')) return 'reject';
    return 'revise';
  }

  private hasCircularDependencies(steps: PlanStep[]): boolean {
    // Simple cycle detection
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
}
```

## 2. Meta-Agent

**Purpose**: Self-awareness - the system questions its own reasoning quality and detects when to think deeper.

**Why It Matters**: This is the "senior engineer reviewing a junior's pull request" layer. The Meta-Agent provides **live self-assessment** - the system doesn't just reflect after the fact, it questions its reasoning **during** the thinking process. This prevents overconfidence and enables real-time self-correction.

**Analogy**: Like a senior engineer reviewing a junior's pull request before merge - catching issues, asking "are you sure about this?", and triggering deeper thinking when needed.

**Location**: `lib/agents/meta-agent.ts`

### Interface

```typescript
export interface MetaEvaluation {
  id: string;
  reasoningQuality: number; // 0.0 to 1.0
  confidenceInReasoning: number; // 0.0 to 1.0
  concerns: string[];
  shouldReplan: boolean;
  shouldThinkDeeper: boolean;
  reasoningPassesRecommended: number; // 1, 2, or 3
  feedback: string;
}

export interface ReasoningContext {
  thoughts: Array<{ reasoning: string; confidence: number }>;
  plan: { goal: string; steps: number; confidence: number };
  critique?: { score: number; issues: number };
}
```

### Implementation

```typescript
import { BaseAgent } from './base-agent';
import { Thought } from '@/types';
import { Plan } from '@/types';
import { Critique } from '@/types';
import { MetaEvaluation, ReasoningContext } from '@/types';

export class MetaAgent extends BaseAgent {
  private readonly systemPrompt = `You are a Meta-Agent - a self-awareness layer that evaluates the quality of reasoning itself.

Your job is to:
1. Assess the overall reasoning quality
2. Detect gaps or weaknesses in the thought process
3. Determine if more thinking is needed
4. Provide feedback for improvement

Think like a meta-cognitive system - you're thinking about thinking.`;

  private readonly REPLAN_THRESHOLD = 0.6;
  private readonly DEEP_THINK_THRESHOLD = 0.7;

  /**
   * Live self-assessment during reasoning (not just post-analysis)
   * 
   * This is the key differentiator - the Meta-Agent checks reasoning quality
   * WHILE the system is thinking, not just after it's done.
   */
  async liveSelfAssessment(
    currentThought: { reasoning: string; confidence: number },
    currentPlan: { goal: string; steps: number; confidence: number } | null
  ): Promise<{
    shouldContinue: boolean;
    shouldDeepen: boolean;
    confidenceAdjustment: number; // -1 to 1, how much to adjust confidence
    feedback: string;
  }> {
    const messages = [
      {
        role: 'system' as const,
        content: `You are a Meta-Agent doing LIVE self-assessment. You evaluate reasoning AS IT HAPPENS, not after.

Current reasoning in progress:
${currentThought.reasoning}

Current confidence: ${currentThought.confidence.toFixed(2)}

Question: Is this reasoning chain sound? Should we think deeper? Are we being too confident or not confident enough?

Provide live feedback:

SHOULD_CONTINUE: [yes/no] - Should reasoning continue or stop?
SHOULD_DEEPEN: [yes/no] - Should we think deeper about this?
CONFIDENCE_ADJUSTMENT: [-1.0 to 1.0] - How much to adjust confidence? Negative = less confident, positive = more confident
FEEDBACK: [Your assessment]`,
      },
      {
        role: 'user' as const,
        content: 'Assess the current reasoning state.',
      },
    ];

    const response = await this.callLLM(messages, {
      temperature: 0.4,
      maxTokens: 500,
    });

    return this.parseLiveAssessment(response);
  }

  /**
   * Evaluate the quality of reasoning and decide if replanning is needed
   */
  async evaluateReasoning(
    context: ReasoningContext
  ): Promise<MetaEvaluation> {
    const messages = [
      {
        role: 'system' as const,
        content: this.systemPrompt,
      },
      {
        role: 'user' as const,
        content: this.buildMetaEvaluationPrompt(context),
      },
    ];

    const response = await this.callLLM(messages, {
      temperature: 0.4,
      maxTokens: 1500,
    });

    return this.parseMetaEvaluation(response);
  }

  /**
   * Quick confidence check (faster evaluation)
   */
  async quickConfidenceCheck(
    thoughtConfidence: number,
    planConfidence: number,
    critiqueScore?: number
  ): Promise<{ shouldProceed: boolean; overallConfidence: number }> {
    let overallConfidence = (thoughtConfidence + planConfidence) / 2;

    if (critiqueScore !== undefined) {
      overallConfidence = (overallConfidence + critiqueScore) / 2;
    }

    return {
      shouldProceed: overallConfidence >= this.REPLAN_THRESHOLD,
      overallConfidence,
    };
  }

  private buildMetaEvaluationPrompt(context: ReasoningContext): string {
    let prompt = `Evaluate the quality of this reasoning process:

THOUGHTS GENERATED:
${context.thoughts
  .map(
    (t, i) => `Thought ${i + 1}:
Confidence: ${t.confidence.toFixed(2)}
Reasoning: ${t.reasoning.substring(0, 300)}...`
  )
  .join('\n\n')}

PLAN CREATED:
Goal: ${context.plan.goal}
Steps: ${context.plan.steps}
Plan Confidence: ${context.plan.confidence.toFixed(2)}`;

    if (context.critique) {
      prompt += `

CRITIQUE:
Score: ${context.critique.score.toFixed(2)}
Issues Found: ${context.critique.issues}`;
    }

    prompt += `

Evaluate:
1. Overall reasoning quality (0.0-1.0)
2. Confidence in this reasoning chain (0.0-1.0)
3. Any concerns or weaknesses
4. Should we replan? (yes/no)
5. Should we think deeper? (yes/no)
6. How many reasoning passes would be ideal? (1-3)

Format:

REASONING_QUALITY: [0.0-1.0]
CONFIDENCE: [0.0-1.0]

CONCERNS:
- [Concern 1]
- [Concern 2]

SHOULD_REPLAN: [yes/no]
SHOULD_THINK_DEEPER: [yes/no]
RECOMMENDED_PASSES: [1/2/3]

FEEDBACK: [Your assessment and recommendations]`;

    return prompt;
  }

  private parseMetaEvaluation(response: string): MetaEvaluation {
    const reasoningQuality = this.extractScore(response, 'REASONING_QUALITY');
    const confidence = this.extractScore(response, 'CONFIDENCE');
    const shouldReplan = this.extractBoolean(response, 'SHOULD_REPLAN');
    const shouldThinkDeeper = this.extractBoolean(response, 'SHOULD_THINK_DEEPER');
    const recommendedPasses = this.extractNumber(response, 'RECOMMENDED_PASSES') || 1;
    const concerns = this.extractList(response, 'CONCERNS');
    const feedback = this.extractSection(response, 'FEEDBACK') || '';

    return {
      id: `meta-eval-${Date.now()}`,
      reasoningQuality,
      confidenceInReasoning: confidence,
      concerns,
      shouldReplan,
      shouldThinkDeeper,
      reasoningPassesRecommended: Math.max(1, Math.min(3, recommendedPasses)),
      feedback,
    };
  }

  private extractBoolean(text: string, label: string): boolean {
    const regex = new RegExp(`${label}:\\s*(yes|no|true|false)`, 'i');
    const match = text.match(regex);
    return match ? ['yes', 'true'].includes(match[1].toLowerCase()) : false;
  }

  private parseLiveAssessment(response: string): {
    shouldContinue: boolean;
    shouldDeepen: boolean;
    confidenceAdjustment: number;
    feedback: string;
  } {
    const continueMatch = response.match(/SHOULD_CONTINUE:\s*(yes|no)/i);
    const deepenMatch = response.match(/SHOULD_DEEPEN:\s*(yes|no)/i);
    const adjustmentMatch = response.match(/CONFIDENCE_ADJUSTMENT:\s*([-]?[0-9.]+)/i);
    const feedbackMatch = response.match(/FEEDBACK:\s*([^\n]+(?:\n[^\n]+)*)/i);

    return {
      shouldContinue: continueMatch ? continueMatch[1].toLowerCase() === 'yes' : true,
      shouldDeepen: deepenMatch ? deepenMatch[1].toLowerCase() === 'yes' : false,
      confidenceAdjustment: adjustmentMatch
        ? Math.max(-1, Math.min(1, parseFloat(adjustmentMatch[1])))
        : 0,
      feedback: feedbackMatch ? feedbackMatch[1].trim() : 'No specific feedback',
    };
  }

  private extractNumber(text: string, label: string): number | null {
    const regex = new RegExp(`${label}:\\s*(\\d+)`, 'i');
    const match = text.match(regex);
    return match ? parseInt(match[1]) : null;
  }

  private extractScore(text: string, label: string): number {
    const regex = new RegExp(`${label}:\\s*([0-9.]+)`, 'i');
    const match = text.match(regex);
    if (match) {
      const score = parseFloat(match[1]);
      return Math.max(0, Math.min(1, score));
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
}
```

## 3. Confidence Scorer

**Purpose**: Quantify uncertainty at every decision point and route decisions accordingly.

**Location**: `lib/agents/confidence-scorer.ts`

### Interface

```typescript
export interface ConfidenceAssessment {
  overallConfidence: number; // 0.0 to 1.0
  componentConfidences: {
    thought: number;
    plan: number;
    critique?: number;
    meta?: number;
  };
  action: 'execute' | 'execute_with_caution' | 'clarify' | 'replan' | 'escalate';
  reasoning: string;
  riskFactors: string[];
}

export const CONFIDENCE_THRESHOLDS = {
  EXECUTE: 0.8,
  EXECUTE_WITH_CAUTION: 0.6,
  CLARIFY: 0.4,
  REPLAN: 0.2,
  ESCALATE: 0.0,
} as const;
```

### Implementation

```typescript
import { Thought } from '@/types';
import { Plan } from '@/types';
import { Critique } from '@/types';
import { MetaEvaluation } from './meta-agent';
import { ConfidenceAssessment, CONFIDENCE_THRESHOLDS } from '@/types';

export class ConfidenceScorer {
  /**
   * Aggregate confidence from all components
   */
  calculateConfidence(
    thought: Thought,
    plan: Plan,
    critique?: Critique,
    metaEvaluation?: MetaEvaluation
  ): ConfidenceAssessment {
    const componentConfidences = {
      thought: thought.confidence,
      plan: plan.confidence,
      critique: critique?.overallScore,
      meta: metaEvaluation?.confidenceInReasoning,
    };

    // Weighted average (thought and plan are primary)
    let weights = { thought: 0.3, plan: 0.3, critique: 0.2, meta: 0.2 };
    
    // Adjust weights if some components missing
    if (!componentConfidences.critique) {
      weights.thought += 0.1;
      weights.plan += 0.1;
    }
    if (!componentConfidences.meta) {
      weights.thought += 0.1;
      weights.plan += 0.1;
    }

    let overallConfidence =
      componentConfidences.thought * weights.thought +
      componentConfidences.plan * weights.plan;

    if (componentConfidences.critique) {
      overallConfidence += componentConfidences.critique * weights.critique;
    }
    if (componentConfidences.meta) {
      overallConfidence += componentConfidences.meta * weights.meta;
    }

    // Penalty for critical issues
    if (critique) {
      const criticalIssues = critique.issues.filter(
        i => i.severity === 'critical'
      ).length;
      overallConfidence -= criticalIssues * 0.2;
    }

    // Penalty for meta concerns
    if (metaEvaluation && metaEvaluation.concerns.length > 0) {
      overallConfidence -= metaEvaluation.concerns.length * 0.05;
    }

    overallConfidence = Math.max(0, Math.min(1, overallConfidence));

    const action = this.determineAction(overallConfidence, critique, metaEvaluation);
    const riskFactors = this.identifyRiskFactors(
      componentConfidences,
      critique,
      metaEvaluation
    );

    return {
      overallConfidence,
      componentConfidences,
      action,
      reasoning: this.generateReasoning(overallConfidence, action, riskFactors),
      riskFactors,
    };
  }

  private determineAction(
    confidence: number,
    critique?: Critique,
    metaEvaluation?: MetaEvaluation
  ): ConfidenceAssessment['action'] {
    // Override with critique recommendation if severe
    if (critique?.recommendation === 'reject' && confidence < 0.6) {
      return 'replan';
    }

    // Override with meta recommendation
    if (metaEvaluation?.shouldReplan && confidence < 0.7) {
      return 'replan';
    }

    // Standard thresholds
    if (confidence >= CONFIDENCE_THRESHOLDS.EXECUTE) return 'execute';
    if (confidence >= CONFIDENCE_THRESHOLDS.EXECUTE_WITH_CAUTION)
      return 'execute_with_caution';
    if (confidence >= CONFIDENCE_THRESHOLDS.CLARIFY) return 'clarify';
    if (confidence >= CONFIDENCE_THRESHOLDS.REPLAN) return 'replan';
    return 'escalate';
  }

  private identifyRiskFactors(
    componentConfidences: ConfidenceAssessment['componentConfidences'],
    critique?: Critique,
    metaEvaluation?: MetaEvaluation
  ): string[] {
    const risks: string[] = [];

    if (componentConfidences.thought < 0.5) {
      risks.push('Low confidence in reasoning');
    }
    if (componentConfidences.plan < 0.5) {
      risks.push('Low confidence in plan');
    }
    if (critique && critique.overallScore < 0.6) {
      risks.push('Plan has quality issues');
    }
    if (critique) {
      const highSeverityIssues = critique.issues.filter(
        i => i.severity === 'high' || i.severity === 'critical'
      );
      if (highSeverityIssues.length > 0) {
        risks.push(`${highSeverityIssues.length} high-severity issues found`);
      }
    }
    if (metaEvaluation && metaEvaluation.concerns.length > 0) {
      risks.push('Meta-evaluation raised concerns');
    }

    return risks;
  }

  private generateReasoning(
    confidence: number,
    action: ConfidenceAssessment['action'],
    riskFactors: string[]
  ): string {
    let reasoning = `Overall confidence: ${(confidence * 100).toFixed(0)}%. `;

    switch (action) {
      case 'execute':
        reasoning += 'High confidence. Proceeding with execution.';
        break;
      case 'execute_with_caution':
        reasoning += 'Moderate confidence. Proceeding with caution.';
        if (riskFactors.length > 0) {
          reasoning += ` Risks: ${riskFactors.join(', ')}.`;
        }
        break;
      case 'clarify':
        reasoning += 'Low confidence. Requesting clarification before proceeding.';
        break;
      case 'replan':
        reasoning += 'Very low confidence. Replanning recommended.';
        if (riskFactors.length > 0) {
          reasoning += ` Issues: ${riskFactors.join(', ')}.`;
        }
        break;
      case 'escalate':
        reasoning += 'Extremely low confidence. Human assistance recommended.';
        break;
    }

    return reasoning;
  }
}
```

## Integration with Reasoning Flow - Live Self-Assessment

**Location**: `lib/orchestrator/intelligence-orchestrator.ts` (partial)

### Example: Live Self-Assessment in Reasoning Loop

```typescript
// In ReasoningController or IntelligenceOrchestrator
async executeReasoningWithLiveAssessment(
  userQuery: string,
  metaAgent: MetaAgent,
  context: any
): Promise<ReasoningResult> {
  const thoughts: Thought[] = [];
  
  for (let pass = 1; pass <= maxPasses; pass++) {
    // Generate thought
    const thought = await this.thoughtAgent.generateThoughtLoop(
      userQuery,
      thoughts[thoughts.length - 1] || null,
      pass,
      maxPasses
    );

    // LIVE SELF-ASSESSMENT - check reasoning quality while thinking
    const liveAssessment = await metaAgent.liveSelfAssessment(
      { reasoning: thought.reasoning, confidence: thought.confidence },
      null // Plan not created yet
    );

    // Adjust confidence based on meta-agent feedback
    thought.confidence = Math.max(0, Math.min(1, 
      thought.confidence + liveAssessment.confidenceAdjustment * 0.2
    ));

    // If meta-agent says to think deeper, add another pass
    if (liveAssessment.shouldDeepen && pass < maxPasses) {
      console.log('[Meta-Agent] Requesting deeper thinking:', liveAssessment.feedback);
      maxPasses = Math.min(3, maxPasses + 1);
    }

    // If meta-agent says to stop, abort reasoning
    if (!liveAssessment.shouldContinue) {
      console.log('[Meta-Agent] Reasoning quality too low, stopping:', liveAssessment.feedback);
      break;
    }

    thoughts.push(thought);
  }

  // Continue with planning...
}
```

## Integration with Reasoning Flow

```typescript
import { ReasoningController } from './reasoning-controller';
import { CriticAgent } from '../agents/critic-agent';
import { MetaAgent } from '../agents/meta-agent';
import { ConfidenceScorer } from '../agents/confidence-scorer';

export class IntelligenceOrchestrator {
  constructor(
    private reasoningController: ReasoningController,
    private criticAgent: CriticAgent,
    private metaAgent: MetaAgent,
    private confidenceScorer: ConfidenceScorer,
    private plannerAgent: PlannerAgent // Needed for replanning
  ) {}

  async processQuery(userQuery: string, context: any): Promise<IntelligenceResult> {
    // Step 1: Generate reasoning and plan
    let reasoningResult = await this.reasoningController.executeReasoning(userQuery, context);
    let plan = reasoningResult.finalPlan;

    // Step 2: Critique the plan
    const critique = await this.criticAgent.critiquePlan(plan, {
      userQuery,
      availableTools: context.availableTools || [],
    });

    // Step 3: Meta-evaluation
    const metaEvaluation = await this.metaAgent.evaluateReasoning({
      thoughts: reasoningResult.thoughts,
      plan: {
        goal: plan.goal,
        steps: plan.steps.length,
        confidence: plan.confidence,
      },
      critique: {
        score: critique.overallScore,
        issues: critique.issues.length,
      },
    });

    // Step 4: Calculate overall confidence
    const confidenceAssessment = this.confidenceScorer.calculateConfidence(
      reasoningResult.thoughts[reasoningResult.thoughts.length - 1],
      plan,
      critique,
      metaEvaluation
    );

    // Step 5: Decision routing
    if (confidenceAssessment.action === 'replan' && critique.recommendation !== 'reject') {
      // Refine plan based on critique
      plan = await this.plannerAgent.refinePlan(plan, {
        issues: critique.issues.map(i => i.description),
        newRequirements: critique.suggestions,
      });

      // Re-critique refined plan
      const refinedCritique = await this.criticAgent.critiquePlan(plan, {
        userQuery,
        availableTools: context.availableTools || [],
        previousCritiques: [critique],
      });

      // Recalculate confidence
      const refinedConfidence = this.confidenceScorer.calculateConfidence(
        reasoningResult.thoughts[reasoningResult.thoughts.length - 1],
        plan,
        refinedCritique,
        metaEvaluation
      );

      return {
        reasoningResult,
        plan,
        critique: refinedCritique,
        metaEvaluation,
        confidenceAssessment: refinedConfidence,
        action: refinedConfidence.action,
      };
    }

    return {
      reasoningResult,
      plan,
      critique,
      metaEvaluation,
      confidenceAssessment,
      action: confidenceAssessment.action,
    };
  }
}
```

## Testing

**Location**: `lib/agents/critic-agent.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { CriticAgent } from './critic-agent';
import { Plan } from '@/types';

describe('CriticAgent', () => {
  it('should identify issues in flawed plans', async () => {
    const agent = new CriticAgent('test-key', 'test-model');
    
    const flawedPlan: Plan = {
      id: 'test-plan',
      goal: 'Test goal',
      steps: [], // Empty plan
      estimatedComplexity: 0.5,
      confidence: 0.8,
      dependencies: [],
    };

    const critique = await agent.quickValidate(flawedPlan);
    expect(critique.valid).toBe(false);
    expect(critique.score).toBeLessThan(0.8);
  });
});
```

## Next Steps

1. **Implement Critic Agent** (`lib/agents/critic-agent.ts`)
   - Plan evaluation logic
   - Issue detection
   - Recommendation generation

2. **Implement Meta-Agent** (`lib/agents/meta-agent.ts`)
   - Reasoning quality assessment
   - Replanning decisions
   - Self-awareness logic

3. **Implement Confidence Scorer** (`lib/agents/confidence-scorer.ts`)
   - Confidence aggregation
   - Action routing based on thresholds
   - Risk factor identification

4. **Update Types** (`types/index.ts`)
   - `Critique`, `CritiqueIssue` interfaces
   - `MetaEvaluation`, `ReasoningContext` interfaces
   - `ConfidenceAssessment` interface

5. **Integrate with Orchestrator**
   - Add quality assurance to intelligence flow
   - Implement feedback loops
   - Handle replanning logic

6. **Test Each Component**
   - Unit tests for each agent
   - Integration tests for quality assurance flow

## Dependencies

- Requires Thought Agent and Planner Agent from blueprint 08
- Confidence Scorer aggregates data from all previous agents
- Orchestrator coordinates all quality assurance layers

## 4. Reflection Agent

**Purpose**: Post-execution learning and improvement - analyzing what worked and what didn't.

**Why It Matters**: Reflection is where the system learns from experience. Unlike Critic (which evaluates before execution) or Meta-Agent (which questions during reasoning), Reflection analyzes **after** execution to improve future performance. It's the "what did I learn?" moment.

**Analogy**: Like a project retrospective - after a sprint, the team reflects: "What went well? What didn't? How can we do better next time?"

**Key Difference from Other Agents**:
- **Critic**: Pre-execution evaluation (before action)
- **Meta-Agent**: Live self-assessment (during reasoning)
- **Reflection**: Post-execution learning (after action)

**Location**: `lib/agents/reflection-agent.ts`

### Interface

```typescript
export interface Reflection {
  id: string;
  planId: string;
  executionResult: ExecutionResult;
  insights: ReflectionInsight[];
  lessonsLearned: string[];
  improvements: SuggestedImprovement[];
  confidence: number;
  timestamp: Date;
}

export interface ReflectionInsight {
  category: 'success' | 'failure' | 'efficiency' | 'approach';
  description: string;
  evidence: string[];
  impact: 'low' | 'medium' | 'high';
}

export interface SuggestedImprovement {
  area: 'planning' | 'execution' | 'tool-usage' | 'reasoning';
  suggestion: string;
  priority: 'low' | 'medium' | 'high';
  expectedImpact: string;
}
```

### Implementation

```typescript
import { BaseAgent } from './base-agent';
import { Plan, PlanStep } from '@/types';
import { ExecutionResult, PlanExecutionResult } from '@/types';
import { Reflection, ReflectionInsight, SuggestedImprovement } from '@/types';
import { ToolMemory } from '@/lib/memory/tool-memory';

export class ReflectionAgent extends BaseAgent {
  constructor(
    apiKey: string,
    modelId: string,
    private toolMemory?: ToolMemory
  ) {
    super(apiKey, modelId);
  }

  private readonly systemPrompt = `You are a Reflection Agent - you analyze execution results to extract lessons learned.

After a plan is executed, your job is to:
1. Analyze what worked and what didn't
2. Identify patterns and insights
3. Suggest improvements for future executions
4. Extract lessons that can improve tool usage, planning, and reasoning

Think like a project manager doing a retrospective - be honest, constructive, and actionable.`;

  /**
   * Reflect on execution results and generate insights
   */
  async reflect(
    plan: Plan,
    executionResult: PlanExecutionResult,
    context: {
      originalQuery?: string;
      reasoningSteps?: any[];
      critique?: any;
    } = {}
  ): Promise<Reflection> {
    const messages = [
      {
        role: 'system' as const,
        content: this.systemPrompt,
      },
      {
        role: 'user' as const,
        content: this.buildReflectionPrompt(plan, executionResult, context),
      },
    ];

    const response = await this.callLLM(messages, {
      temperature: 0.5,
      maxTokens: 2000,
    });

    const reflection = this.parseReflection(response, plan.id, executionResult);

    // Update tool memory with insights
    await this.updateToolMemory(reflection, executionResult);

    return reflection;
  }

  private buildReflectionPrompt(
    plan: Plan,
    executionResult: PlanExecutionResult,
    context: any
  ): string {
    return `Plan Executed:
GOAL: ${plan.goal}

STEPS:
${plan.steps.map(s => `${s.order}. ${s.description} (${s.action})`).join('\n')}

Execution Results:
- Overall Success: ${executionResult.overallSuccess ? 'Yes' : 'No'}
- Duration: ${executionResult.totalDuration}ms
- Steps Completed: ${executionResult.steps.filter(s => s.success).length}/${executionResult.steps.length}
- Errors: ${executionResult.errors.length > 0 ? executionResult.errors.join(', ') : 'None'}

Step-by-Step Results:
${executionResult.steps.map(s => `
Step ${s.stepId}:
  Success: ${s.success}
  Duration: ${s.duration}ms
  Retries: ${s.retries}
  ${s.error ? `Error: ${s.error}` : `Result: ${JSON.stringify(s.result).substring(0, 200)}...`}
`).join('\n')}

${context.originalQuery ? `Original Query: ${context.originalQuery}\n` : ''}

Reflect on this execution. Provide:

INSIGHTS:
1. [CATEGORY: success/failure/efficiency/approach]
   Description: [What happened]
   Evidence: [Supporting evidence]
   Impact: [low/medium/high]

2. [Next insight...]

LESSONS_LEARNED:
- [Lesson 1 - what can we learn from this?]
- [Lesson 2 - what patterns do we see?]

IMPROVEMENTS:
1. [AREA: planning/execution/tool-usage/reasoning]
   Suggestion: [What should we do differently next time?]
   Priority: [low/medium/high]
   Expected Impact: [What will this improve?]

2. [Next improvement...]

CONFIDENCE: [0.0-1.0] - How confident are you in these insights?`;
  }

  private parseReflection(
    response: string,
    planId: string,
    executionResult: PlanExecutionResult
  ): Reflection {
    const insights = this.parseInsights(response);
    const lessonsLearned = this.extractList(response, 'LESSONS_LEARNED');
    const improvements = this.parseImprovements(response);
    const confidence = this.extractScore(response, 'CONFIDENCE');

    return {
      id: `reflection-${Date.now()}`,
      planId,
      executionResult,
      insights,
      lessonsLearned,
      improvements,
      confidence,
      timestamp: new Date(),
    };
  }

  private parseInsights(response: string): ReflectionInsight[] {
    const insightsSection = this.extractSection(response, 'INSIGHTS');
    if (!insightsSection) return [];

    const insightRegex = /(\d+)\.\s*\[CATEGORY:\s*(\w+)\]\s*Description:\s*([^\n]+)\s*Evidence:\s*([^\n]+)\s*Impact:\s*(\w+)/gi;
    const matches = Array.from(insightsSection.matchAll(insightRegex));

    return matches.map(match => ({
      category: (match[2].toLowerCase() || 'success') as ReflectionInsight['category'],
      description: match[3]?.trim() || '',
      evidence: match[4]?.split(',').map(e => e.trim()),
      impact: (match[5].toLowerCase() || 'medium') as ReflectionInsight['impact'],
    }));
  }

  private parseImprovements(response: string): SuggestedImprovement[] {
    const improvementsSection = this.extractSection(response, 'IMPROVEMENTS');
    if (!improvementsSection) return [];

    const improvementRegex = /(\d+)\.\s*\[AREA:\s*(\w+)\]\s*Suggestion:\s*([^\n]+)\s*Priority:\s*(\w+)\s*Expected Impact:\s*([^\n]+)/gi;
    const matches = Array.from(improvementsSection.matchAll(improvementRegex));

    return matches.map(match => ({
      area: (match[2].toLowerCase() || 'planning') as SuggestedImprovement['area'],
      suggestion: match[3]?.trim() || '',
      priority: (match[4].toLowerCase() || 'medium') as SuggestedImprovement['priority'],
      expectedImpact: match[5]?.trim() || '',
    }));
  }

  /**
   * Update tool memory based on reflection insights
   */
  private async updateToolMemory(
    reflection: Reflection,
    executionResult: PlanExecutionResult
  ): Promise<void> {
    if (!this.toolMemory) return;

    // Extract tool usage insights
    for (const stepResult of executionResult.steps) {
      const step = reflection.executionResult.steps.find(s => s.stepId === stepResult.stepId);
      if (!step) continue;

      // Find corresponding plan step to get tool name
      // This would require passing the plan steps to reflection
      // For now, we'll use a simplified approach

      const toolInsights = reflection.insights.filter(i => 
        i.description.toLowerCase().includes('tool') || 
        i.category === 'efficiency'
      );

      if (toolInsights.length > 0 && stepResult.success) {
        // Remember successful tool usage patterns
        // This is a simplified example - full implementation would track actual tool names
      }
    }
  }

  private extractScore(text: string, label: string): number {
    const regex = new RegExp(`${label}:\\s*([0-9.]+)`, 'i');
    const match = text.match(regex);
    return match ? Math.max(0, Math.min(1, parseFloat(match[1]))) : 0.7;
  }

  private extractList(text: string, section: string): string[] {
    const sectionText = this.extractSection(response, section);
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

### Integration Example

```typescript
// After execution
const reflection = await reflectionAgent.reflect(plan, executionResult, {
  originalQuery: userQuery,
  reasoningSteps: reasoningResult.thoughts,
  critique: critiqueResult,
});

// Use insights to improve future planning
if (reflection.improvements.length > 0) {
  console.log('Reflection insights:', reflection.lessonsLearned);
  // Store improvements for future use
}
```

## Next Blueprint

Read `10-MEMORY-SYSTEMS.md` to implement Tool Memory, Goal Memory, and Working Memory.


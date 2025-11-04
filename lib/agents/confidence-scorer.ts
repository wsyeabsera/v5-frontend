import { ConfidenceScorerOutput, ConfidenceScore, RequestContext } from '@/types';
import { addAgentToChain } from '@/lib/utils/request-id';
import { createInternalAgent } from './executor-agent/utils/internal-llm-agent';
import { logger } from '@/utils/logger';

/**
 * Agent weight configuration for weighted confidence scoring
 */
const AGENT_WEIGHTS: Record<string, number> = {
  'thought-agent': 0.25,      // Foundation - important but not critical
  'planner-agent': 0.30,     // Execution path - critical for success
  'critic-agent': 0.35,      // Quality gate - most important for confidence
  'meta-agent': 0.10,        // Meta-analysis - supporting
};

const DEFAULT_WEIGHT = 0.10; // For unknown agents

/**
 * Confidence Scorer
 * 
 * Aggregates confidence scores from multiple agents and makes routing decisions.
 * Enhanced with weighted scoring, pattern analysis, and LLM-powered reasoning.
 * This is a utility class - it does NOT extend BaseAgent, but uses InternalLLMAgent for LLM calls.
 */
export class ConfidenceScorer {
  // Thresholds for routing decisions
  private readonly THRESHOLDS = {
    EXECUTE: 0.8,    // High confidence - proceed
    REVIEW: 0.6,     // Medium - ask for clarification
    RETHINK: 0.4,    // Low - replan
    ESCALATE: 0.2,   // Very low - request help
  };

  private llmAgent = createInternalAgent('confidence-scorer');

  /**
   * Score overall confidence from agent outputs
   */
  async scoreConfidence(
    agentScores: ConfidenceScore[],
    requestContext: RequestContext,
    headers?: Headers
  ): Promise<ConfidenceScorerOutput> {
    const updatedContext = addAgentToChain(requestContext, 'confidence-scorer');

    // Initialize LLM agent if headers provided
    if (headers) {
      try {
        await this.llmAgent.initialize(headers);
      } catch (error: any) {
        logger.warn(`[ConfidenceScorer] Failed to initialize LLM agent: ${error.message}`);
        // Continue without LLM - will use fallback reasoning
      }
    }

    // Calculate weighted confidence
    const weightedConfidence = this.calculateWeightedConfidence(agentScores);
    
    // Calculate simple average (for backward compatibility)
    const overallConfidence = this.aggregateScores(agentScores);

    // Analyze score patterns
    const scoreVariance = this.calculateVariance(agentScores);
    const scorePattern = this.detectPattern(agentScores);
    const agentAnalysis = this.analyzeAgents(agentScores);

    // Calculate confidence breakdown by dimension
    const confidenceBreakdown = this.calculateBreakdown(agentScores);

    // Make routing decision (use weighted confidence)
    const decision = this.makeDecision(weightedConfidence);

    // Generate enhanced reasoning (with LLM if available, fallback otherwise)
    const confidenceReasoning = await this.generateEnhancedReasoning(
      weightedConfidence,
      agentScores,
      decision,
      scoreVariance,
      scorePattern,
      agentAnalysis,
      headers
    );

    // Generate routing recommendation
    const routingRecommendation = this.generateRoutingRecommendation(
      weightedConfidence,
      decision,
      scorePattern,
      agentAnalysis
    );

    return {
      requestId: updatedContext.requestId,
      agentName: 'confidence-scorer',
      timestamp: new Date(),
      requestContext: updatedContext,
      overallConfidence, // Keep for backward compatibility
      weightedConfidence,
      agentScores,
      decision,
      thresholdUsed: {
        execute: this.THRESHOLDS.EXECUTE,
        review: this.THRESHOLDS.REVIEW,
        rethink: this.THRESHOLDS.RETHINK,
        escalate: this.THRESHOLDS.ESCALATE,
      },
      reasoning: confidenceReasoning, // Enhanced reasoning
      confidenceReasoning, // New field with enhanced analysis
      scoreVariance,
      confidenceBreakdown,
      routingRecommendation,
      agentAnalysis,
      scorePattern,
    };
  }

  /**
   * Calculate weighted confidence score
   */
  private calculateWeightedConfidence(scores: ConfidenceScore[]): number {
    if (scores.length === 0) return 0.5;

    let weightedSum = 0;
    let totalWeight = 0;

    for (const score of scores) {
      const weight = AGENT_WEIGHTS[score.agentName] || DEFAULT_WEIGHT;
      weightedSum += score.score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  /**
   * Aggregate confidence scores (simple average - for backward compatibility)
   */
  private aggregateScores(scores: ConfidenceScore[]): number {
    if (scores.length === 0) return 0.5;
    const sum = scores.reduce((acc, s) => acc + s.score, 0);
    return sum / scores.length;
  }

  /**
   * Calculate variance in scores (measure of consistency)
   */
  private calculateVariance(scores: ConfidenceScore[]): number {
    if (scores.length === 0) return 0;
    
    const mean = this.aggregateScores(scores);
    const squaredDiffs = scores.map(s => Math.pow(s.score - mean, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / scores.length;
    
    return variance;
  }

  /**
   * Detect pattern in scores
   */
  private detectPattern(scores: ConfidenceScore[]): 'all-high' | 'all-low' | 'mixed' | 'consistent' {
    if (scores.length === 0) return 'consistent';
    
    const highCount = scores.filter(s => s.score >= 0.7).length;
    const lowCount = scores.filter(s => s.score <= 0.4).length;
    const variance = this.calculateVariance(scores);
    
    if (variance < 0.01) return 'consistent';
    if (highCount === scores.length) return 'all-high';
    if (lowCount === scores.length) return 'all-low';
    return 'mixed';
  }

  /**
   * Analyze which agents are driving confidence
   */
  private analyzeAgents(scores: ConfidenceScore[]): {
    primaryDriver: string | null;
    lowestConfidence: string | null;
    highestConfidence: string | null;
    concerns: string[];
  } {
    if (scores.length === 0) {
      return {
        primaryDriver: null,
        lowestConfidence: null,
        highestConfidence: null,
        concerns: [],
      };
    }

    const sorted = [...scores].sort((a, b) => b.score - a.score);
    const highest = sorted[0];
    const lowest = sorted[sorted.length - 1];

    // Primary driver is the agent with highest weight-adjusted impact
    const weightedImpacts = scores.map(s => ({
      agentName: s.agentName,
      impact: s.score * (AGENT_WEIGHTS[s.agentName] || DEFAULT_WEIGHT),
    }));
    const primaryDriver = weightedImpacts.reduce((max, curr) => 
      curr.impact > max.impact ? curr : max
    ).agentName;

    // Identify concerns (low confidence agents with high weight)
    const concerns = scores
      .filter(s => s.score < 0.5 && (AGENT_WEIGHTS[s.agentName] || DEFAULT_WEIGHT) >= 0.25)
      .map(s => `${s.agentName} (${(s.score * 100).toFixed(0)}%)`);

    return {
      primaryDriver,
      lowestConfidence: lowest.agentName,
      highestConfidence: highest.agentName,
      concerns,
    };
  }

  /**
   * Calculate confidence breakdown by dimension
   */
  private calculateBreakdown(scores: ConfidenceScore[]): {
    reasoning: number;
    planning: number;
    execution: number;
  } {
    const breakdown = {
      reasoning: 0.5,
      planning: 0.5,
      execution: 0.5,
    };

    // Map agents to dimensions
    const reasoningAgents = scores.filter(s => 
      s.agentName === 'thought-agent' || s.agentName === 'meta-agent'
    );
    const planningAgents = scores.filter(s => 
      s.agentName === 'planner-agent' || s.agentName === 'critic-agent'
    );
    const executionAgents = scores.filter(s => 
      s.agentName === 'executor-agent'
    );

    if (reasoningAgents.length > 0) {
      breakdown.reasoning = reasoningAgents.reduce((sum, s) => sum + s.score, 0) / reasoningAgents.length;
    }
    if (planningAgents.length > 0) {
      breakdown.planning = planningAgents.reduce((sum, s) => sum + s.score, 0) / planningAgents.length;
    }
    if (executionAgents.length > 0) {
      breakdown.execution = executionAgents.reduce((sum, s) => sum + s.score, 0) / executionAgents.length;
    }

    return breakdown;
  }

  /**
   * Generate routing recommendation for orchestrator
   */
  private generateRoutingRecommendation(
    confidence: number,
    decision: string,
    pattern: string,
    agentAnalysis: ReturnType<typeof this.analyzeAgents>
  ): string {
    const recommendations: string[] = [];

    if (decision === 'execute') {
      recommendations.push('Proceed with execution');
      if (pattern === 'consistent') {
        recommendations.push('All agents show consistent high confidence');
      }
    } else if (decision === 'review') {
      recommendations.push('Request human review before execution');
      if (agentAnalysis.concerns.length > 0) {
        recommendations.push(`Focus review on: ${agentAnalysis.concerns.join(', ')}`);
      }
    } else if (decision === 'rethink') {
      recommendations.push('Trigger replanning');
      if (agentAnalysis.lowestConfidence) {
        recommendations.push(`Address concerns in ${agentAnalysis.lowestConfidence}`);
      }
      if (pattern === 'mixed') {
        recommendations.push('Scores are inconsistent - consider refining specific agent outputs');
      }
    } else {
      recommendations.push('Escalate to human operator');
      recommendations.push('Very low confidence across all agents');
    }

    return recommendations.join('. ') + '.';
  }

  /**
   * Generate enhanced reasoning using LLM (with fallback)
   */
  private async generateEnhancedReasoning(
    confidence: number,
    scores: ConfidenceScore[],
    decision: string,
    variance: number,
    pattern: string,
    agentAnalysis: ReturnType<typeof this.analyzeAgents>,
    headers?: Headers
  ): Promise<string> {
    // Fallback to simple reasoning if headers not provided or LLM not available
    if (!headers) {
      return this.generateSimpleReasoning(confidence, scores, decision);
    }

    // Try to use LLM if initialized, otherwise fallback
    try {
      // Ensure LLM agent is initialized - try to initialize if not already done
      // We can't check agentConfig directly as it's protected, so we'll try to initialize
      // and catch if it's already initialized
      try {
        await this.llmAgent.initialize(headers);
      } catch (initError: any) {
        // If already initialized, that's fine - continue
        if (!initError.message.includes('not found or disabled')) {
          throw initError;
        }
      }
      const systemPrompt = `You are a Confidence Scorer analyzing agent confidence patterns.

Your job is to analyze confidence scores from multiple agents and provide sophisticated reasoning about:
1. Why the overall confidence is at this level
2. What patterns you see in the scores
3. What specific concerns exist
4. How confidence should influence routing decisions

Be specific and actionable.`;

      const userPrompt = `Analyze these confidence scores:

${scores.map(s => `- ${s.agentName}: ${(s.score * 100).toFixed(0)}% (${s.reasoning})`).join('\n')}

Overall Weighted Confidence: ${(confidence * 100).toFixed(0)}%
Decision: ${decision}
Score Variance: ${variance.toFixed(3)}
Pattern: ${pattern}
Primary Driver: ${agentAnalysis.primaryDriver || 'N/A'}
Lowest Confidence: ${agentAnalysis.lowestConfidence || 'N/A'}
Concerns: ${agentAnalysis.concerns.length > 0 ? agentAnalysis.concerns.join(', ') : 'None'}

Provide a detailed analysis explaining the confidence assessment and any concerns.`;

      const response = await this.llmAgent.callLLMPublic(
        [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: userPrompt },
        ],
        {
          temperature: 0.3,
          maxTokens: 500,
        }
      );

      return response.trim();
    } catch (error: any) {
      logger.warn(`[ConfidenceScorer] LLM reasoning failed: ${error.message}, using fallback`);
      return this.generateSimpleReasoning(confidence, scores, decision);
    }
  }

  /**
   * Generate simple reasoning (fallback)
   */
  private generateSimpleReasoning(
    confidence: number,
    scores: ConfidenceScore[],
    decision: string
  ): string {
    const agentNames = scores.map(s => s.agentName).join(', ');
    return `Overall weighted confidence: ${(confidence * 100).toFixed(0)}% based on scores from ${agentNames}. Decision: ${decision}.`;
  }

  /**
   * Make routing decision based on confidence
   */
  private makeDecision(confidence: number): 'execute' | 'review' | 'rethink' | 'escalate' {
    if (confidence >= this.THRESHOLDS.EXECUTE) return 'execute';
    if (confidence >= this.THRESHOLDS.REVIEW) return 'review';
    if (confidence >= this.THRESHOLDS.RETHINK) return 'rethink';
    return 'escalate';
  }
}


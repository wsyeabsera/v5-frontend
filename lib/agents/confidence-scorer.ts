import { ConfidenceScorerOutput, ConfidenceScore, RequestContext } from '@/types';
import { addAgentToChain } from '@/lib/utils/request-id';

/**
 * Confidence Scorer
 * 
 * Aggregates confidence scores from multiple agents and makes routing decisions.
 * This is a utility class - it does NOT extend BaseAgent.
 */
export class ConfidenceScorer {
  // Thresholds for routing decisions
  private readonly THRESHOLDS = {
    EXECUTE: 0.8,    // High confidence - proceed
    REVIEW: 0.6,     // Medium - ask for clarification
    RETHINK: 0.4,    // Low - replan
    ESCALATE: 0.2,   // Very low - request help
  };

  /**
   * Score overall confidence from agent outputs
   */
  async scoreConfidence(
    agentScores: ConfidenceScore[],
    requestContext: RequestContext
  ): Promise<ConfidenceScorerOutput> {
    const updatedContext = addAgentToChain(requestContext, 'confidence-scorer');

    // Aggregate scores (weighted average)
    const overallConfidence = this.aggregateScores(agentScores);

    // Make routing decision
    const decision = this.makeDecision(overallConfidence);

    // Generate reasoning
    const reasoning = this.generateReasoning(overallConfidence, agentScores, decision);

    return {
      requestId: updatedContext.requestId,
      agentName: 'confidence-scorer',
      timestamp: new Date(),
      requestContext: updatedContext,
      overallConfidence,
      agentScores,
      decision,
      thresholdUsed: {
        execute: this.THRESHOLDS.EXECUTE,
        review: this.THRESHOLDS.REVIEW,
        rethink: this.THRESHOLDS.RETHINK,
        escalate: this.THRESHOLDS.ESCALATE,
      },
      reasoning,
    };
  }

  /**
   * Aggregate confidence scores (weighted average)
   * 
   * Can be enhanced with agent-specific weights in the future.
   */
  private aggregateScores(scores: ConfidenceScore[]): number {
    if (scores.length === 0) return 0.5; // Default medium confidence

    // Simple average (could be weighted by agent importance)
    // Example weights: thought-agent: 0.3, planner-agent: 0.3, critic-agent: 0.4
    const sum = scores.reduce((acc, s) => acc + s.score, 0);
    return sum / scores.length;
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

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    confidence: number,
    scores: ConfidenceScore[],
    decision: string
  ): string {
    const agentNames = scores.map(s => s.agentName).join(', ');
    return `Overall confidence: ${(confidence * 100).toFixed(0)}% based on scores from ${agentNames}. Decision: ${decision}.`;
  }
}


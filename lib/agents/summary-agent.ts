/**
 * Summary Agent
 * 
 * Generates human-readable summaries from thoughts and execution outputs.
 * Creates well-written, natural prose that synthesizes the reasoning process
 * and execution results into a coherent narrative.
 * 
 * How it works:
 * 1. Receives request ID (like other agents)
 * 2. Validates that both thoughts and execution output exist
 * 3. Uses LLM to generate comprehensive, human-like summary
 * 4. Stores output with Request ID for chaining
 */

import { BaseAgent } from './base-agent'
import { SummaryAgentOutput, ThoughtAgentOutput, ExecutorAgentOutput, RequestContext } from '@/types'
import { logger } from '@/utils/logger'

/**
 * Summary Agent Class
 * 
 * Extends BaseAgent to provide summary generation capabilities.
 */
export class SummaryAgent extends BaseAgent {
  /**
   * Base system prompt that guides the Summary Agent's behavior
   */
  private readonly baseSystemPrompt = `You are a Summary Agent - your job is to create human-readable summaries that directly answer the user's question and provide insights.

CRITICAL: Write directly to the end user, not as a technical report. You are the final output that the user sees, so:
- **Address the user directly**: Use "you" or "your" when appropriate, or write in first-person
- **Answer their question**: Don't explain what "the user was seeking" - just answer what they asked
- **Provide insights**: Give actionable information and key findings
- **Be conversational**: Write naturally, as if explaining to someone who asked the question
- **Avoid meta-commentary**: Don't say "the user requested" or "the system analyzed" - just present the findings

Your summaries should:
- Answer the user's original question directly
- Present findings and insights in a clear, accessible way
- Highlight important information and key takeaways
- Use natural, professional language
- Be well-structured and easy to scan

Format your summary as natural prose, not as structured JSON or bullet points. Write as if you're directly responding to the user's question.`

  constructor() {
    super('summary-agent')
  }

  /**
   * Generate summary from thoughts and execution outputs
   * 
   * @param requestId - Request ID to link the summary
   * @param thoughts - Thought agent output
   * @param execution - Executor agent output
   * @param requestContext - Request context
   * @returns SummaryAgentOutput with human-readable summary
   */
  async generateSummary(
    requestId: string,
    thoughts: ThoughtAgentOutput,
    execution: ExecutorAgentOutput,
    requestContext: RequestContext
  ): Promise<SummaryAgentOutput> {
    // Add this agent to the request chain
    const updatedContext = this.addToChain(requestContext)

    // Build the prompt with thoughts and execution context
    const prompt = this.buildSummaryPrompt(thoughts, execution, requestContext)

    // Call LLM to generate summary
    const messages = [
      { role: 'system' as const, content: this.baseSystemPrompt },
      { role: 'user' as const, content: prompt },
    ]

    logger.debug(`[SummaryAgent] Generating summary`, {
      requestId: updatedContext.requestId,
      thoughtsCount: thoughts.thoughts.length,
      executionStepsCount: execution.executionResult.steps.length,
      executionSuccess: execution.executionResult.overallSuccess,
    })

    const response = await this.callLLM(messages, {
      temperature: 0.7, // Balanced - creative but focused
      maxTokens: 3000, // More tokens for comprehensive summary
    })

    // Parse the summary response
    const summary = response.trim()

    // Extract key takeaways (look for bullet points or numbered lists)
    const keyTakeaways = this.extractKeyTakeaways(response)

    // Create summary sections
    const thoughtsSummary = this.createThoughtsSummary(thoughts)
    const executionSummary = this.createExecutionSummary(execution)

    // Build output
    const output: SummaryAgentOutput = {
      requestId: updatedContext.requestId,
      agentName: 'summary-agent',
      timestamp: new Date(),
      requestContext: updatedContext,
      summary,
      thoughtsSummary,
      executionSummary,
      keyTakeaways,
    }

    logger.info(`[SummaryAgent] Generated summary`, {
      requestId: output.requestId,
      summaryLength: summary.length,
      takeawaysCount: keyTakeaways.length,
    })

    return output
  }

  /**
   * Build prompt for summary generation
   */
  private buildSummaryPrompt(
    thoughts: ThoughtAgentOutput,
    execution: ExecutorAgentOutput,
    requestContext: RequestContext
  ): string {
    let prompt = `# Summary Generation Request\n\n`
    
    prompt += `## Original User Query\n`
    prompt += `${requestContext.userQuery || 'N/A'}\n\n`

    prompt += `## Reasoning Thoughts\n\n`
    for (const thought of thoughts.thoughts) {
      prompt += `### Thought ${thought.confidence ? `(Confidence: ${(thought.confidence * 100).toFixed(0)}%)` : ''}\n\n`
      prompt += `**Reasoning:**\n${thought.reasoning}\n\n`
      
      if (thought.approaches && thought.approaches.length > 0) {
        prompt += `**Approaches Considered:**\n`
        thought.approaches.forEach((approach, i) => {
          prompt += `${i + 1}. ${approach}\n`
        })
        prompt += `\n`
      }

      if (thought.constraints && thought.constraints.length > 0) {
        prompt += `**Constraints:**\n`
        thought.constraints.forEach(constraint => {
          prompt += `- ${constraint}\n`
        })
        prompt += `\n`
      }

      if (thought.keyInsights && thought.keyInsights.length > 0) {
        prompt += `**Key Insights:**\n`
        thought.keyInsights.forEach(insight => {
          prompt += `- ${insight}\n`
        })
        prompt += `\n`
      }
    }

    if (thoughts.primaryApproach) {
      prompt += `**Primary Approach Selected:** ${thoughts.primaryApproach}\n\n`
    }

    if (thoughts.recommendedTools && thoughts.recommendedTools.length > 0) {
      prompt += `**Tools Recommended:** ${thoughts.recommendedTools.join(', ')}\n\n`
    }

    prompt += `## Execution Results\n\n`
    prompt += `**Overall Success:** ${execution.executionResult.overallSuccess ? '✅ Success' : '❌ Failed'}\n\n`
    
    prompt += `**Steps Executed:**\n`
    for (const step of execution.executionResult.steps) {
      prompt += `### Step ${step.stepOrder}${step.stepId ? ` (${step.stepId})` : ''}\n`
      prompt += `- **Status:** ${step.success ? '✅ Success' : '❌ Failed'}\n`
      if (step.toolCalled) {
        prompt += `- **Tool:** ${step.toolCalled}\n`
      }
      if (step.result) {
        const resultStr = typeof step.result === 'string' 
          ? step.result 
          : JSON.stringify(step.result, null, 2)
        prompt += `- **Result:** ${resultStr.substring(0, 500)}${resultStr.length > 500 ? '...' : ''}\n`
      }
      if (step.error) {
        prompt += `- **Error:** ${step.error}\n`
      }
      prompt += `\n`
    }

    if (execution.executionResult.errors && execution.executionResult.errors.length > 0) {
      prompt += `**Errors Encountered:**\n`
      execution.executionResult.errors.forEach(error => {
        prompt += `- ${error}\n`
      })
      prompt += `\n`
    }

    if (execution.executionResult.questionsAsked && execution.executionResult.questionsAsked.length > 0) {
      prompt += `**Questions Asked:**\n`
      execution.executionResult.questionsAsked.forEach(q => {
        prompt += `- ${q.question} (${q.category}, ${q.priority} priority)\n`
      })
      prompt += `\n`
    }

    if (execution.executionResult.adaptations && execution.executionResult.adaptations.length > 0) {
      prompt += `**Plan Adaptations:**\n`
      execution.executionResult.adaptations.forEach(adaptation => {
        prompt += `- ${adaptation.reason}: Changed from "${adaptation.originalAction}" to "${adaptation.adaptedAction}"\n`
      })
      prompt += `\n`
    }

    prompt += `## Your Task\n\n`
    prompt += `Based on the information above, write a summary that directly answers the user's question: "${requestContext.userQuery || 'N/A'}"\n\n`
    prompt += `IMPORTANT INSTRUCTIONS:\n`
    prompt += `- Write directly to the user - address them as "you" or write in first-person\n`
    prompt += `- Do NOT say "the user was seeking" or "the user requested" - just answer their question\n`
    prompt += `- Do NOT explain what happened in a meta way - present the findings directly\n`
    prompt += `- Start by directly addressing their question, then provide insights and findings\n`
    prompt += `- Include key takeaways that would be valuable to the user\n`
    prompt += `- Use the execution results to provide concrete answers and insights\n`
    prompt += `- Write in a conversational, professional tone that feels natural\n\n`
    prompt += `Example good opening: "Here's what we found about your shipment ABC-123..." or "Your shipment ABC-123 analysis shows..."\n`
    prompt += `Example bad opening: "The user was seeking an analysis of..." or "The system analyzed the shipment..."\n\n`
    prompt += `Structure your summary to:\n`
    prompt += `1. Directly answer their question with the key findings\n`
    prompt += `2. Provide relevant details and insights from the execution results\n`
    prompt += `3. Highlight important takeaways and actionable information\n`
    prompt += `4. Keep it concise but comprehensive`

    return prompt
  }

  /**
   * Extract key takeaways from the summary text
   */
  private extractKeyTakeaways(summaryText: string): string[] {
    const takeaways: string[] = []

    // Look for sections like "Key Takeaways:" or "Takeaways:"
    const takeawaysSection = this.extractSection(summaryText, 'KEY TAKEAWAYS') || 
                            this.extractSection(summaryText, 'TAKEAWAYS') ||
                            this.extractSection(summaryText, 'KEY POINTS')

    if (takeawaysSection) {
      const items = this.extractList(takeawaysSection)
      takeaways.push(...items)
    }

    // Also look for bullet points or numbered lists that might be takeaways
    const bulletPattern = /(?:^|\n)(?:[-*•]\s+[^\n]+(?:\n(?![-*•]\s+)[^\n]+)*)/g
    const bulletMatches = Array.from(summaryText.matchAll(bulletPattern))
    
    // If we found takeaways section, use those. Otherwise, extract from bullets
    if (takeaways.length === 0 && bulletMatches.length > 0) {
      // Take up to 5 most relevant bullets
      takeaways.push(...bulletMatches.slice(0, 5).map(m => 
        m[0].replace(/^[-*•]\s*/, '').trim()
      ))
    }

    return takeaways.slice(0, 10) // Limit to 10 takeaways
  }

  /**
   * Create a summary of thoughts
   */
  private createThoughtsSummary(thoughts: ThoughtAgentOutput): string {
    let summary = `The system analyzed the query and identified ${thoughts.thoughts.length} reasoning ${thoughts.thoughts.length === 1 ? 'pass' : 'passes'}.\n\n`
    
    if (thoughts.primaryApproach) {
      summary += `Primary approach: ${thoughts.primaryApproach}\n\n`
    }

    if (thoughts.keyInsights && thoughts.keyInsights.length > 0) {
      summary += `Key insights:\n`
      thoughts.keyInsights.forEach(insight => {
        summary += `- ${insight}\n`
      })
      summary += `\n`
    }

    if (thoughts.recommendedTools && thoughts.recommendedTools.length > 0) {
      summary += `Recommended tools: ${thoughts.recommendedTools.join(', ')}\n`
    }

    return summary.trim()
  }

  /**
   * Create a summary of execution results
   */
  private createExecutionSummary(execution: ExecutorAgentOutput): string {
    let summary = `Execution ${execution.executionResult.overallSuccess ? 'completed successfully' : 'encountered issues'}.\n\n`
    
    summary += `Total steps: ${execution.executionResult.steps.length}\n`
    const successfulSteps = execution.executionResult.steps.filter(s => s.success).length
    summary += `Successful steps: ${successfulSteps}/${execution.executionResult.steps.length}\n\n`

    if (execution.executionResult.errors && execution.executionResult.errors.length > 0) {
      summary += `Errors encountered: ${execution.executionResult.errors.length}\n`
      summary += execution.executionResult.errors.slice(0, 3).join('\n')
      summary += `\n\n`
    }

    if (execution.executionResult.adaptations && execution.executionResult.adaptations.length > 0) {
      summary += `Plan adaptations: ${execution.executionResult.adaptations.length}\n`
    }

    return summary.trim()
  }
}


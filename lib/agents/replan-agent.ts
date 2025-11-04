import { BaseAgent } from './base-agent';
import { 
  ReplanAgentOutput, 
  RequestContext, 
  MetaAgentOutput, 
  CriticAgentOutput, 
  ThoughtAgentOutput, 
  PlannerAgentOutput,
  Plan,
  PlanStep,
  MCPContext
} from '@/types';
import { addAgentToChain } from '@/lib/utils/request-id';
import { listMCPTools, listMCPPrompts } from '@/lib/mcp-prompts';
import { formatMCPToolsForPrompt } from './executor-agent/utils/tool-schema-formatter';
import { logger } from '@/utils/logger';

/**
 * Replan Agent
 * 
 * Generates improved plans by learning from Meta Agent, Critic Agent, and Thought Agent feedback.
 * Think of this as a "second draft" that addresses all feedback.
 * 
 * How it works:
 * 1. Receives original plan, Meta guidance, Critic issues, Thought recommendations
 * 2. Uses LLM to analyze all feedback comprehensively
 * 3. Generates new plan that addresses all identified issues
 * 4. Tracks what was changed and why
 * 5. Returns improved plan with version tracking
 */
export class ReplanAgent extends BaseAgent {
  /**
   * Base system prompt that guides the Replan Agent's behavior
   */
  private readonly baseSystemPrompt = `You are a Replan Agent - your job is to generate improved action plans by learning from comprehensive feedback.

Your mission:
1. Analyze all feedback from Meta Agent (replan strategy, directives, focus areas)
2. Address all issues identified by Critic Agent (validation warnings, logical errors, suggestions)
3. Incorporate Thought Agent recommendations (tools, insights, approach)
4. Preserve what worked in the original plan
5. Generate a new, better plan that fixes all problems

CRITICAL PRINCIPLES:
- **Learning from Feedback**: Every piece of feedback is valuable. Address it systematically.
- **Preservation vs. Improvement**: Keep steps that were correct, fix steps that had issues, add steps that were missing.
- **Specificity**: Reference specific step IDs, issues, and directives when making changes.
- **Validation Awareness**: All parameters must be valid. No placeholders unless explicitly marked REQUIRED.
- **Tool Alignment**: Use Thought Agent's recommended tools. Ensure all tools exist in available tools list.
- **Parameter Resolution**: Extract values from user query or previous steps. Use EXTRACT_FROM_STEP_X when appropriate.

TOOL USAGE REQUIREMENTS:
- ONLY use tools that appear EXACTLY in the "Available MCP Tools" section
- Use EXACT tool names (e.g., "list_facilities", not "get_facility_list")
- Use EXACT parameter names from tool schemas
- DO NOT invent new tools or parameters

PARAMETER HANDLING:
- Extract values from user query when possible
- Use "EXTRACT_FROM_STEP_X" when a parameter comes from a previous step
- Use "REQUIRED" or null when user input is needed
- DO NOT use generic placeholders like "Detected Waste Item" or "Example Value"
- Resolve all validation warnings from Critic Agent

FORMAT REQUIREMENTS:

You MUST respond with ONLY a valid JSON object in this exact format:

{
  "goal": "Clear statement of the objective (may be same as original or improved)",
  "steps": [
    {
      "order": 1,
      "description": "Clear step description",
      "action": "exact_tool_name_from_available_tools",
      "parameters": {
        "exact_parameter_name": "extracted_value_or_EXTRACT_FROM_STEP_X"
      },
      "expectedOutcome": "What should happen",
      "dependencies": ["step-2"] or []
    }
  ],
  "rationale": "Why this plan is better than the original",
  "confidence": 0.0-1.0,
  "estimatedComplexity": 0.0-1.0,
  "changesExplanation": {
    "stepsAdded": ["Brief description of added steps"],
    "stepsRemoved": ["Brief description of removed steps"],
    "stepsModified": ["Brief description of modified steps"],
    "improvements": ["Specific improvement 1", "Specific improvement 2"]
  },
  "addressedMetaGuidance": {
    "replanStrategyAddressed": true|false,
    "orchestratorDirectivesAddressed": ["directive1", "directive2"],
    "focusAreasAddressed": ["area1", "area2"],
    "patternIssuesAddressed": ["issue1", "issue2"]
  },
  "addressedCriticIssues": {
    "issuesResolved": ["issue1", "issue2"],
    "suggestionsImplemented": ["suggestion1", "suggestion2"],
    "validationWarningsResolved": ["warning1", "warning2"]
  },
  "addressedThoughtRecommendations": {
    "recommendedToolsUsed": ["tool1", "tool2"],
    "keyInsightsIncorporated": ["insight1", "insight2"]
  }
}

Remember: You are outputting JSON only, no text before or after the JSON object.`;

  constructor() {
    super('replan-agent');
  }

  /**
   * Generate an improved plan based on comprehensive feedback
   * 
   * @param originalPlan - The original plan that needs improvement
   * @param metaOutput - Meta Agent's analysis and guidance
   * @param criticOutput - Critic Agent's issues and suggestions
   * @param thoughtOutput - Thought Agent's recommendations
   * @param userQuery - Original user query
   * @param requestContext - Request ID context
   * @param mcpContext - Optional MCP context for tool validation
   * @returns ReplanAgentOutput with improved plan
   */
  async generateReplan(
    originalPlan: PlannerAgentOutput,
    metaOutput: MetaAgentOutput,
    criticOutput: CriticAgentOutput,
    thoughtOutput: ThoughtAgentOutput,
    userQuery: string,
    requestContext: RequestContext,
    mcpContext?: MCPContext
  ): Promise<ReplanAgentOutput> {
    // Note: initialize() should be called before this method with headers if needed
    // This method assumes initialize() was already called or will be called by the API route
    if (!this.agentConfig) {
      await this.initialize();
    }

    const updatedContext = addAgentToChain(requestContext, 'replan-agent');

    // Fetch MCP context if not provided
    const contextToUse = mcpContext || await this.fetchMCPContext();

    // Build comprehensive prompt
    const prompt = this.buildReplanPrompt(
      originalPlan,
      metaOutput,
      criticOutput,
      thoughtOutput,
      userQuery,
      contextToUse
    );

    // Build enhanced system prompt with tool schemas
    const enhancedSystemPrompt = this.buildEnhancedSystemPrompt(contextToUse);

    const messages = [
      { role: 'system' as const, content: enhancedSystemPrompt },
      { role: 'user' as const, content: prompt },
    ];

    logger.debug(`[ReplanAgent] Generating replan`, {
      requestId: updatedContext.requestId,
      originalPlanId: originalPlan.plan.id,
      metaShouldReplan: metaOutput.shouldReplan,
      criticIssuesCount: criticOutput.critique.issues.length,
    });

    const response = await this.callLLM(messages, {
      temperature: 0.5, // Balanced creativity and structure
      maxTokens: 3000, // More tokens for comprehensive replanning
      responseFormat: { type: 'json_object' },
    });

    // Parse the response
    const replanData = this.parseReplanResponse(response, originalPlan.plan.id);

    // Validate and normalize the plan
    const validatedPlan = this.validateAndNormalizePlan(replanData, contextToUse);

    // Calculate changes from original
    const changes = this.calculateChanges(originalPlan.plan, validatedPlan);

    // Build comprehensive output
    return {
      requestId: updatedContext.requestId,
      agentName: 'replan-agent',
      timestamp: new Date(),
      requestContext: updatedContext,
      plan: validatedPlan,
      rationale: replanData.rationale || 'Plan improved based on comprehensive feedback analysis.',
      changesFromOriginal: {
        stepsAdded: changes.stepsAdded.length,
        stepsRemoved: changes.stepsRemoved.length,
        stepsModified: changes.stepsModified.length,
        improvements: replanData.changesExplanation?.improvements || [],
        removedSteps: changes.stepsRemoved,
        addedSteps: changes.stepsAdded,
        modifiedSteps: changes.stepsModified,
      },
      addressesMetaGuidance: {
        replanStrategyAddressed: replanData.addressedMetaGuidance?.replanStrategyAddressed || false,
        orchestratorDirectivesAddressed: replanData.addressedMetaGuidance?.orchestratorDirectivesAddressed || [],
        focusAreasAddressed: replanData.addressedMetaGuidance?.focusAreasAddressed || [],
        patternIssuesAddressed: replanData.addressedMetaGuidance?.patternIssuesAddressed || [],
      },
      addressesCriticIssues: {
        issuesResolved: replanData.addressedCriticIssues?.issuesResolved || [],
        suggestionsImplemented: replanData.addressedCriticIssues?.suggestionsImplemented || [],
        validationWarningsResolved: replanData.addressedCriticIssues?.validationWarningsResolved || [],
        followUpQuestionsAddressed: this.extractAnsweredQuestions(criticOutput),
      },
      addressesThoughtRecommendations: {
        recommendedToolsUsed: replanData.addressedThoughtRecommendations?.recommendedToolsUsed || [],
        keyInsightsIncorporated: replanData.addressedThoughtRecommendations?.keyInsightsIncorporated || [],
        primaryApproachMaintained: this.checkPrimaryApproach(thoughtOutput, validatedPlan),
      },
      confidence: replanData.confidence || 0.7,
      planVersion: (originalPlan.plan.planVersion || 1) + 1,
      originalPlanId: originalPlan.plan.id,
    };
  }

  /**
   * Fetch MCP context (tools and prompts)
   */
  async fetchMCPContext(): Promise<MCPContext> {
    try {
      const [tools, prompts] = await Promise.all([
        listMCPTools().catch(() => []),
        listMCPPrompts().catch(() => []),
      ]);

      logger.debug(`[ReplanAgent] Fetched MCP context`, {
        toolsCount: tools.length,
        promptsCount: prompts.length,
      });

      return { tools, prompts, resources: [] };
    } catch (error: any) {
      logger.error(`[ReplanAgent] Failed to fetch MCP context:`, error);
      return { tools: [], prompts: [], resources: [] };
    }
  }

  /**
   * Build enhanced system prompt with tool schemas
   */
  private buildEnhancedSystemPrompt(mcpContext: MCPContext): string {
    const toolSchemas = formatMCPToolsForPrompt(mcpContext);
    
    return `${this.baseSystemPrompt}

## Available MCP Tools

${toolSchemas}

IMPORTANT: Only use tools listed above. Use exact tool names and parameter names from the schemas.`;
  }

  /**
   * Build comprehensive replan prompt
   */
  private buildReplanPrompt(
    originalPlan: PlannerAgentOutput,
    metaOutput: MetaAgentOutput,
    criticOutput: CriticAgentOutput,
    thoughtOutput: ThoughtAgentOutput,
    userQuery: string,
    mcpContext: MCPContext
  ): string {
    let prompt = `# REPLAN REQUEST

## Original User Query
${userQuery}

## Original Plan (Version ${originalPlan.plan.planVersion || 1})

Goal: ${originalPlan.plan.goal}
Rationale: ${originalPlan.rationale}

Steps:
${this.formatPlanSteps(originalPlan.plan.steps)}

---

## Meta Agent Guidance

### Replan Strategy
${metaOutput.replanStrategy || 'No specific replan strategy provided.'}

### Orchestrator Directives
${metaOutput.orchestratorDirectives && metaOutput.orchestratorDirectives.length > 0
  ? metaOutput.orchestratorDirectives.map((d, i) => `${i + 1}. ${d}`).join('\n')
  : 'None'}

### Focus Areas
${metaOutput.focusAreas && metaOutput.focusAreas.length > 0
  ? metaOutput.focusAreas.map((a, i) => `${i + 1}. ${a}`).join('\n')
  : 'None'}

### Pattern Analysis
${metaOutput.patternAnalysis
  ? `
Detected Patterns: ${metaOutput.patternAnalysis.detectedPatterns.join(', ') || 'None'}
Inconsistencies: ${metaOutput.patternAnalysis.inconsistencies.join(', ') || 'None'}
Strengths: ${metaOutput.patternAnalysis.strengths.join(', ') || 'None'}
Weaknesses: ${metaOutput.patternAnalysis.weaknesses.join(', ') || 'None'}
`
  : 'None'}

### Reasoning Quality
- Overall Quality: ${(metaOutput.reasoningQuality * 100).toFixed(0)}%
- Should Replan: ${metaOutput.shouldReplan ? 'YES' : 'NO'}
- Assessment: ${metaOutput.assessment}

---

## Critic Agent Feedback

### Overall Recommendation
${criticOutput.critique.recommendation.toUpperCase()}

### Issues Found (${criticOutput.critique.issues.length})
${criticOutput.critique.issues.map((issue, i) => `
${i + 1}. [${issue.severity.toUpperCase()}] ${issue.category}: ${issue.description}
   Suggestion: ${issue.suggestion}
   Affected Steps: ${issue.affectedSteps?.join(', ') || 'None'}
`).join('\n')}

### Suggestions
${criticOutput.critique.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n') || 'None'}

### Validation Warnings
${criticOutput.validationWarnings && criticOutput.validationWarnings.length > 0
  ? criticOutput.validationWarnings.map((w, i) => `
${i + 1}. Step ${w.stepOrder} (${w.tool}): Missing parameter "${w.missingParam}"
   - Can be resolved: ${w.canResolve ? 'YES' : 'NO'}
   - Requires user input: ${w.requiresUserInput ? 'YES' : 'NO'}
`).join('\n')
  : 'None'}

### User Feedback (Follow-up Questions)
${this.formatUserFeedback(criticOutput)}

### Strengths (Keep These)
${criticOutput.critique.strengths.map((s, i) => `${i + 1}. ${s}`).join('\n') || 'None'}

---

## Thought Agent Recommendations

### Recommended Tools
${thoughtOutput.recommendedTools && thoughtOutput.recommendedTools.length > 0
  ? thoughtOutput.recommendedTools.map((t, i) => `${i + 1}. ${t}`).join('\n')
  : 'None - ensure all tools in plan are justified'}

### Key Insights
${thoughtOutput.keyInsights && thoughtOutput.keyInsights.length > 0
  ? thoughtOutput.keyInsights.map((i, idx) => `${idx + 1}. ${i}`).join('\n')
  : 'None'}

### Primary Approach
${thoughtOutput.primaryApproach || 'Not specified'}

---

## Replan Instructions

Generate a new, improved plan that:

1. **Addresses Meta Agent Guidance**:
   - Follow the replan strategy exactly
   - Address all orchestrator directives
   - Focus on the specified focus areas
   - Fix pattern issues identified

2. **Resolves Critic Agent Issues**:
   - Fix all issues (especially high/critical severity)
   - Implement suggestions
   - Resolve all validation warnings (extract parameters from steps or mark as REQUIRED)
   - Incorporate user feedback if provided

3. **Incorporates Thought Agent Recommendations**:
   - Use recommended tools (ensure they're in the plan)
   - Incorporate key insights
   - Maintain primary approach if appropriate

4. **Preserves What Worked**:
   - Keep steps that were correct and useful
   - Maintain logical flow where possible
   - Keep successful patterns

5. **Ensures Quality**:
   - All parameters must be valid (no generic placeholders)
   - All tools must exist in available tools list
   - All dependencies must be correct
   - Parameter extraction must be explicit (EXTRACT_FROM_STEP_X)

Generate the improved plan in the required JSON format.`;

    return prompt;
  }

  /**
   * Format plan steps for prompt
   */
  private formatPlanSteps(steps: PlanStep[]): string {
    return steps.map((step, idx) => `
${idx + 1}. Step ${step.order} (ID: ${step.id})
   Description: ${step.description}
   Action: ${step.action}
   Parameters: ${JSON.stringify(step.parameters || {}, null, 2)}
   Expected Outcome: ${step.expectedOutcome}
   Dependencies: ${step.dependencies?.join(', ') || 'None'}
`).join('\n');
  }

  /**
   * Format user feedback from follow-up questions
   */
  private formatUserFeedback(criticOutput: CriticAgentOutput): string {
    const questions = criticOutput.critique.followUpQuestions || [];
    const answeredQuestions = questions.filter(q => q.userAnswer);

    if (answeredQuestions.length === 0) {
      return 'No user feedback provided yet.';
    }

    return answeredQuestions.map((q, i) => `
${i + 1}. Question: ${q.question}
   Category: ${q.category}
   Priority: ${q.priority}
   User Answer: ${q.userAnswer}
   Note: This answer should be incorporated into the plan
`).join('\n');
  }

  /**
   * Parse replan response from LLM
   */
  private parseReplanResponse(response: string, originalPlanId: string): any {
    try {
      // Clean response - remove any markdown code blocks
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Find JSON object
      let jsonStart = cleanResponse.indexOf('{');
      if (jsonStart === -1) {
        throw new Error('No JSON object found in response');
      }

      // Find the matching closing brace
      let braceCount = 0;
      let jsonEnd = -1;
      for (let i = jsonStart; i < cleanResponse.length; i++) {
        if (cleanResponse[i] === '{') braceCount++;
        if (cleanResponse[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            jsonEnd = i + 1;
            break;
          }
        }
      }

      if (jsonEnd === -1) {
        throw new Error('Incomplete JSON object in response');
      }

      const jsonStr = cleanResponse.substring(jsonStart, jsonEnd);
      logger.debug(`[ReplanAgent] Extracted JSON string`, {
        jsonLength: jsonStr.length,
        jsonPreview: jsonStr.substring(0, 200)
      });

      const parsed = JSON.parse(jsonStr);
      
      // Validate required fields
      if (!parsed.goal || !parsed.steps || !Array.isArray(parsed.steps)) {
        throw new Error('Invalid replan response: missing required fields');
      }

      // Generate step IDs and ensure proper structure
      const steps: PlanStep[] = parsed.steps.map((step: any, idx: number) => ({
        id: step.id || `step-${step.order || idx + 1}`,
        order: step.order || idx + 1,
        description: step.description || '',
        action: step.action || '',
        parameters: step.parameters || {},
        expectedOutcome: step.expectedOutcome || '',
        dependencies: step.dependencies || [],
        status: 'pending' as const,
      }));

      return {
        goal: parsed.goal,
        steps,
        rationale: parsed.rationale || '',
        confidence: parsed.confidence || 0.7,
        estimatedComplexity: parsed.estimatedComplexity || 0.5,
        changesExplanation: parsed.changesExplanation || {},
        addressedMetaGuidance: parsed.addressedMetaGuidance || {},
        addressedCriticIssues: parsed.addressedCriticIssues || {},
        addressedThoughtRecommendations: parsed.addressedThoughtRecommendations || {},
      };
    } catch (error: any) {
      logger.error('[ReplanAgent] Failed to parse replan response:', error);
      throw new Error(`Failed to parse replan response: ${error.message}`);
    }
  }

  /**
   * Validate and normalize plan (similar to Planner Agent)
   */
  private validateAndNormalizePlan(plan: any, mcpContext: MCPContext): Plan {
    // Normalize tool names
    const availableToolNames = mcpContext.tools.map(t => t.name);
    const normalizedSteps = plan.steps.map((step: PlanStep) => {
      // Normalize tool name if needed
      let normalizedAction = step.action;
      if (step.action.includes('.')) {
        // Try to extract base tool name (e.g., "functions.get_facility" -> "get_facility")
        const parts = step.action.split('.');
        const baseName = parts[parts.length - 1];
        if (availableToolNames.includes(baseName)) {
          normalizedAction = baseName;
        }
      }
      
      return {
        ...step,
        action: normalizedAction,
      };
    });

    return {
      id: `plan-${Date.now()}`,
      goal: plan.goal,
      steps: normalizedSteps,
      estimatedComplexity: plan.estimatedComplexity || 0.5,
      confidence: plan.confidence || 0.7,
      dependencies: [],
      createdAt: new Date(),
      planVersion: plan.planVersion || 2,
    };
  }

  /**
   * Calculate changes from original plan
   */
  private calculateChanges(originalPlan: Plan, newPlan: Plan): {
    stepsAdded: string[];
    stepsRemoved: string[];
    stepsModified: string[];
  } {
    const originalStepIds = new Set(originalPlan.steps.map(s => s.id));
    const newStepIds = new Set(newPlan.steps.map(s => s.id));

    const stepsRemoved = originalPlan.steps
      .filter(s => !newStepIds.has(s.id))
      .map(s => s.id);

    const stepsAdded = newPlan.steps
      .filter(s => !originalStepIds.has(s.id))
      .map(s => s.id);

    // Check for modified steps (same ID but different content)
    const stepsModified: string[] = [];
    originalPlan.steps.forEach(originalStep => {
      const newStep = newPlan.steps.find(s => s.id === originalStep.id);
      if (newStep && this.isStepModified(originalStep, newStep)) {
        stepsModified.push(originalStep.id);
      }
    });

    return {
      stepsAdded,
      stepsRemoved,
      stepsModified,
    };
  }

  /**
   * Check if a step was modified
   */
  private isStepModified(original: PlanStep, updated: PlanStep): boolean {
    return (
      original.description !== updated.description ||
      original.action !== updated.action ||
      JSON.stringify(original.parameters) !== JSON.stringify(updated.parameters) ||
      original.expectedOutcome !== updated.expectedOutcome ||
      JSON.stringify(original.dependencies) !== JSON.stringify(updated.dependencies)
    );
  }

  /**
   * Extract answered questions from critic output
   */
  private extractAnsweredQuestions(criticOutput: CriticAgentOutput): string[] {
    const questions = criticOutput.critique.followUpQuestions || [];
    return questions
      .filter(q => q.userAnswer)
      .map(q => q.question);
  }

  /**
   * Check if primary approach is maintained
   */
  private checkPrimaryApproach(thoughtOutput: ThoughtAgentOutput, newPlan: Plan): boolean {
    if (!thoughtOutput.primaryApproach) {
      return true; // Can't verify if no approach specified
    }

    // Simple check: if the approach mentions specific tools, check if they're in the plan
    const approachLower = thoughtOutput.primaryApproach.toLowerCase();
    const planTools = newPlan.steps.map(s => s.action.toLowerCase());
    
    // Check if approach keywords are present in plan
    const keywords = approachLower.split(' ');
    const hasKeywords = keywords.some(keyword => 
      planTools.some(tool => tool.includes(keyword))
    );

    return hasKeywords;
  }
}


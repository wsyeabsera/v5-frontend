import { BaseAgent } from './base-agent';
import { MetaAgentOutput, RequestContext, ConfidenceScorerOutput, ThoughtAgentOutput, PlannerAgentOutput, CriticAgentOutput, MCPContext, PlanStep } from '@/types';
import { addAgentToChain } from '@/lib/utils/request-id';
import { listMCPTools, listMCPPrompts } from '@/lib/mcp-prompts';
import { formatMCPToolsForPrompt } from './executor-agent/utils/tool-schema-formatter';
import { validateToolParameters } from './executor-agent/adapters/mcp-tool-adapter';
import { getCriticOutputsStorage } from '@/lib/storage/critic-outputs-storage';
import { logger } from '@/utils/logger';

/**
 * Meta-Agent
 * 
 * Self-awareness layer that questions reasoning quality and manages depth.
 * Extends BaseAgent to follow the standard agent pattern.
 */
export class MetaAgent extends BaseAgent {
  /**
   * Base system prompt that guides the Meta Agent's behavior
   */
  private readonly baseSystemPrompt = `You are a Meta-Agent - a sophisticated self-awareness layer that evaluates reasoning quality and provides actionable guidance for orchestrators.

Your job is to:
1. Assess reasoning quality across multiple dimensions (logic, completeness, alignment)
2. Detect patterns, inconsistencies, and gaps across agent outputs
3. Provide specific, actionable guidance for orchestrator routing
4. Determine precise replanning strategies (not just "should replan")
5. Recommend reasoning depth (how many passes, what to focus on)
6. Generate orchestrator directives for intelligent routing

Think like a senior engineer reviewing a complex system design. You're not just evaluating - you're providing actionable guidance.

CRITICAL EVALUATION CRITERIA:
- LOGIC QUALITY: Is the thought process sound? Are there logical gaps, contradictions, or flawed assumptions?
- COMPLETENESS: Are all aspects of the problem considered? Are edge cases, dependencies, and constraints addressed?
- CONFIDENCE ALIGNMENT: Does the confidence score match the actual quality? Are agents overconfident or underconfident?
- PLAN SOUNDNESS: Is the plan feasible, well-structured, and properly sequenced? Are dependencies correct?
- INTEGRATION QUALITY: Do all agent outputs work together coherently? Are there inconsistencies?
- PATTERN DETECTION: Intelligently identify patterns across agents (tool usage, parameter patterns, redundancy, etc.)
- TOOL ALIGNMENT: Compare recommended tools from Thought Agent vs tools actually used in plan. Identify misalignments dynamically.
- PARAMETER ANALYSIS: Examine parameter values for placeholders, incomplete data, or invalid formats. Use tool schemas to understand requirements.
- FEASIBILITY ASSESSMENT: Can the plan actually execute? Check parameter completeness, validation warnings, and critique issues.
- DYNAMIC VALIDATION: If you detect potential parameter issues, you can request validation for specific steps by including a "stepsNeedingValidation" field.

FORMAT REQUIREMENTS:

You MUST respond with ONLY a valid JSON object in this exact format:

{
  "reasoningQuality": 0.0-1.0,
  "reasoningQualityBreakdown": {
    "logic": 0.0-1.0,
    "completeness": 0.0-1.0,
    "alignment": 0.0-1.0
  },
  "shouldReplan": true|false,
  "shouldDeepenReasoning": true|false,
  "replanStrategy": "Specific guidance on what aspects to replan (e.g., 'Refine plan steps 2-4, address uncertainty about X')",
  "reasoningDepthRecommendation": 1-3,
  "focusAreas": ["area1", "area2"],
  "recommendedActions": ["action1", "action2"],
  "orchestratorDirectives": ["directive1", "directive2"],
  "patternAnalysis": {
    "detectedPatterns": ["pattern1", "pattern2"],
    "inconsistencies": ["inconsistency1"],
    "strengths": ["strength1"],
    "weaknesses": ["weakness1"]
  },
  "assessment": "Human-readable assessment of the reasoning quality"
}

Remember: You are outputting JSON only, no text before or after the JSON object.`;

  // Thresholds for decisions
  private readonly REASONING_QUALITY_THRESHOLD = 0.6;
  private readonly REPLAN_THRESHOLD = 0.4;

  constructor() {
    super('meta-agent');
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

      logger.debug(`[MetaAgent] Fetched MCP context`, {
        toolsCount: tools.length,
        promptsCount: prompts.length,
      });

      return { tools, prompts, resources: [] };
    } catch (error: any) {
      logger.error(`[MetaAgent] Failed to fetch MCP context:`, error);
      return { tools: [], prompts: [], resources: [] };
    }
  }

  /**
   * Validate tool parameters for a specific step
   * Only called when LLM detects potential parameter issues
   */
  async validateToolStep(
    step: PlanStep,
    mcpContext: MCPContext,
    userQuery?: string
  ): Promise<ReturnType<typeof validateToolParameters> | null> {
    if (!step.action || !step.parameters) {
      return null;
    }

    // Check if this is a tool (not a prompt)
    const tool = mcpContext.tools.find(t => t.name === step.action);
    if (!tool) {
      return null; // Not a tool, skip validation
    }

    try {
      // Extract context from user query if available
      const context: Record<string, any> = {};
      if (userQuery) {
        const shortCodeMatch = userQuery.match(/\b([A-Z]{2,4})\b/g);
        if (shortCodeMatch) {
          context.shortCode = shortCodeMatch[0];
          context.facilityCode = shortCodeMatch[0];
        }
      }

      const validation = await validateToolParameters(
        step.action,
        step.parameters,
        context
      );

      return validation;
    } catch (error: any) {
      logger.warn(`[MetaAgent] Failed to validate step ${step.id}:`, error.message);
      return null;
    }
  }

  /**
   * Assess reasoning quality
   */
  async assessReasoning(
    context: {
      thoughts?: ThoughtAgentOutput;
      plan?: PlannerAgentOutput;
      critique?: CriticAgentOutput;
      allCritiqueVersions?: CriticAgentOutput[]; // Optional: All critique versions for user feedback context
      confidenceScore?: ConfidenceScorerOutput;
    },
    requestContext: RequestContext
  ): Promise<MetaAgentOutput> {
    // Initialize agent (loads config from MongoDB)
    // Note: initialize() should be called before this method with headers if needed
    // This method assumes initialize() was already called or will be called by the API route
    if (!this.agentConfig) {
      await this.initialize();
    }

    const updatedContext = addAgentToChain(requestContext, 'meta-agent');

    // Fetch all critique versions to get user feedback context
    let allCritiqueVersions: CriticAgentOutput[] | undefined;
    if (requestContext.requestId) {
      try {
        const criticStorage = getCriticOutputsStorage();
        allCritiqueVersions = await criticStorage.getAllVersionsByRequestId(requestContext.requestId);
        if (allCritiqueVersions.length > 0) {
          logger.debug(`[MetaAgent] Fetched ${allCritiqueVersions.length} critique versions for user feedback context`);
        }
      } catch (error: any) {
        logger.warn(`[MetaAgent] Failed to fetch critique versions:`, error.message);
        // Continue without critique versions
      }
    }

    // Add all critique versions to context if fetched
    const enhancedContext = {
      ...context,
      allCritiqueVersions: allCritiqueVersions || context.allCritiqueVersions,
    };

    // Fetch MCP context for tool schemas
    const mcpContext = await this.fetchMCPContext();
    
    // First pass: LLM analyzes context and identifies potential issues
    const prompt = await this.buildAssessmentPrompt(enhancedContext, mcpContext);

    const messages = [
      { role: 'system' as const, content: this.baseSystemPrompt },
      { role: 'user' as const, content: prompt },
    ];

    // First pass: LLM analyzes and may request validation
    const firstPassResponse = await this.callLLM(messages, {
      temperature: 0.4, // Lower temperature for more consistent assessment
      maxTokens: 4000, // Increased for comprehensive analysis with all details
      responseFormat: { type: 'json_object' },
    });

    // Parse first pass response
    const firstPassAssessment = this.parseAssessmentResponse(firstPassResponse);

    // Check if LLM requested validation for specific steps
    let validationResults: Record<string, Awaited<ReturnType<typeof this.validateToolStep>>> = {};
    if (firstPassAssessment.stepsNeedingValidation && enhancedContext.plan) {
      const stepsToValidate = firstPassAssessment.stepsNeedingValidation as string[];
      logger.info(`[MetaAgent] LLM requested validation for steps: ${stepsToValidate.join(', ')}`);
      
      // Validate requested steps
      for (const stepId of stepsToValidate) {
        const step = enhancedContext.plan!.plan.steps.find(s => s.id === stepId);
        if (step) {
          const validation = await this.validateToolStep(
            step,
            mcpContext,
            requestContext.userQuery
          );
          validationResults[stepId] = validation;
        }
      }

      // Second pass: Provide validation results back to LLM for final analysis
      if (Object.keys(validationResults).length > 0) {
        const validationPrompt = this.buildValidationPrompt(
          firstPassAssessment,
          validationResults,
          enhancedContext.plan!.plan.steps
        );
        
        const secondPassMessages = [
          { role: 'system' as const, content: this.baseSystemPrompt },
          { role: 'user' as const, content: prompt },
          { role: 'assistant' as const, content: firstPassResponse },
          { role: 'user' as const, content: validationPrompt },
        ];

        const secondPassResponse = await this.callLLM(secondPassMessages, {
          temperature: 0.4,
          maxTokens: 4000,
          responseFormat: { type: 'json_object' },
        });

        // Use second pass assessment
        const assessment = this.parseAssessmentResponse(secondPassResponse);
        
        // Continue with assessment from second pass
        const reasoningQuality = assessment.reasoningQuality;
        const shouldReplan = reasoningQuality < this.REPLAN_THRESHOLD || assessment.shouldReplan === true;
        const shouldDeepenReasoning = reasoningQuality < this.REASONING_QUALITY_THRESHOLD || assessment.shouldDeepenReasoning === true;

        // Build output with enhanced fields
        const output: MetaAgentOutput = {
          requestId: updatedContext.requestId,
          agentName: 'meta-agent',
          timestamp: new Date(),
          requestContext: updatedContext,
          reasoningQuality,
          shouldReplan,
          shouldDeepenReasoning,
          recommendedActions: assessment.recommendedActions || [],
          assessment: assessment.assessment || 'No assessment provided',
        };

        // Add enhanced fields if present
        if (assessment.reasoningQualityBreakdown) {
          output.reasoningQualityBreakdown = assessment.reasoningQualityBreakdown;
        }
        if (assessment.replanStrategy) {
          output.replanStrategy = assessment.replanStrategy;
        }
        if (assessment.reasoningDepthRecommendation) {
          output.reasoningDepthRecommendation = Math.max(1, Math.min(3, assessment.reasoningDepthRecommendation));
        }
        if (assessment.focusAreas) {
          output.focusAreas = assessment.focusAreas;
        }
        if (assessment.orchestratorDirectives) {
          output.orchestratorDirectives = assessment.orchestratorDirectives;
        }
        if (assessment.patternAnalysis) {
          output.patternAnalysis = assessment.patternAnalysis;
        }

        return output;
      }
    }

    // If no validation was requested, use first pass assessment
    const assessment = firstPassAssessment;
    const reasoningQuality = assessment.reasoningQuality;
    const shouldReplan = reasoningQuality < this.REPLAN_THRESHOLD || assessment.shouldReplan === true;
    const shouldDeepenReasoning = reasoningQuality < this.REASONING_QUALITY_THRESHOLD || assessment.shouldDeepenReasoning === true;

    // Build output with enhanced fields
    const output: MetaAgentOutput = {
      requestId: updatedContext.requestId,
      agentName: 'meta-agent',
      timestamp: new Date(),
      requestContext: updatedContext,
      reasoningQuality,
      shouldReplan,
      shouldDeepenReasoning,
      recommendedActions: assessment.recommendedActions || [],
      assessment: assessment.assessment || 'No assessment provided',
    };

    // Add enhanced fields if present
    if (assessment.reasoningQualityBreakdown) {
      output.reasoningQualityBreakdown = assessment.reasoningQualityBreakdown;
    }
    if (assessment.replanStrategy) {
      output.replanStrategy = assessment.replanStrategy;
    }
    if (assessment.reasoningDepthRecommendation) {
      output.reasoningDepthRecommendation = Math.max(1, Math.min(3, assessment.reasoningDepthRecommendation));
    }
    if (assessment.focusAreas) {
      output.focusAreas = assessment.focusAreas;
    }
    if (assessment.orchestratorDirectives) {
      output.orchestratorDirectives = assessment.orchestratorDirectives;
    }
    if (assessment.patternAnalysis) {
      output.patternAnalysis = assessment.patternAnalysis;
    }

    return output;
  }

  /**
   * Build assessment prompt with context from other agents
   */
  private async buildAssessmentPrompt(
    context: {
      thoughts?: ThoughtAgentOutput;
      plan?: PlannerAgentOutput;
      critique?: CriticAgentOutput;
      allCritiqueVersions?: CriticAgentOutput[];
      confidenceScore?: ConfidenceScorerOutput;
    },
    mcpContext?: MCPContext
  ): Promise<string> {
    let prompt = `Perform a comprehensive meta-analysis of this reasoning chain. Analyze ALL provided information in detail.\n\n`;

    // Add tool schemas if MCP context is available
    if (mcpContext) {
      const toolSchemas = formatMCPToolsForPrompt(mcpContext);
      if (toolSchemas) {
        prompt += `## TOOL SCHEMAS & REQUIREMENTS\n\n`;
        prompt += `The following tools are available and their parameter requirements:\n\n`;
        prompt += toolSchemas;
        prompt += `\nUse these schemas to understand parameter requirements when analyzing plan steps.\n\n`;
      }
    }

    // ============================================================================
    // SECTION 1: OVERVIEW - Summary scores and high-level decisions
    // ============================================================================
    prompt += `## 1. OVERVIEW\n\n`;

    if (context.confidenceScore) {
      prompt += `CONFIDENCE SCORE ANALYSIS:\n`;
      prompt += `- Overall Confidence: ${(context.confidenceScore.overallConfidence * 100).toFixed(0)}%\n`;
      prompt += `- Weighted Confidence: ${(context.confidenceScore.weightedConfidence * 100).toFixed(0)}%\n`;
      prompt += `- Decision: ${context.confidenceScore.decision}\n`;
      prompt += `- Agent Scores: ${context.confidenceScore.agentScores.map(s => `${s.agentName}: ${(s.score * 100).toFixed(0)}%`).join(', ')}\n`;
      if (context.confidenceScore.confidenceReasoning) {
        prompt += `- Detailed Analysis: ${context.confidenceScore.confidenceReasoning}\n`;
      }
      if (context.confidenceScore.scoreVariance !== undefined) {
        prompt += `- Score Variance: ${context.confidenceScore.scoreVariance.toFixed(3)} (${context.confidenceScore.scoreVariance < 0.01 ? 'consistent' : 'inconsistent'})\n`;
      }
      if (context.confidenceScore.scorePattern) {
        prompt += `- Pattern: ${context.confidenceScore.scorePattern}\n`;
      }
      if (context.confidenceScore.agentAnalysis) {
        prompt += `- Primary Driver: ${context.confidenceScore.agentAnalysis.primaryDriver || 'N/A'}\n`;
        prompt += `- Lowest Confidence: ${context.confidenceScore.agentAnalysis.lowestConfidence || 'N/A'}\n`;
        if (context.confidenceScore.agentAnalysis.concerns.length > 0) {
          prompt += `- Concerns: ${context.confidenceScore.agentAnalysis.concerns.join(', ')}\n`;
        }
      }
      if (context.confidenceScore.routingRecommendation) {
        prompt += `- Routing Recommendation: ${context.confidenceScore.routingRecommendation}\n`;
      }
      prompt += `\n`;
    }

    // ============================================================================
    // SECTION 2: TOOL & RESOURCE ANALYSIS - Recommended vs Used
    // ============================================================================
    prompt += `## 2. TOOL & RESOURCE ANALYSIS\n\n`;

    if (context.thoughts) {
      prompt += `THOUGHT AGENT RECOMMENDATIONS:\n`;
      if (context.thoughts.recommendedTools && context.thoughts.recommendedTools.length > 0) {
        prompt += `- Recommended Tools (${context.thoughts.recommendedTools.length}): ${context.thoughts.recommendedTools.join(', ')}\n`;
        prompt += `- Recommended Tools List (for exact matching):\n`;
        context.thoughts.recommendedTools.forEach((tool, idx) => {
          prompt += `  ${idx + 1}. "${tool}"\n`;
        });
      } else {
        prompt += `- Recommended Tools: None\n`;
      }
      if (context.thoughts.recommendedPrompts && context.thoughts.recommendedPrompts.length > 0) {
        prompt += `- Recommended Prompts: ${context.thoughts.recommendedPrompts.join(', ')}\n`;
      }
      if (context.thoughts.keyInsights && context.thoughts.keyInsights.length > 0) {
        prompt += `- Key Insights: ${context.thoughts.keyInsights.join('; ')}\n`;
      }
      if (context.thoughts.primaryApproach) {
        prompt += `- Primary Approach: ${context.thoughts.primaryApproach}\n`;
      }
      prompt += `\n`;

      // Analyze all thoughts (not just first one)
      if (context.thoughts.thoughts.length > 0) {
        prompt += `THOUGHT REASONING DETAILS:\n`;
        context.thoughts.thoughts.forEach((thought, idx) => {
          prompt += `\nThought ${idx + 1} (Confidence: ${(thought.confidence * 100).toFixed(0)}%):\n`;
          prompt += `- Reasoning: ${thought.reasoning}\n`;
          prompt += `- Approaches: ${thought.approaches.join(', ')}\n`;
          prompt += `- Constraints: ${thought.constraints.join(', ')}\n`;
          prompt += `- Assumptions: ${thought.assumptions.join(', ')}\n`;
          prompt += `- Uncertainties (${thought.uncertainties.length}): ${thought.uncertainties.join('; ')}\n`;
          if (thought.approaches.length === 0) {
            prompt += `- ⚠️ WARNING: No approaches identified\n`;
          }
          if (thought.uncertainties.length > 5) {
            prompt += `- ⚠️ WARNING: High number of uncertainties\n`;
          }
        });
        prompt += `\n`;
      }
    }

    // Present tool usage data with clear structure for LLM comparison
    if (context.plan && context.plan.plan.steps.length > 0) {
      // Build tool usage map: tool -> [step orders]
      const toolUsageMap = new Map<string, number[]>();
      context.plan.plan.steps.forEach(step => {
        if (step.action) {
          const tool = step.action;
          if (!toolUsageMap.has(tool)) {
            toolUsageMap.set(tool, []);
          }
          toolUsageMap.get(tool)!.push(step.order || 0);
        }
      });
      
      const uniqueTools = Array.from(toolUsageMap.keys());
      const toolsUsed = context.plan.plan.steps
        .filter(step => step.action)
        .map(step => step.action!);
      
      prompt += `PLAN TOOL USAGE:\n`;
      prompt += `- Total Tool Calls: ${toolsUsed.length} across ${context.plan.plan.steps.length} steps\n`;
      prompt += `- Unique Tools: ${uniqueTools.length} distinct tools\n`;
      prompt += `\nTOOL USAGE BY STEP:\n`;
      toolUsageMap.forEach((stepOrders, tool) => {
        const count = stepOrders.length;
        const steps = stepOrders.map(o => `step-${o}`).join(', ');
        prompt += `  - "${tool}": Used ${count} time${count > 1 ? 's' : ''} in ${steps}\n`;
      });
      prompt += `\nCOMPLETE TOOL LIST (for comparison):\n`;
      prompt += `  ${uniqueTools.join(', ')}\n`;
      prompt += `\n`;
    }

    // ============================================================================
    // SECTION 3: PLAN STRUCTURE - Full step-by-step breakdown
    // ============================================================================
    prompt += `## 3. PLAN STRUCTURE\n\n`;

    if (context.plan) {
      prompt += `PLAN OVERVIEW:\n`;
      prompt += `- Goal: ${context.plan.plan.goal}\n`;
      prompt += `- Total Steps: ${context.plan.plan.steps.length}\n`;
      prompt += `- Confidence: ${(context.plan.plan.confidence * 100).toFixed(0)}%\n`;
      prompt += `- Estimated Complexity: ${(context.plan.plan.estimatedComplexity * 100).toFixed(0)}%\n`;
      if (context.plan.plan.steps.length === 0) {
        prompt += `- ⚠️ WARNING: Plan has no steps\n`;
      }
      prompt += `\n`;

      // Full step details
      if (context.plan.plan.steps.length > 0) {
        prompt += `STEP-BY-STEP BREAKDOWN:\n\n`;
        context.plan.plan.steps.forEach((step, idx) => {
          prompt += `Step ${step.order || idx + 1} (ID: ${step.id}):\n`;
          prompt += `  - Description: ${step.description}\n`;
          prompt += `  - Action/Tool: ${step.action || 'N/A'}\n`;
          if (step.parameters && Object.keys(step.parameters).length > 0) {
            prompt += `  - Parameters: ${JSON.stringify(step.parameters, null, 2)}\n`;
          } else {
            prompt += `  - Parameters: None\n`;
          }
          prompt += `  - Expected Outcome: ${step.expectedOutcome}\n`;
          if (step.dependencies && step.dependencies.length > 0) {
            prompt += `  - Dependencies: ${step.dependencies.join(', ')}\n`;
          } else {
            prompt += `  - Dependencies: None\n`;
          }
          prompt += `  - Status: ${step.status}\n`;
          prompt += `\n`;
        });

        // Present parameter data (let LLM analyze completeness and placeholders)
        const stepsWithParams = context.plan.plan.steps.filter(s => s.parameters && Object.keys(s.parameters).length > 0).length;
        const stepsWithoutParams = context.plan.plan.steps.length - stepsWithParams;
        
        prompt += `PARAMETER DATA:\n`;
        prompt += `- Steps with parameters: ${stepsWithParams}/${context.plan.plan.steps.length}\n`;
        prompt += `- Steps without parameters: ${stepsWithoutParams}\n`;
        prompt += `\n`;
      }
    }

    // ============================================================================
    // SECTION 4: QUALITY ASSESSMENT - Detailed scores across dimensions
    // ============================================================================
    prompt += `## 4. QUALITY ASSESSMENT\n\n`;

    if (context.critique) {
      prompt += `CRITIQUE DETAILED SCORES:\n`;
      prompt += `- Overall Score: ${(context.critique.critique.overallScore * 100).toFixed(0)}%\n`;
      prompt += `- Feasibility Score: ${(context.critique.critique.feasibilityScore * 100).toFixed(0)}%\n`;
      prompt += `- Correctness Score: ${(context.critique.critique.correctnessScore * 100).toFixed(0)}%\n`;
      prompt += `- Efficiency Score: ${(context.critique.critique.efficiencyScore * 100).toFixed(0)}%\n`;
      prompt += `- Safety Score: ${(context.critique.critique.safetyScore * 100).toFixed(0)}%\n`;
      prompt += `- Recommendation: ${context.critique.critique.recommendation}\n`;
      if (context.critique.critique.rationale) {
        prompt += `- Rationale: ${context.critique.critique.rationale}\n`;
      }
      prompt += `\n`;
    }

    // ============================================================================
    // SECTION 5: ISSUES & CONCERNS - Complete list of problems with context
    // ============================================================================
    prompt += `## 5. ISSUES & CONCERNS\n\n`;

    if (context.critique) {
      // All issues with full details - emphasize affected steps
      if (context.critique.critique.issues.length > 0) {
        prompt += `ALL CRITIQUE ISSUES (${context.critique.critique.issues.length} total):\n\n`;
        context.critique.critique.issues.forEach((issue, idx) => {
          prompt += `Issue ${idx + 1}:\n`;
          prompt += `  - Severity: ${issue.severity}\n`;
          prompt += `  - Category: ${issue.category}\n`;
          prompt += `  - Description: ${issue.description}\n`;
          if (issue.suggestion) {
            prompt += `  - Suggestion: ${issue.suggestion}\n`;
          }
          if (issue.affectedSteps && issue.affectedSteps.length > 0) {
            prompt += `  - 🎯 AFFECTED STEPS (CRITICAL): ${issue.affectedSteps.join(', ')}\n`;
            // Cross-reference with plan steps
            if (context.plan && context.plan.plan.steps.length > 0) {
              const affectedStepDetails = context.plan.plan.steps.filter(s => issue.affectedSteps!.includes(s.id));
              if (affectedStepDetails.length > 0) {
                prompt += `  - Affected Step Details:\n`;
                affectedStepDetails.forEach(step => {
                  prompt += `    * Step ${step.order} (${step.id}): ${step.action || 'N/A'} - ${step.description}\n`;
                });
              }
            }
          }
          prompt += `\n`;
        });
      } else {
        prompt += `No issues found.\n\n`;
      }

      // Validation warnings (tool parameter validation)
      if (context.critique.validationWarnings && context.critique.validationWarnings.length > 0) {
        prompt += `VALIDATION WARNINGS (Tool Parameter Issues):\n\n`;
        context.critique.validationWarnings.forEach((warning, idx) => {
          prompt += `Warning ${idx + 1}:\n`;
          prompt += `  - Step Order: ${warning.stepOrder}\n`;
          prompt += `  - Step ID: ${warning.stepId}\n`;
          prompt += `  - Tool: ${warning.tool}\n`;
          prompt += `  - Missing Parameter: ${warning.missingParam}\n`;
          prompt += `  - Required: ${warning.isRequired ? 'Yes' : 'No'}\n`;
          prompt += `\n`;
        });
      }
    }

    // ============================================================================
    // SECTION 6: STRENGTHS & OPPORTUNITIES - What's working well
    // ============================================================================
    prompt += `## 6. STRENGTHS & OPPORTUNITIES\n\n`;

    if (context.critique) {
      if (context.critique.critique.strengths && context.critique.critique.strengths.length > 0) {
        prompt += `CRITIQUE STRENGTHS:\n`;
        context.critique.critique.strengths.forEach((strength, idx) => {
          prompt += `${idx + 1}. ${strength}\n`;
        });
        prompt += `\n`;
      }

      if (context.critique.critique.suggestions && context.critique.critique.suggestions.length > 0) {
        prompt += `IMPROVEMENT SUGGESTIONS:\n`;
        context.critique.critique.suggestions.forEach((suggestion, idx) => {
          prompt += `${idx + 1}. ${suggestion}\n`;
        });
        prompt += `\n`;
      }
    }

    // ============================================================================
    // SECTION 7: MISSING INFORMATION - Follow-up questions and validation warnings
    // ============================================================================
    prompt += `## 7. MISSING INFORMATION & USER FEEDBACK\n\n`;

    // Check all critique versions for user feedback context
    const allCritiques = context.allCritiqueVersions || (context.critique ? [context.critique] : []);
    const critiquesWithQuestions = allCritiques.filter(c => c.critique.followUpQuestions && c.critique.followUpQuestions.length > 0);
    
    if (critiquesWithQuestions.length > 0) {
      prompt += `USER FEEDBACK HISTORY (from ${critiquesWithQuestions.length} critique version(s)):\n\n`;
      
      critiquesWithQuestions.forEach((critique, critIdx) => {
        prompt += `Critique Version ${critique.critiqueVersion || critIdx + 1}:\n`;
        critique.critique.followUpQuestions.forEach((question, qIdx) => {
          prompt += `  Question ${qIdx + 1}:\n`;
          prompt += `    - Priority: ${question.priority}\n`;
          prompt += `    - Category: ${question.category}\n`;
          prompt += `    - Question: ${question.question}\n`;
          if (question.userAnswer) {
            prompt += `    - ✅ USER ANSWER: ${question.userAnswer}\n`;
            prompt += `    - Note: This feedback was provided and should be incorporated in the plan\n`;
          } else {
            prompt += `    - ⚠️ NOT ANSWERED: User has not provided an answer yet\n`;
          }
          prompt += `\n`;
        });
      });
      
      // Check if user feedback was incorporated into the plan
      const answeredQuestions = critiquesWithQuestions.flatMap(c => 
        c.critique.followUpQuestions.filter(q => q.userAnswer)
      );
      
      if (answeredQuestions.length > 0) {
        prompt += `INCORPORATED USER FEEDBACK:\n`;
        prompt += `- ${answeredQuestions.length} question(s) were answered by the user\n`;
        prompt += `- These answers should be reflected in the current plan\n`;
        prompt += `- Verify that the plan incorporates this feedback correctly\n`;
        prompt += `\n`;
      }
    } else if (context.critique) {
      // Fallback to current critique if no versions provided
      if (context.critique.critique.followUpQuestions && context.critique.critique.followUpQuestions.length > 0) {
        prompt += `FOLLOW-UP QUESTIONS (${context.critique.critique.followUpQuestions.length} total):\n\n`;
        context.critique.critique.followUpQuestions.forEach((question, idx) => {
          prompt += `Question ${idx + 1}:\n`;
          prompt += `  - Priority: ${question.priority}\n`;
          prompt += `  - Category: ${question.category}\n`;
          prompt += `  - Question: ${question.question}\n`;
          if (question.userAnswer) {
            prompt += `  - ✅ USER ANSWER: ${question.userAnswer}\n`;
          } else {
            prompt += `  - ⚠️ NOT ANSWERED\n`;
          }
          prompt += `\n`;
        });
      } else {
        prompt += `No follow-up questions in current critique.\n\n`;
      }
    } else {
      prompt += `No follow-up questions or user feedback history available.\n\n`;
    }

    // ============================================================================
    // SECTION 8: PATTERN ANALYSIS INSTRUCTIONS
    // ============================================================================
    prompt += `## 8. ANALYSIS INSTRUCTIONS\n\n`;
    prompt += `Intelligently analyze the information above. You should:\n\n`;
    prompt += `1. TOOL ALIGNMENT: Compare Thought Agent's recommended tools vs tools actually used in the plan.\n`;
    prompt += `   \n`;
    prompt += `   CRITICAL - TOOL COMPARISON LOGIC:\n`;
    prompt += `   - For EACH recommended tool, check if it appears in the "COMPLETE TOOL LIST" from the plan.\n`;
    prompt += `   - Use EXACT string matching - if tool name appears in both lists, it IS used. Do NOT flag it as missing.\n`;
    prompt += `   - Example CORRECT detection: Recommended: [A, B, C], Used: [A, B, C] → All used ✅ (no inconsistencies)\n`;
    prompt += `   - Example CORRECT detection: Recommended: [A, B, C], Used: [A, B] → Missing: C ❌ (flag C as missing)\n`;
    prompt += `   - Example CORRECT detection: Recommended: [A, B], Used: [A, B, C] → All recommended used ✅ (C is extra, not an issue)\n`;
    prompt += `   - Example WRONG detection: Recommended: [A, B, C], Used: [A, B, C] → Flagging C as missing ❌ (this is WRONG - C IS used)\n`;
    prompt += `   \n`;
    prompt += `   STEP-BY-STEP COMPARISON:\n`;
    prompt += `   1. Take the "Recommended Tools List" from Thought Agent\n`;
    prompt += `   2. For each tool in that list, check if it appears in the plan's "COMPLETE TOOL LIST"\n`;
    prompt += `   3. If tool appears in BOTH lists → it IS used (do NOT flag as missing)\n`;
    prompt += `   4. If tool appears ONLY in recommended list → it IS missing (flag it)\n`;
    prompt += `   5. If tool appears in plan but NOT in recommended → it's extra (not necessarily an issue)\n`;
    prompt += `   \n`;
    prompt += `   REDUNDANCY ANALYSIS:\n`;
    prompt += `   - Identify if tools are used multiple times and whether this indicates redundancy or is intentional.\n`;
    prompt += `   - Reference specific tool names and step IDs using the "TOOL USAGE BY STEP" data (e.g., "list_contaminants used in step-1 and step-2").\n`;
    prompt += `2. PARAMETER ANALYSIS: Examine parameter values in plan steps.\n`;
    prompt += `   - Look for placeholder values, incomplete parameters, or values that cannot execute.\n`;
    prompt += `   - Check if parameters match the expected format (e.g., IDs should be valid ObjectIds, not placeholders).\n`;
    prompt += `   - Use validation warnings from Critic Agent to identify missing required parameters.\n`;
    prompt += `   - If you detect potential parameter issues, you can request validation for specific steps.\n`;
    prompt += `3. FEASIBILITY ASSESSMENT: Determine if the plan can actually execute.\n`;
    prompt += `   - Steps with placeholder/incomplete parameters cannot execute.\n`;
    prompt += `   - Reference validation warnings and critique issues.\n`;
    prompt += `   - Consider dependencies between steps.\n`;
    prompt += `4. PATTERN DETECTION: Identify patterns across all agent outputs.\n`;
    prompt += `   - High confidence scores but many validation warnings = overconfidence.\n`;
    prompt += `   - Tool redundancy patterns.\n`;
    prompt += `   - Consistency between Thought Agent recommendations and actual plan.\n`;
    prompt += `5. INCONSISTENCIES: Find specific inconsistencies.\n`;
    prompt += `   - Tool misalignment (recommended vs used): Only flag tools that are TRULY missing.\n`;
    prompt += `     * If a tool appears in BOTH recommended and used lists, it IS NOT missing - do NOT flag it.\n`;
    prompt += `     * Only flag tools that appear in recommended list but NOT in the plan's complete tool list.\n`;
    prompt += `   - Confidence vs actual quality.\n`;
    prompt += `   - Critique findings vs plan structure.\n`;
    prompt += `6. ALIGNMENT: Assess confidence scores vs actual quality.\n`;
    prompt += `   - Use validation warnings, critique scores, and parameter completeness.\n`;
    prompt += `   - Identify overconfidence or underconfidence.\n`;
    prompt += `7. REPLAN STRATEGY: Provide SPECIFIC guidance on what needs replanning.\n`;
    prompt += `   - Reference exact step IDs, tools, and parameter names.\n`;
    prompt += `   - Example: "Fix step-3: Replace placeholder value in 'id' parameter with actual facility ID from step-2 output".\n`;
    prompt += `   - Example: "Address redundancy: Combine step-1 and step-2 as suggested in critique issue 1".\n`;
    prompt += `8. REASONING DEPTH: Recommend reasoning depth (1-3 passes) based on:\n`;
    prompt += `   - Number and severity of issues detected.\n`;
    prompt += `   - Parameter completeness.\n`;
    prompt += `   - Validation warnings count.\n`;
    prompt += `9. ORCHESTRATOR DIRECTIVES: Generate SPECIFIC routing instructions.\n`;
    prompt += `   - Reference exact step IDs, tools, and issues.\n`;
    prompt += `   - Example: "Route step-3 back to planner to resolve placeholder parameter in 'id' field".\n`;
    prompt += `   - Example: "Validate get_facility tool parameters in step-3 before execution".\n`;
    prompt += `   - Example: "Address critique issue 1 affecting step-1 and step-2".\n\n`;

    prompt += `IMPORTANT: Use EXACT step IDs, tool names, and parameter values from the data above.`;
    prompt += ` Do NOT use generic placeholders. Reference actual values like "step-3", "get_facility", parameter names, etc.\n\n`;

    prompt += `TOOL ALIGNMENT VALIDATION - CRITICAL REMINDER:\n`;
    prompt += `Before flagging a tool as "not used", verify:\n`;
    prompt += `1. Check the "Recommended Tools List" from Thought Agent\n`;
    prompt += `2. Check the "COMPLETE TOOL LIST" from the plan\n`;
    prompt += `3. If the tool name appears in BOTH lists (exact match), it IS used - do NOT flag it\n`;
    prompt += `4. Only flag tools that appear in recommended but NOT in the plan's complete tool list\n`;
    prompt += `5. Example: If recommended=[A,B,C] and used=[A,B,C], then ALL are used - no inconsistencies\n`;
    prompt += `6. Example: If recommended=[A,B,C] and used=[A,B], then C is missing - flag C\n`;
    prompt += `\n`;

    prompt += `If you detect potential parameter issues that need validation, include a "stepsNeedingValidation" field in your JSON response with an array of step IDs.`;
    prompt += ` Example: "stepsNeedingValidation": ["step-3", "step-5"]\n\n`;

    prompt += `Based on ALL this information, provide a comprehensive meta-analysis in the required JSON format.`;

    return prompt;
  }

  /**
   * Build validation prompt for second pass LLM analysis
   */
  private buildValidationPrompt(
    firstPassAssessment: ReturnType<typeof this.parseAssessmentResponse>,
    validationResults: Record<string, Awaited<ReturnType<typeof this.validateToolStep>>>,
    steps: PlanStep[]
  ): string {
    let prompt = `## VALIDATION RESULTS\n\n`;
    prompt += `You requested validation for certain steps. Here are the validation results:\n\n`;

    for (const [stepId, validation] of Object.entries(validationResults)) {
      if (!validation) {
        continue;
      }

      const step = steps.find(s => s.id === stepId);
      prompt += `Step ${stepId} (${step?.action || 'unknown'}):\n`;
      prompt += `- Required Parameters: ${validation.requiredParams.join(', ')}\n`;
      prompt += `- Provided Parameters: ${validation.providedParams.join(', ')}\n`;
      prompt += `- Missing Parameters: ${validation.missingParams.join(', ')}\n`;
      prompt += `- Validation Valid: ${validation.validation.isValid}\n`;
      
      if (validation.categorization) {
        prompt += `- Categorization:\n`;
        prompt += `  * Resolvable: ${validation.categorization.resolvable.join(', ') || 'None'}\n`;
        prompt += `  * Must Ask User: ${validation.categorization.mustAskUser.join(', ') || 'None'}\n`;
        prompt += `  * Can Infer: ${validation.categorization.canInfer.join(', ') || 'None'}\n`;
      }
      
      prompt += `\n`;
    }

    prompt += `Please incorporate these validation results into your final analysis.`;
    prompt += ` Update your assessment, replan strategy, and orchestrator directives based on these findings.\n`;

    return prompt;
  }

  /**
   * Parse JSON assessment response
   */
  private parseAssessmentResponse(response: string): {
    reasoningQuality: number;
    shouldReplan?: boolean;
    shouldDeepenReasoning?: boolean;
    recommendedActions: string[];
    assessment: string;
    reasoningQualityBreakdown?: {
      logic: number;
      completeness: number;
      alignment: number;
    };
    replanStrategy?: string;
    reasoningDepthRecommendation?: number;
    focusAreas?: string[];
    orchestratorDirectives?: string[];
    patternAnalysis?: {
      detectedPatterns: string[];
      inconsistencies: string[];
      strengths: string[];
      weaknesses: string[];
    };
    stepsNeedingValidation?: string[];
  } {
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
      const parsed = JSON.parse(jsonStr);

      // Validate and normalize reasoningQualityBreakdown
      let breakdown;
      if (parsed.reasoningQualityBreakdown) {
        breakdown = {
          logic: Math.max(0, Math.min(1, parsed.reasoningQualityBreakdown.logic || 0.5)),
          completeness: Math.max(0, Math.min(1, parsed.reasoningQualityBreakdown.completeness || 0.5)),
          alignment: Math.max(0, Math.min(1, parsed.reasoningQualityBreakdown.alignment || 0.5)),
        };
      }

      // Validate and normalize patternAnalysis
      let patternAnalysis;
      if (parsed.patternAnalysis) {
        patternAnalysis = {
          detectedPatterns: Array.isArray(parsed.patternAnalysis.detectedPatterns) 
            ? parsed.patternAnalysis.detectedPatterns 
            : [],
          inconsistencies: Array.isArray(parsed.patternAnalysis.inconsistencies)
            ? parsed.patternAnalysis.inconsistencies
            : [],
          strengths: Array.isArray(parsed.patternAnalysis.strengths)
            ? parsed.patternAnalysis.strengths
            : [],
          weaknesses: Array.isArray(parsed.patternAnalysis.weaknesses)
            ? parsed.patternAnalysis.weaknesses
            : [],
        };
      }

      return {
        reasoningQuality: Math.max(0, Math.min(1, parsed.reasoningQuality || 0.5)),
        shouldReplan: parsed.shouldReplan,
        shouldDeepenReasoning: parsed.shouldDeepenReasoning,
        recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : [],
        assessment: parsed.assessment || 'No assessment provided',
        reasoningQualityBreakdown: breakdown,
        replanStrategy: parsed.replanStrategy,
        reasoningDepthRecommendation: parsed.reasoningDepthRecommendation 
          ? Math.max(1, Math.min(3, parsed.reasoningDepthRecommendation))
          : undefined,
        focusAreas: Array.isArray(parsed.focusAreas) ? parsed.focusAreas : undefined,
        orchestratorDirectives: Array.isArray(parsed.orchestratorDirectives) ? parsed.orchestratorDirectives : undefined,
        patternAnalysis,
        stepsNeedingValidation: Array.isArray(parsed.stepsNeedingValidation) ? parsed.stepsNeedingValidation : undefined,
      };
    } catch (error: any) {
      // Fallback parsing if JSON parsing fails
      const reasoningQuality = this.extractReasoningQuality(response);
      const recommendedActions = this.extractActions(response);
      
      return {
        reasoningQuality,
        recommendedActions,
        assessment: response.substring(0, 500),
      };
    }
  }

  /**
   * Extract reasoning quality from text (fallback method)
   */
  private extractReasoningQuality(response: string): number {
    const section = this.extractSection(response, 'REASONING_QUALITY');
    const match = section?.match(/[\d.]+/);
    const score = match ? parseFloat(match[0]) : 0.5;
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Extract actions from text (fallback method)
   */
  private extractActions(response: string): string[] {
    return this.extractList(response, 'ACTIONS');
  }
}


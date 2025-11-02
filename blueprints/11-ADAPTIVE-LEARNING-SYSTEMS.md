# Adaptive Learning Systems - Self-Tuning Prompts and Personality Memory

## Overview

This blueprint covers the self-improvement mechanisms that enable the system to evolve:

1. **Self-Tuning Prompts**: Agents that analyze their own performance and improve their prompts
2. **Personality Memory**: Maintains consistent communication style and adapts to user preferences

These systems enable long-term improvement and personalization without manual intervention.

## Architecture

```
Agent Execution
    ↓
Performance Tracking
    ↓
Failure Pattern Analysis
    ↓
Prompt Tuning Agent
    ↓
Updated System Prompts
    ↓
Better Future Performance

User Interactions
    ↓
Style Pattern Extraction
    ↓
Personality Memory
    ↓
Consistent Style Application
```

## 1. Self-Tuning Prompts

**Purpose**: Agents learn from failures and automatically improve their system prompts.

**Location**: `lib/learning/prompt-tuner.ts`

### Interface

```typescript
export interface PromptPerformance {
  agentName: string;
  promptVersion: string;
  successCount: number;
  failureCount: number;
  averageConfidence: number;
  failurePatterns: FailurePattern[];
  lastUpdated: Date;
}

export interface FailurePattern {
  pattern: string; // e.g., "insufficient detail in reasoning"
  frequency: number;
  examples: Array<{
    query: string;
    promptUsed: string;
    failure: string;
  }>;
  suggestedFix: string;
}

export interface PromptTuningResult {
  originalPrompt: string;
  updatedPrompt: string;
  changes: PromptChange[];
  rationale: string;
  expectedImprovement: number; // 0.0 to 1.0
}

export interface PromptChange {
  type: 'add' | 'remove' | 'modify' | 'reorder';
  section: string;
  oldText?: string;
  newText?: string;
  reason: string;
}
```

### Implementation

```typescript
import { BaseAgent } from '../agents/base-agent';

export class PromptTuner extends BaseAgent {
  private performanceHistory: Map<string, PromptPerformance>;
  private readonly MIN_FAILURES_FOR_TUNING = 3;
  private readonly CONFIDENCE_THRESHOLD = 0.6;

  constructor(
    apiKey: string,
    modelId: string,
    private storageBackend: 'localStorage' | 'indexedDB' | 'backend' = 'localStorage'
  ) {
    super(apiKey, modelId);
    this.performanceHistory = new Map();
    this.loadPerformanceHistory();
  }

  /**
   * Record agent performance for analysis
   */
  async recordPerformance(
    agentName: string,
    success: boolean,
    confidence: number,
    context: {
      query?: string;
      promptUsed?: string;
      failureReason?: string;
    } = {}
  ): Promise<void> {
    const key = `${agentName}-${this.getCurrentPromptVersion(agentName)}`;
    let performance = this.performanceHistory.get(key);

    if (!performance) {
      performance = {
        agentName,
        promptVersion: this.getCurrentPromptVersion(agentName),
        successCount: 0,
        failureCount: 0,
        averageConfidence: 0,
        failurePatterns: [],
        lastUpdated: new Date(),
      };
      this.performanceHistory.set(key, performance);
    }

    if (success) {
      performance.successCount += 1;
    } else {
      performance.failureCount += 1;
      
      // Record failure pattern
      if (context.failureReason) {
        this.recordFailurePattern(performance, context.failureReason, context);
      }
    }

    // Update average confidence (exponential moving average)
    performance.averageConfidence = 
      performance.averageConfidence * 0.9 + confidence * 0.1;

    performance.lastUpdated = new Date();
    await this.savePerformanceHistory();

    // Check if tuning is needed
    if (this.shouldTunePrompt(performance)) {
      await this.tunePrompt(agentName);
    }
  }

  /**
   * Tune a prompt based on failure patterns
   */
  async tunePrompt(agentName: string): Promise<PromptTuningResult | null> {
    const performance = this.getCurrentPerformance(agentName);
    if (!performance || !this.shouldTunePrompt(performance)) {
      return null;
    }

    const originalPrompt = await this.getCurrentPrompt(agentName);
    if (!originalPrompt) return null;

    // Analyze failure patterns
    const failureAnalysis = this.analyzeFailures(performance);

    // Generate improved prompt
    const messages = [
      {
        role: 'system' as const,
        content: `You are a Prompt Engineering Expert. Your job is to improve agent prompts based on failure analysis.

Current Prompt:
${originalPrompt}

Failure Analysis:
${failureAnalysis}

Improve this prompt to address the failure patterns. Format your response:

UPDATED_PROMPT:
[The improved prompt]

CHANGES:
1. [TYPE: add/remove/modify/reorder] [SECTION: section name]
   Old: [old text if applicable]
   New: [new text if applicable]
   Reason: [why this change]

2. [Next change...]

RATIONALE: [Overall reasoning for changes]
EXPECTED_IMPROVEMENT: [0.0-1.0 estimate]`,
      },
      {
        role: 'user' as const,
        content: 'Analyze the failures and improve the prompt.',
      },
    ];

    const response = await this.callLLM(messages, {
      temperature: 0.5,
      maxTokens: 2000,
    });

    return this.parseTuningResult(response, originalPrompt);
  }

  /**
   * Get the current prompt for an agent
   */
  private async getCurrentPrompt(agentName: string): Promise<string | null> {
    // In real implementation, this would fetch from agent's current system prompt
    // For now, return a placeholder
    const prompts: Record<string, string> = {
      'ThoughtAgent': 'You are a Thought Agent...',
      'PlannerAgent': 'You are a Planner Agent...',
      'CriticAgent': 'You are a Critic Agent...',
      // etc.
    };
    return prompts[agentName] || null;
  }

  /**
   * Apply a tuned prompt to an agent with version control
   */
  async applyTunedPrompt(
    agentName: string,
    tuningResult: PromptTuningResult,
    options: {
      strategy?: 'immediate' | 'a_b_test' | 'gradual_rollout';
      testPercentage?: number; // For A/B testing
    } = {}
  ): Promise<string> {
    const strategy = options.strategy || 'immediate';
    const newVersion = `v${Date.now()}`;
    
    // Store prompt version with metadata
    const promptVersion = {
      version: newVersion,
      agentName,
      prompt: tuningResult.updatedPrompt,
      originalPrompt: tuningResult.originalPrompt,
      changes: tuningResult.changes,
      rationale: tuningResult.rationale,
      expectedImprovement: tuningResult.expectedImprovement,
      createdAt: new Date().toISOString(),
      appliedStrategy: strategy,
    };

    const storageKey = `prompt-${agentName}-${newVersion}`;
    if (this.storageBackend === 'localStorage') {
      localStorage.setItem(storageKey, JSON.stringify(promptVersion));
      
      // Track active versions
      const activeVersions = this.getActiveVersions(agentName);
      activeVersions.push({
        version: newVersion,
        strategy,
        appliedAt: new Date(),
        testPercentage: options.testPercentage || 100,
      });
      localStorage.setItem(`prompt-versions-${agentName}`, JSON.stringify(activeVersions));
    }

    // Apply based on strategy
    if (strategy === 'immediate') {
      // Apply immediately to all instances
      await this.updateAgentPrompt(agentName, tuningResult.updatedPrompt);
    } else if (strategy === 'a_b_test') {
      // A/B testing: apply to percentage of requests
      const testPercentage = options.testPercentage || 50;
      await this.setABTestConfig(agentName, {
        versionA: this.getCurrentPromptVersion(agentName),
        versionB: newVersion,
        splitPercentage: testPercentage,
      });
    } else if (strategy === 'gradual_rollout') {
      // Gradual rollout: start small, increase over time
      await this.startGradualRollout(agentName, newVersion);
    }

    // Reset performance tracking for new prompt version
    const newPerformance: PromptPerformance = {
      agentName,
      promptVersion: newVersion,
      successCount: 0,
      failureCount: 0,
      averageConfidence: 0,
      failurePatterns: [],
      lastUpdated: new Date(),
    };
    this.performanceHistory.set(`${agentName}-${newVersion}`, newPerformance);
    await this.savePerformanceHistory();

    return newVersion;
  }

  /**
   * A/B test prompt versions
   */
  private async setABTestConfig(
    agentName: string,
    config: {
      versionA: string;
      versionB: string;
      splitPercentage: number; // % of requests using versionB
    }
  ): Promise<void> {
    const abTestKey = `ab-test-${agentName}`;
    if (this.storageBackend === 'localStorage') {
      localStorage.setItem(abTestKey, JSON.stringify(config));
    }
  }

  /**
   * Get prompt version to use (with A/B testing logic)
   */
  async getPromptVersionToUse(agentName: string): Promise<string> {
    // Check for A/B test
    const abTestKey = `ab-test-${agentName}`;
    if (this.storageBackend === 'localStorage') {
      const abTestStr = localStorage.getItem(abTestKey);
      if (abTestStr) {
        const abTest = JSON.parse(abTestStr);
        const random = Math.random() * 100;
        if (random < abTest.splitPercentage) {
          return abTest.versionB;
        }
        return abTest.versionA;
      }
    }

    // Default: use most recent version
    return this.getCurrentPromptVersion(agentName);
  }

  /**
   * Compare prompt versions and choose winner
   */
  async comparePromptVersions(
    agentName: string,
    versionA: string,
    versionB: string
  ): Promise<{
    winner: 'A' | 'B' | 'tie';
    metrics: {
      versionA: { successRate: number; avgConfidence: number; totalAttempts: number };
      versionB: { successRate: number; avgConfidence: number; totalAttempts: number };
    };
  }> {
    const perfA = this.performanceHistory.get(`${agentName}-${versionA}`);
    const perfB = this.performanceHistory.get(`${agentName}-${versionB}`);

    if (!perfA || !perfB) {
      return { winner: 'tie', metrics: {} as any };
    }

    const totalA = perfA.successCount + perfA.failureCount;
    const totalB = perfB.successCount + perfB.failureCount;

    if (totalA === 0 || totalB === 0) {
      return { winner: 'tie', metrics: {} as any };
    }

    const successRateA = perfA.successCount / totalA;
    const successRateB = perfB.successCount / totalB;

    const metrics = {
      versionA: {
        successRate: successRateA,
        avgConfidence: perfA.averageConfidence,
        totalAttempts: totalA,
      },
      versionB: {
        successRate: successRateB,
        avgConfidence: perfB.averageConfidence,
        totalAttempts: totalB,
      },
    };

    // Determine winner (need minimum sample size)
    const minSampleSize = 10;
    if (totalA < minSampleSize || totalB < minSampleSize) {
      return { winner: 'tie', metrics };
    }

    // Compare success rate and confidence
    const scoreA = successRateA * 0.6 + perfA.averageConfidence * 0.4;
    const scoreB = successRateB * 0.6 + perfB.averageConfidence * 0.4;

    return {
      winner: scoreB > scoreA ? 'B' : scoreA > scoreB ? 'A' : 'tie',
      metrics,
    };
  }

  private async updateAgentPrompt(agentName: string, prompt: string): Promise<void> {
    // This would require refactoring agents to support dynamic prompts
    // For now, store in a registry that agents can read from
    const promptRegistryKey = `agent-prompt-${agentName}`;
    if (this.storageBackend === 'localStorage') {
      localStorage.setItem(promptRegistryKey, prompt);
    }
  }

  private async startGradualRollout(agentName: string, newVersion: string): Promise<void> {
    // Start with 10% rollout
    await this.setABTestConfig(agentName, {
      versionA: this.getCurrentPromptVersion(agentName),
      versionB: newVersion,
      splitPercentage: 10,
    });

    // Schedule gradual increases (would need a scheduler in production)
    // Day 1: 10%, Day 2: 25%, Day 3: 50%, Day 4: 100%
  }

  private getActiveVersions(agentName: string): Array<{
    version: string;
    strategy: string;
    appliedAt: Date;
    testPercentage: number;
  }> {
    const versionsKey = `prompt-versions-${agentName}`;
    if (this.storageBackend === 'localStorage') {
      const versionsStr = localStorage.getItem(versionsKey);
      if (versionsStr) {
        return JSON.parse(versionsStr).map((v: any) => ({
          ...v,
          appliedAt: new Date(v.appliedAt),
        }));
      }
    }
    return [];
  }

  private shouldTunePrompt(performance: PromptPerformance): boolean {
    // Tune if:
    // 1. Enough failures recorded
    // 2. Failure rate is high
    // 3. Confidence is low

    const totalAttempts = performance.successCount + performance.failureCount;
    if (totalAttempts < 5) return false; // Need minimum attempts

    const failureRate = performance.failureCount / totalAttempts;
    const lowConfidence = performance.averageConfidence < this.CONFIDENCE_THRESHOLD;

    return (
      performance.failureCount >= this.MIN_FAILURES_FOR_TUNING &&
      (failureRate > 0.3 || lowConfidence)
    );
  }

  private recordFailurePattern(
    performance: PromptPerformance,
    failureReason: string,
    context: any
  ): void {
    // Find existing pattern or create new
    let pattern = performance.failurePatterns.find(p => 
      this.similarPattern(p.pattern, failureReason)
    );

    if (!pattern) {
      pattern = {
        pattern: this.extractPattern(failureReason),
        frequency: 0,
        examples: [],
        suggestedFix: '',
      };
      performance.failurePatterns.push(pattern);
    }

    pattern.frequency += 1;
    pattern.examples.push({
      query: context.query || '',
      promptUsed: context.promptUsed || '',
      failure: failureReason,
    });

    // Keep only last 5 examples
    if (pattern.examples.length > 5) {
      pattern.examples.shift();
    }
  }

  private extractPattern(failureReason: string): string {
    // Extract key phrases that indicate failure pattern
    const keywords = [
      'insufficient',
      'missing',
      'incorrect',
      'unclear',
      'vague',
      'incomplete',
      'wrong',
      'failed',
    ];

    for (const keyword of keywords) {
      if (failureReason.toLowerCase().includes(keyword)) {
        return `agent_${keyword}_in_response`;
      }
    }

    return failureReason.substring(0, 50);
  }

  private similarPattern(pattern1: string, pattern2: string): boolean {
    // Simple similarity check
    const words1 = new Set(pattern1.toLowerCase().split(/\s+/));
    const words2 = new Set(pattern2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size > 0.3; // 30% similarity threshold
  }

  private analyzeFailures(performance: PromptPerformance): string {
    if (performance.failurePatterns.length === 0) {
      return 'No specific failure patterns identified.';
    }

    const topPatterns = performance.failurePatterns
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3);

    return topPatterns
      .map(p => `Pattern: ${p.pattern} (${p.frequency} occurrences)
Examples:
${p.examples.map(e => `- ${e.failure}`).join('\n')}`)
      .join('\n\n');
  }

  private parseTuningResult(
    response: string,
    originalPrompt: string
  ): PromptTuningResult {
    const updatedPrompt = this.extractSection(response, 'UPDATED_PROMPT') || originalPrompt;
    const rationale = this.extractSection(response, 'RATIONALE') || '';
    const expectedImprovement = this.extractScore(response, 'EXPECTED_IMPROVEMENT');
    const changes = this.parseChanges(response);

    return {
      originalPrompt,
      updatedPrompt,
      changes,
      rationale,
      expectedImprovement,
    };
  }

  private parseChanges(response: string): PromptChange[] {
    const changesSection = this.extractSection(response, 'CHANGES');
    if (!changesSection) return [];

    const changeRegex = /(\d+)\.\s*\[TYPE:\s*(\w+)\]\s*\[SECTION:\s*([^\]]+)\](?:\s*Old:\s*([^\n]+))?(?:\s*New:\s*([^\n]+))?(?:\s*Reason:\s*([^\n]+))?/gi;
    const matches = Array.from(changesSection.matchAll(changeRegex));

    return matches.map(match => ({
      type: (match[2].toLowerCase() || 'modify') as PromptChange['type'],
      section: match[3]?.trim() || 'unknown',
      oldText: match[4]?.trim(),
      newText: match[5]?.trim(),
      reason: match[6]?.trim() || 'Improvement',
    }));
  }

  private getCurrentPromptVersion(agentName: string): string {
    // In real implementation, track version
    return 'v1';
  }

  private getCurrentPerformance(agentName: string): PromptPerformance | null {
    const key = `${agentName}-${this.getCurrentPromptVersion(agentName)}`;
    return this.performanceHistory.get(key) || null;
  }

  private async loadPerformanceHistory(): Promise<void> {
    if (this.storageBackend === 'localStorage') {
      try {
        const stored = localStorage.getItem('prompt-performance');
        if (stored) {
          const data = JSON.parse(stored);
          for (const [key, perf] of Object.entries(data)) {
            this.performanceHistory.set(key, {
              ...(perf as any),
              lastUpdated: new Date((perf as any).lastUpdated),
            });
          }
        }
      } catch (error) {
        console.error('Failed to load performance history:', error);
      }
    }
  }

  private async savePerformanceHistory(): Promise<void> {
    if (this.storageBackend === 'localStorage') {
      try {
        const data: Record<string, any> = {};
        this.performanceHistory.forEach((perf, key) => {
          data[key] = perf;
        });
        localStorage.setItem('prompt-performance', JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save performance history:', error);
      }
    }
  }

  private extractScore(text: string, label: string): number {
    const regex = new RegExp(`${label}:\\s*([0-9.]+)`, 'i');
    const match = text.match(regex);
    return match ? Math.max(0, Math.min(1, parseFloat(match[1]))) : 0.5;
  }
}
```

## 2. Personality Memory

**Purpose**: Maintain consistent communication style and adapt to user preferences.

**Location**: `lib/learning/personality-memory.ts`

### Interface

```typescript
export interface PersonalityProfile {
  userId?: string; // Optional - for multi-user systems
  style: CommunicationStyle;
  preferences: UserPreferences;
  examples: StyleExample[];
  lastUpdated: Date;
}

export interface CommunicationStyle {
  tone: 'formal' | 'casual' | 'friendly' | 'professional' | 'technical';
  verbosity: 'concise' | 'moderate' | 'detailed';
  structure: 'linear' | 'hierarchical' | 'conversational';
  formatting: {
    useEmojis: boolean;
    useLists: boolean;
    useCodeBlocks: boolean;
    useTables: boolean;
  };
  vocabulary: {
    technicalLevel: 'beginner' | 'intermediate' | 'advanced';
    preferredTerms: Record<string, string>; // e.g., {"facility" => "site"}
  };
}

export interface UserPreferences {
  preferredResponseFormat: 'narrative' | 'structured' | 'mixed';
  detailLevel: 'summary' | 'standard' | 'comprehensive';
  language?: string;
  timezone?: string;
}

export interface StyleExample {
  query: string;
  response: string;
  timestamp: Date;
  rating?: number; // User feedback if available
}
```

### Implementation

```typescript
export class PersonalityMemory {
  private profile: PersonalityProfile | null = null;
  private readonly MIN_EXAMPLES = 5;
  private readonly STORAGE_KEY = 'personality-profile';

  constructor(private storageBackend: 'localStorage' | 'indexedDB' | 'backend' = 'localStorage') {
    this.loadProfile();
  }

  /**
   * Learn from user interactions
   */
  async learnFromInteraction(
    query: string,
    response: string,
    userFeedback?: {
      rating?: number; // 1-5
      explicitPreferences?: Partial<CommunicationStyle>;
    }
  ): Promise<void> {
    if (!this.profile) {
      // Initialize default profile
      this.profile = this.createDefaultProfile();
    }

    // Extract style from response
    const extractedStyle = this.extractStyle(response);

    // Update profile
    this.updateProfile(extractedStyle, userFeedback?.explicitPreferences);

    // Add example
    this.profile.examples.push({
      query,
      response,
      timestamp: new Date(),
      rating: userFeedback?.rating,
    });

    // Keep only recent examples
    if (this.profile.examples.length > 50) {
      this.profile.examples = this.profile.examples.slice(-50);
    }

    // Recalculate style if enough examples
    if (this.profile.examples.length >= this.MIN_EXAMPLES) {
      this.recalculateStyle();
    }

    this.profile.lastUpdated = new Date();
    await this.saveProfile();
  }

  /**
   * Apply personality to a response
   */
  async applyPersonality(
    rawResponse: string,
    context?: {
      query?: string;
      responseType?: 'analysis' | 'answer' | 'list' | 'narrative';
    }
  ): Promise<string> {
    if (!this.profile) {
      return rawResponse; // No personality applied yet
    }

    let styledResponse = rawResponse;

    // Apply tone adjustments
    styledResponse = this.applyTone(styledResponse, this.profile.style.tone);

    // Apply verbosity
    styledResponse = this.applyVerbosity(styledResponse, this.profile.style.verbosity);

    // Apply formatting preferences
    if (this.profile.style.formatting.useLists && !this.hasLists(styledResponse)) {
      styledResponse = this.convertToLists(styledResponse);
    }

    if (this.profile.style.formatting.useCodeBlocks && this.hasCode(styledResponse)) {
      styledResponse = this.formatCodeBlocks(styledResponse);
    }

    // Apply vocabulary preferences
    styledResponse = this.applyVocabulary(styledResponse, this.profile.style.vocabulary);

    return styledResponse;
  }

  /**
   * Get style guidelines for prompt
   */
  getStyleGuidelines(): string {
    if (!this.profile) return '';

    const style = this.profile.style;
    const guidelines: string[] = [];

    guidelines.push(`Tone: ${style.tone}`);
    guidelines.push(`Verbosity: ${style.verbosity}`);
    guidelines.push(`Structure: ${style.structure}`);
    
    if (style.formatting.useEmojis) {
      guidelines.push('Use emojis appropriately');
    }
    
    if (style.vocabulary.preferredTerms && Object.keys(style.vocabulary.preferredTerms).length > 0) {
      guidelines.push(`Preferred terms: ${JSON.stringify(style.vocabulary.preferredTerms)}`);
    }

    return guidelines.join('\n');
  }

  private extractStyle(response: string): Partial<CommunicationStyle> {
    const style: Partial<CommunicationStyle> = {
      formatting: {
        useEmojis: this.hasEmojis(response),
        useLists: this.hasLists(response),
        useCodeBlocks: this.hasCode(response),
        useTables: this.hasTables(response),
      },
      verbosity: this.detectVerbosity(response),
      tone: this.detectTone(response),
    };

    return style;
  }

  private updateProfile(
    extractedStyle: Partial<CommunicationStyle>,
    explicitPreferences?: Partial<CommunicationStyle>
  ): void {
    if (!this.profile) return;

    // Use explicit preferences if provided, otherwise use extracted
    const updates = explicitPreferences || extractedStyle;

    // Merge updates (exponential moving average for learned preferences)
    if (updates.tone) {
      // Simple override for explicit preferences
      this.profile.style.tone = updates.tone;
    }

    if (updates.verbosity) {
      this.profile.style.verbosity = updates.verbosity;
    }

    if (updates.formatting) {
      this.profile.style.formatting = {
        ...this.profile.style.formatting,
        ...updates.formatting,
      };
    }

    if (updates.vocabulary) {
      this.profile.style.vocabulary = {
        ...this.profile.style.vocabulary,
        ...updates.vocabulary,
      };
    }
  }

  private recalculateStyle(): void {
    if (!this.profile || this.profile.examples.length < this.MIN_EXAMPLES) return;

    // Analyze recent examples to determine dominant style
    const recentExamples = this.profile.examples
      .slice(-this.MIN_EXAMPLES)
      .filter(e => !e.rating || e.rating >= 3); // Only positive examples

    const styles = recentExamples.map(e => this.extractStyle(e.response));

    // Majority vote or average
    const tones = styles.map(s => s.tone).filter(Boolean) as string[];
    if (tones.length > 0) {
      this.profile.style.tone = this.mostCommon(tones) as CommunicationStyle['tone'];
    }

    const verbosities = styles.map(s => s.verbosity).filter(Boolean) as string[];
    if (verbosities.length > 0) {
      this.profile.style.verbosity = this.mostCommon(verbosities) as CommunicationStyle['verbosity'];
    }
  }

  private mostCommon(arr: string[]): string {
    const counts: Record<string, number> = {};
    arr.forEach(item => {
      counts[item] = (counts[item] || 0) + 1;
    });
    return Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b));
  }

  private detectTone(response: string): CommunicationStyle['tone'] {
    const casual = /\b(hey|hi|yeah|okay|cool|awesome)\b/i;
    const formal = /\b(please|thank you|appreciate|regarding|furthermore)\b/i;
    const technical = /\b(API|endpoint|schema|parameter|configuration)\b/i;

    if (casual.test(response)) return 'casual';
    if (formal.test(response)) return 'formal';
    if (technical.test(response)) return 'technical';
    return 'friendly';
  }

  private detectVerbosity(response: string): CommunicationStyle['verbosity'] {
    const wordCount = response.split(/\s+/).length;
    if (wordCount < 50) return 'concise';
    if (wordCount < 200) return 'moderate';
    return 'detailed';
  }

  private hasEmojis(text: string): boolean {
    return /[\u{1F300}-\u{1F9FF}]/u.test(text);
  }

  private hasLists(text: string): boolean {
    return /^\s*[-*]\s|\d+\.\s/.test(text);
  }

  private hasCode(text: string): boolean {
    return /```|`[^`]+`/.test(text);
  }

  private hasTables(text: string): boolean {
    return /\|.*\|/.test(text);
  }

  private applyTone(text: string, tone: CommunicationStyle['tone']): string {
    // Tone adjustments would be more sophisticated in production
    // For now, this is a placeholder
    return text;
  }

  private applyVerbosity(text: string, verbosity: CommunicationStyle['verbosity']): string {
    // Verbosity adjustments would be more sophisticated
    return text;
  }

  private convertToLists(text: string): string {
    // Convert paragraphs to lists where appropriate
    // Simplified implementation
    return text;
  }

  private formatCodeBlocks(text: string): string {
    // Ensure code blocks are properly formatted
    return text;
  }

  private applyVocabulary(text: string, vocabulary: CommunicationStyle['vocabulary']): string {
    let result = text;
    
    if (vocabulary.preferredTerms) {
      for (const [term, preferred] of Object.entries(vocabulary.preferredTerms)) {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        result = result.replace(regex, preferred);
      }
    }

    return result;
  }

  private createDefaultProfile(): PersonalityProfile {
    return {
      style: {
        tone: 'friendly',
        verbosity: 'moderate',
        structure: 'hierarchical',
        formatting: {
          useEmojis: false,
          useLists: true,
          useCodeBlocks: true,
          useTables: true,
        },
        vocabulary: {
          technicalLevel: 'intermediate',
          preferredTerms: {},
        },
      },
      preferences: {
        preferredResponseFormat: 'mixed',
        detailLevel: 'standard',
      },
      examples: [],
      lastUpdated: new Date(),
    };
  }

  private async loadProfile(): Promise<void> {
    if (this.storageBackend === 'localStorage') {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          this.profile = {
            ...data,
            lastUpdated: new Date(data.lastUpdated),
            examples: data.examples.map((e: any) => ({
              ...e,
              timestamp: new Date(e.timestamp),
            })),
          };
        }
      } catch (error) {
        console.error('Failed to load personality profile:', error);
      }
    }
  }

  private async saveProfile(): Promise<void> {
    if (this.storageBackend === 'localStorage' && this.profile) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.profile));
      } catch (error) {
        console.error('Failed to save personality profile:', error);
      }
    }
  }
}
```

## Integration Example

**Location**: `lib/orchestrator/intelligence-orchestrator.ts` (partial addition)

```typescript
import { PromptTuner } from '../learning/prompt-tuner';
import { PersonalityMemory } from '../learning/personality-memory';

export class IntelligenceOrchestrator {
  constructor(
    // ... other components
    private promptTuner: PromptTuner,
    private personalityMemory: PersonalityMemory
  ) {}

  async processQuery(userQuery: string, context: any): Promise<IntelligenceResult> {
    // Get personality guidelines for system prompt
    const styleGuidelines = this.personalityMemory.getStyleGuidelines();
    
    // Enhance system prompts with personality
    const enhancedSystemPrompt = `${baseSystemPrompt}

Style Guidelines:
${styleGuidelines}`;

    // ... process query ...

    // After generating response
    const rawResponse = result.response;
    const styledResponse = await this.personalityMemory.applyPersonality(rawResponse, {
      query: userQuery,
      responseType: 'answer',
    });

    // Record interaction for learning
    await this.personalityMemory.learnFromInteraction(userQuery, styledResponse);

    // Record agent performance for prompt tuning
    await this.promptTuner.recordPerformance(
      'ThoughtAgent',
      result.success,
      result.confidence,
      {
        query: userQuery,
        promptUsed: thoughtAgent.systemPrompt,
        failureReason: result.success ? undefined : result.error,
      }
    );

    return {
      ...result,
      response: styledResponse,
    };
  }
}
```

## Testing

**Location**: `lib/learning/personality-memory.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { PersonalityMemory } from './personality-memory';

describe('PersonalityMemory', () => {
  it('should learn from interactions', async () => {
    const memory = new PersonalityMemory();
    
    await memory.learnFromInteraction(
      'List facilities',
      'Here are the facilities: 1. Site A, 2. Site B'
    );

    const guidelines = memory.getStyleGuidelines();
    expect(guidelines).toBeTruthy();
  });

  it('should apply personality to responses', async () => {
    const memory = new PersonalityMemory();
    
    // Learn casual style
    await memory.learnFromInteraction(
      'test',
      'Hey! Here\'s what I found...'
    );

    const styled = await memory.applyPersonality('Here is the result.');
    // Should maintain learned style
    expect(styled).toBeTruthy();
  });
});
```

## Next Steps

1. **Implement Prompt Tuner** (`lib/learning/prompt-tuner.ts`)
   - Performance tracking
   - Failure pattern analysis
   - Prompt improvement generation

2. **Implement Personality Memory** (`lib/learning/personality-memory.ts`)
   - Style extraction
   - Profile management
   - Response styling

3. **Update Types** (`types/index.ts`)
   - Add learning-related interfaces

4. **Integrate with Orchestrator**
   - Track performance after each interaction
   - Apply personality to responses
   - Trigger prompt tuning when needed

5. **Add Feedback Mechanisms**
   - User rating system
   - Explicit preference collection
   - Performance monitoring dashboard

6. **Test Learning Systems**
   - Unit tests for each component
   - Integration tests for learning loops

## Dependencies

- Prompt Tuner requires access to agent system prompts (may require refactoring)
- Personality Memory works independently but integrates with response generation
- Both benefit from Reflection Agent (blueprint 09) for better feedback

## Next Blueprint

Read `12-ADVANCED-LAYERS.md` to implement the Simulation/Imagination Layer.


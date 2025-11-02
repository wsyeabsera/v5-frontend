# Memory Systems - Tool Memory, Goal Memory, and Working Memory

## Overview

This blueprint covers the memory layers that enable learning and context persistence:

1. **Tool Memory**: Procedural memory that learns optimal tool configurations
2. **Goal Memory / Task Tree**: Persistent task hierarchy with progress tracking
3. **Working Memory**: Short-term context buffer for recent reasoning

These memory systems enable the AI to improve over time and maintain coherence across conversations.

## Architecture

```
Tool Usage
    ↓
Tool Memory (learns optimal configs)
    ↓
Future Tool Calls (use learned patterns)

Long-Running Task
    ↓
Goal Memory (track progress)
    ↓
Task Tree (hierarchy of sub-tasks)
    ↓
Resume from checkpoint

Recent Reasoning
    ↓
Working Memory (last N thoughts/plans)
    ↓
Quick Context Access (no DB lookup needed)
```

## 1. Tool Memory

**Purpose**: Learn and remember optimal tool configurations for different contexts.

**Location**: `lib/memory/tool-memory.ts`

### Interface

```typescript
export interface ToolMemoryEntry {
  id: string;
  toolName: string;
  contextSignature: string; // e.g., "long_context_high_temp"
  parameters: Record<string, any>;
  successScore: number; // 0.0 to 1.0
  usageCount: number;
  lastUsed: Date;
  createdAt: Date;
  examples: Array<{
    query: string;
    parameters: Record<string, any>;
    outcome: 'success' | 'failure' | 'partial';
  }>;
}

export interface ToolMemoryContext {
  queryLength: number;
  queryComplexity: number;
  taskType: 'query' | 'analysis' | 'creation' | 'modification';
  previousToolsUsed?: string[];
  dataVolume?: 'small' | 'medium' | 'large';
}
```

### Implementation

```typescript
export class ToolMemory {
  private storage: Map<string, ToolMemoryEntry[]>;
  private readonly MAX_ENTRIES_PER_TOOL = 50;

  constructor(private storageBackend: 'localStorage' | 'indexedDB' | 'backend' = 'localStorage') {
    this.storage = new Map();
    this.loadFromStorage();
  }

  /**
   * Remember a successful tool usage
   */
  async rememberSuccess(
    toolName: string,
    parameters: Record<string, any>,
    context: ToolMemoryContext,
    outcome: 'success' | 'failure' | 'partial'
  ): Promise<void> {
    const contextSignature = this.generateContextSignature(context);
    const entryId = `${toolName}-${contextSignature}`;

    const existingEntries = this.storage.get(toolName) || [];
    const existingEntry = existingEntries.find(e => e.id === entryId);

    if (existingEntry) {
      // Update existing entry
      existingEntry.usageCount += 1;
      existingEntry.lastUsed = new Date();
      
      // Update success score (exponential moving average)
      const newScore = outcome === 'success' ? 1.0 : outcome === 'partial' ? 0.5 : 0.0;
      existingEntry.successScore = 
        existingEntry.successScore * 0.7 + newScore * 0.3;

      existingEntry.examples.push({
        query: this.extractQuery(context),
        parameters,
        outcome,
      });

      // Keep only last 10 examples
      if (existingEntry.examples.length > 10) {
        existingEntry.examples.shift();
      }
    } else {
      // Create new entry
      const newEntry: ToolMemoryEntry = {
        id: entryId,
        toolName,
        contextSignature,
        parameters,
        successScore: outcome === 'success' ? 1.0 : outcome === 'partial' ? 0.5 : 0.0,
        usageCount: 1,
        lastUsed: new Date(),
        createdAt: new Date(),
        examples: [{
          query: this.extractQuery(context),
          parameters,
          outcome,
        }],
      };

      existingEntries.push(newEntry);
      
      // Limit entries per tool
      if (existingEntries.length > this.MAX_ENTRIES_PER_TOOL) {
        existingEntries.sort((a, b) => 
          b.successScore * b.usageCount - a.successScore * a.usageCount
        );
        existingEntries.pop();
      }
    }

    this.storage.set(toolName, existingEntries);
    await this.saveToStorage();
  }

  /**
   * Recall optimal parameters for a tool in a given context
   */
  async recallOptimal(
    toolName: string,
    context: ToolMemoryContext
  ): Promise<Record<string, any> | null> {
    const entries = this.storage.get(toolName);
    if (!entries || entries.length === 0) return null;

    const contextSignature = this.generateContextSignature(context);
    
    // Find best matching entry
    const matches = entries
      .map(entry => ({
        entry,
        similarity: this.calculateSimilarity(contextSignature, entry.contextSignature),
      }))
      .filter(m => m.similarity > 0.5)
      .sort((a, b) => {
        // Sort by similarity * success score * usage count
        const scoreA = a.similarity * a.entry.successScore * a.entry.usageCount;
        const scoreB = b.similarity * b.entry.successScore * b.entry.usageCount;
        return scoreB - scoreA;
      });

    if (matches.length === 0) return null;

    const bestMatch = matches[0];
    if (bestMatch.entry.successScore < 0.6) return null; // Don't use if low success

    return bestMatch.entry.parameters;
  }

  /**
   * Get statistics for a tool
   */
  getToolStats(toolName: string): {
    totalUsage: number;
    averageSuccessScore: number;
    bestContext: string | null;
  } {
    const entries = this.storage.get(toolName) || [];
    
    if (entries.length === 0) {
      return {
        totalUsage: 0,
        averageSuccessScore: 0,
        bestContext: null,
      };
    }

    const totalUsage = entries.reduce((sum, e) => sum + e.usageCount, 0);
    const averageSuccessScore = 
      entries.reduce((sum, e) => sum + e.successScore * e.usageCount, 0) / totalUsage;
    
    const bestEntry = entries.reduce((best, current) =>
      current.successScore > best.successScore ? current : best
    );

    return {
      totalUsage,
      averageSuccessScore,
      bestContext: bestEntry.contextSignature,
    };
  }

  private generateContextSignature(context: ToolMemoryContext): string {
    const parts: string[] = [];

    // Query complexity
    if (context.queryLength > 200) parts.push('long_query');
    else if (context.queryLength > 100) parts.push('medium_query');
    else parts.push('short_query');

    // Task type
    parts.push(context.taskType);

    // Complexity level
    if (context.queryComplexity > 0.7) parts.push('high_complexity');
    else if (context.queryComplexity > 0.4) parts.push('medium_complexity');
    else parts.push('low_complexity');

    // Data volume
    if (context.dataVolume) {
      parts.push(context.dataVolume);
    }

    return parts.join('_');
  }

  private calculateSimilarity(sig1: string, sig2: string): number {
    const parts1 = sig1.split('_');
    const parts2 = sig2.split('_');

    const matchingParts = parts1.filter(p => parts2.includes(p)).length;
    const totalParts = Math.max(parts1.length, parts2.length);

    return matchingParts / totalParts;
  }

  private extractQuery(context: ToolMemoryContext): string {
    // This would need access to the actual query
    // For now, return a placeholder
    return `query_${context.taskType}`;
  }

  private async loadFromStorage(): Promise<void> {
    if (this.storageBackend === 'localStorage') {
      try {
        const stored = localStorage.getItem('tool-memory');
        if (stored) {
          const data = JSON.parse(stored);
          for (const [toolName, entries] of Object.entries(data)) {
            this.storage.set(toolName, entries.map((e: any) => ({
              ...e,
              lastUsed: new Date(e.lastUsed),
              createdAt: new Date(e.createdAt),
            })));
          }
        }
      } catch (error) {
        console.error('Failed to load tool memory:', error);
      }
    }
    // Add other storage backends (IndexedDB, backend API) as needed
  }

  private async saveToStorage(): Promise<void> {
    if (this.storageBackend === 'localStorage') {
      try {
        const data: Record<string, any> = {};
        this.storage.forEach((entries, toolName) => {
          data[toolName] = entries;
        });
        localStorage.setItem('tool-memory', JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save tool memory:', error);
      }
    }
    // Add other storage backends as needed
  }
}
```

## 2. Goal Memory / Task Tree

**Purpose**: Track multi-step tasks with persistent checkpoints and progress.

**Location**: `lib/memory/goal-memory.ts`

### Interface

```typescript
export interface TaskTree {
  id: string;
  goal: string;
  userQuery: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'paused';
  createdAt: Date;
  updatedAt: Date;
  subtasks: TaskNode[];
  metadata: {
    estimatedDuration?: number;
    priority?: 'low' | 'medium' | 'high';
    tags?: string[];
  };
}

export interface TaskNode {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'blocked';
  order: number;
  dependencies: string[]; // IDs of nodes that must complete first
  result?: any;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration?: number;
  actualDuration?: number;
  checkpoint?: {
    data: any;
    timestamp: Date;
  };
  children?: TaskNode[]; // Nested subtasks
}

export interface GoalMemoryQuery {
  status?: TaskTree['status'];
  goal?: string;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
}
```

### Implementation

```typescript
export class GoalMemory {
  private tasks: Map<string, TaskTree>;
  private activeTaskId: string | null = null;

  constructor(private storageBackend: 'localStorage' | 'indexedDB' | 'backend' = 'localStorage') {
    this.tasks = new Map();
    this.loadFromStorage();
  }

  /**
   * Create a new task tree from a plan
   */
  async createTaskTree(
    goal: string,
    userQuery: string,
    planSteps: Array<{
      id: string;
      description: string;
      order: number;
      dependencies?: string[];
    }>
  ): Promise<TaskTree> {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const subtasks: TaskNode[] = planSteps.map(step => ({
      id: step.id,
      title: step.description.substring(0, 100),
      description: step.description,
      status: 'pending' as const,
      order: step.order,
      dependencies: step.dependencies || [],
    }));

    const taskTree: TaskTree = {
      id: taskId,
      goal,
      userQuery,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      subtasks,
      metadata: {},
    };

    this.tasks.set(taskId, taskTree);
    this.activeTaskId = taskId;
    await this.saveToStorage();

    return taskTree;
  }

  /**
   * Update a subtask status
   */
  async updateSubtask(
    taskId: string,
    subtaskId: string,
    updates: {
      status?: TaskNode['status'];
      result?: any;
      error?: string;
      checkpoint?: any;
    }
  ): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const subtask = this.findSubtask(task.subtasks, subtaskId);
    if (!subtask) throw new Error(`Subtask ${subtaskId} not found`);

    if (updates.status) {
      subtask.status = updates.status;

      if (updates.status === 'in-progress' && !subtask.startedAt) {
        subtask.startedAt = new Date();
      }

      if (updates.status === 'completed' || updates.status === 'failed') {
        subtask.completedAt = new Date();
        if (subtask.startedAt) {
          subtask.actualDuration = subtask.completedAt.getTime() - subtask.startedAt.getTime();
        }
      }
    }

    if (updates.result !== undefined) {
      subtask.result = updates.result;
    }

    if (updates.error) {
      subtask.error = updates.error;
    }

    if (updates.checkpoint !== undefined) {
      subtask.checkpoint = {
        data: updates.checkpoint,
        timestamp: new Date(),
      };
    }

    task.updatedAt = new Date();
    this.updateTaskStatus(task);
    await this.saveToStorage();
  }

  /**
   * Get the current active task
   */
  getActiveTask(): TaskTree | null {
    if (!this.activeTaskId) return null;
    return this.tasks.get(this.activeTaskId) || null;
  }

  /**
   * Get next pending subtask
   */
  getNextPendingSubtask(taskId: string): TaskNode | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    // Find subtasks with all dependencies completed
    const readySubtasks = task.subtasks.filter(subtask => {
      if (subtask.status !== 'pending') return false;
      
      // Check if all dependencies are completed
      const allDepsComplete = subtask.dependencies.every(depId => {
        const depSubtask = this.findSubtask(task.subtasks, depId);
        return depSubtask?.status === 'completed';
      });

      return allDepsComplete;
    });

    if (readySubtasks.length === 0) return null;

    // Return the one with lowest order
    return readySubtasks.sort((a, b) => a.order - b.order)[0];
  }

  /**
   * Resume a paused task
   */
  async resumeTask(taskId: string): Promise<TaskTree> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    task.status = 'active';
    task.updatedAt = new Date();
    this.activeTaskId = taskId;
    await this.saveToStorage();

    return task;
  }

  /**
   * Query tasks
   */
  queryTasks(query: GoalMemoryQuery): TaskTree[] {
    let results = Array.from(this.tasks.values());

    if (query.status) {
      results = results.filter(t => t.status === query.status);
    }

    if (query.goal) {
      const goalLower = query.goal.toLowerCase();
      results = results.filter(t => 
        t.goal.toLowerCase().includes(goalLower) ||
        t.userQuery.toLowerCase().includes(goalLower)
      );
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter(t =>
        query.tags!.some(tag => t.metadata.tags?.includes(tag))
      );
    }

    if (query.createdAfter) {
      results = results.filter(t => t.createdAt >= query.createdAfter!);
    }

    if (query.createdBefore) {
      results = results.filter(t => t.createdAt <= query.createdBefore!);
    }

    return results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Get task progress percentage
   */
  getTaskProgress(taskId: string): number {
    const task = this.tasks.get(taskId);
    if (!task || task.subtasks.length === 0) return 0;

    const completed = task.subtasks.filter(s => s.status === 'completed').length;
    return completed / task.subtasks.length;
  }

  private findSubtask(subtasks: TaskNode[], id: string): TaskNode | null {
    for (const subtask of subtasks) {
      if (subtask.id === id) return subtask;
      if (subtask.children) {
        const found = this.findSubtask(subtask.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  private updateTaskStatus(task: TaskTree): void {
    const allCompleted = task.subtasks.every(s => 
      s.status === 'completed' || s.status === 'failed'
    );
    const hasFailed = task.subtasks.some(s => s.status === 'failed');

    if (allCompleted) {
      task.status = hasFailed ? 'failed' : 'completed';
    } else {
      task.status = 'active';
    }
  }

  private async loadFromStorage(): Promise<void> {
    if (this.storageBackend === 'localStorage') {
      try {
        const stored = localStorage.getItem('goal-memory');
        if (stored) {
          const data = JSON.parse(stored);
          for (const [taskId, taskData] of Object.entries(data.tasks || {})) {
            this.tasks.set(taskId, this.deserializeTaskTree(taskData as any));
          }
          this.activeTaskId = data.activeTaskId || null;
        }
      } catch (error) {
        console.error('Failed to load goal memory:', error);
      }
    }
  }

  private async saveToStorage(): Promise<void> {
    if (this.storageBackend === 'localStorage') {
      try {
        const data = {
          tasks: Object.fromEntries(this.tasks),
          activeTaskId: this.activeTaskId,
        };
        localStorage.setItem('goal-memory', JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save goal memory:', error);
        // Handle quota exceeded - maybe prune old tasks
      }
    }
  }

  private deserializeTaskTree(data: any): TaskTree {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      subtasks: data.subtasks.map((s: any) => ({
        ...s,
        startedAt: s.startedAt ? new Date(s.startedAt) : undefined,
        completedAt: s.completedAt ? new Date(s.completedAt) : undefined,
        checkpoint: s.checkpoint ? {
          ...s.checkpoint,
          timestamp: new Date(s.checkpoint.timestamp),
        } : undefined,
      })),
    };
  }
}
```

## 3. Working Memory

**Purpose**: Short-term context buffer for recent reasoning (fast access without DB lookup).

**Location**: `lib/memory/working-memory.ts`

### Interface

```typescript
export interface WorkingMemoryEntry {
  id: string;
  timestamp: Date;
  type: 'thought' | 'plan' | 'critique' | 'meta' | 'result';
  content: any; // Flexible content structure
  summary: string;
  keyPoints: string[];
}

export interface WorkingMemoryQuery {
  type?: WorkingMemoryEntry['type'];
  since?: Date;
  limit?: number;
}
```

### Implementation

```typescript
export class WorkingMemory {
  private entries: WorkingMemoryEntry[];
  private readonly MAX_ENTRIES = 50;
  private readonly TTL_MS = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.entries = [];
    this.cleanup();
  }

  /**
   * Store a memory entry
   */
  store(entry: Omit<WorkingMemoryEntry, 'id' | 'timestamp'>): void {
    const newEntry: WorkingMemoryEntry = {
      ...entry,
      id: `wm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    this.entries.unshift(newEntry); // Add to front (most recent first)

    // Limit size
    if (this.entries.length > this.MAX_ENTRIES) {
      this.entries = this.entries.slice(0, this.MAX_ENTRIES);
    }

    this.cleanup();
  }

  /**
   * Retrieve recent memories matching query
   */
  recall(query: WorkingMemoryQuery = {}): WorkingMemoryEntry[] {
    let results = [...this.entries];

    // Filter by type
    if (query.type) {
      results = results.filter(e => e.type === query.type);
    }

    // Filter by time
    if (query.since) {
      results = results.filter(e => e.timestamp >= query.since!);
    }

    // Limit results
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Get most recent entry of a type
   */
  getLatest(type?: WorkingMemoryEntry['type']): WorkingMemoryEntry | null {
    const entries = type
      ? this.entries.filter(e => e.type === type)
      : this.entries;

    return entries[0] || null;
  }

  /**
   * Search memories by content
   */
  search(keyword: string, limit: number = 10): WorkingMemoryEntry[] {
    const keywordLower = keyword.toLowerCase();

    return this.entries
      .filter(entry => 
        entry.summary.toLowerCase().includes(keywordLower) ||
        entry.keyPoints.some(kp => kp.toLowerCase().includes(keywordLower)) ||
        JSON.stringify(entry.content).toLowerCase().includes(keywordLower)
      )
      .slice(0, limit);
  }

  /**
   * Get context summary for recent activity
   */
  getContextSummary(limit: number = 5): string {
    const recent = this.entries.slice(0, limit);
    
    return recent
      .map(e => `[${e.type}] ${e.summary}`)
      .join('\n');
  }

  /**
   * Clear old entries (TTL cleanup)
   */
  private cleanup(): void {
    const now = Date.now();
    this.entries = this.entries.filter(entry => {
      const age = now - entry.timestamp.getTime();
      return age < this.TTL_MS;
    });
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
  }
}
```

## Integration Example

**Location**: `lib/orchestrator/intelligence-orchestrator.ts` (partial addition)

```typescript
import { ToolMemory } from '../memory/tool-memory';
import { GoalMemory } from '../memory/goal-memory';
import { WorkingMemory } from '../memory/working-memory';

export class IntelligenceOrchestrator {
  constructor(
    // ... other agents
    private toolMemory: ToolMemory,
    private goalMemory: GoalMemory,
    private workingMemory: WorkingMemory
  ) {}

  async processQuery(userQuery: string, context: any): Promise<IntelligenceResult> {
    // Store in working memory
    this.workingMemory.store({
      type: 'thought',
      content: { query: userQuery },
      summary: `User query: ${userQuery.substring(0, 100)}...`,
      keyPoints: [userQuery],
    });

    // Check for optimal tool parameters
    const toolContext = {
      queryLength: userQuery.length,
      queryComplexity: 0.5, // Would come from complexity detector
      taskType: 'query',
    };

    // Create task tree if complex
    let taskTree = null;
    if (context.isComplex) {
      // After plan generation:
      taskTree = await this.goalMemory.createTaskTree(
        plan.goal,
        userQuery,
        plan.steps.map(s => ({
          id: s.id,
          description: s.description,
          order: s.order,
          dependencies: s.dependencies,
        }))
      );
    }

    // Use tool memory when calling tools
    const toolParams = await this.toolMemory.recallOptimal('list_facilities', toolContext);
    
    // After tool execution, remember success
    await this.toolMemory.rememberSuccess(
      'list_facilities',
      actualParams,
      toolContext,
      'success'
    );

    // Update task tree progress
    if (taskTree) {
      await this.goalMemory.updateSubtask(taskTree.id, stepId, {
        status: 'completed',
        result: toolResult,
      });
    }

    // Store results in working memory
    this.workingMemory.store({
      type: 'result',
      content: { tool: 'list_facilities', result: toolResult },
      summary: `Executed list_facilities: ${toolResult.length} facilities found`,
      keyPoints: [`Found ${toolResult.length} facilities`],
    });

    // ... rest of processing
  }
}
```

## Testing

**Location**: `lib/memory/tool-memory.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { ToolMemory } from './tool-memory';

describe('ToolMemory', () => {
  it('should remember successful tool usage', async () => {
    const memory = new ToolMemory();
    
    await memory.rememberSuccess(
      'list_facilities',
      { limit: 10 },
      {
        queryLength: 50,
        queryComplexity: 0.3,
        taskType: 'query',
      },
      'success'
    );

    const optimal = await memory.recallOptimal('list_facilities', {
      queryLength: 60,
      queryComplexity: 0.3,
      taskType: 'query',
    });

    expect(optimal).toEqual({ limit: 10 });
  });
});
```

## Next Steps

1. **Implement Tool Memory** (`lib/memory/tool-memory.ts`)
   - Storage and retrieval
   - Context signature generation
   - Success tracking

2. **Implement Goal Memory** (`lib/memory/goal-memory.ts`)
   - Task tree creation
   - Progress tracking
   - Checkpoint management

3. **Implement Working Memory** (`lib/memory/working-memory.ts`)
   - Fast in-memory storage
   - TTL cleanup
   - Search functionality

4. **Update Types** (`types/index.ts`)
   - Add memory-related interfaces

5. **Integrate with Orchestrator**
   - Use tool memory for optimal tool calls
   - Track tasks in goal memory
   - Store reasoning in working memory

6. **Add Storage Backends**
   - IndexedDB for larger datasets
   - Backend API for persistence
   - Sync mechanisms

## Dependencies

- Works independently but integrates with agents from blueprints 08 and 09
- Tool Memory benefits from Reflection Agent (blueprint 09)
- Goal Memory integrates with Planner Agent

## Next Blueprint

Read `11-ADAPTIVE-LEARNING-SYSTEMS.md` to implement Self-Tuning Prompts and Personality Memory.


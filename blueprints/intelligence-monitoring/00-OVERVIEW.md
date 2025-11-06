# Intelligence Monitoring Pages - Overview

## Purpose

Build comprehensive monitoring and management pages for the orchestrator intelligence features including:
- Vector embeddings & semantic search
- Few-shot learning
- Dynamic prompt enhancement
- Query classification
- Pattern recognition & learning
- Execution memory bank

## Architecture

```
Frontend (Next.js) → API Routes → Orchestrator MCP Server (port 5001)
```

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **UI:** React + shadcn/ui (Tailwind)
- **State:** TanStack Query for data fetching
- **API Client:** MCPClientOrchestrator (via `/api/mcp-orchestrator`)
- **Charts:** Recharts (if needed)
- **TypeScript:** Strict mode

## Implementation Phases

### Phase 1: Foundation (Essential)
1. **Intelligence Dashboard** - Overview of all intelligence features
2. **Semantic Search Explorer** - Test and explore semantic search
3. **Embeddings Status** - Monitor embedding generation

### Phase 2: Core Features (Important)
4. **Query Classification Monitor** - Track query classifications
5. **Prompt Enhancement Viewer** - View prompt enhancements
6. **Pattern Insights** - Enhanced pattern recognition

### Phase 3: Advanced Features (Nice to have)
7. **Few-Shot Learning Monitor** - Monitor few-shot examples
8. **Memory Analytics** - Enhanced memory bank analytics
9. **Intelligence Comparison** - Compare with/without intelligence

## File Structure

```
frontend/
├── app/v2/orchestrator/intelligence/
│   ├── dashboard/
│   │   └── page.tsx
│   ├── semantic-search/
│   │   └── page.tsx
│   ├── embeddings/
│   │   └── page.tsx
│   ├── classification/
│   │   └── page.tsx
│   ├── prompt-enhancement/
│   │   └── page.tsx
│   ├── patterns/
│   │   └── page.tsx
│   ├── few-shot/
│   │   └── page.tsx
│   ├── memory-analytics/
│   │   └── page.tsx
│   └── comparison/
│       └── page.tsx
├── components/v2/orchestrator/intelligence/
│   ├── dashboard/
│   │   ├── IntelligenceDashboard.tsx
│   │   ├── IntelligenceStats.tsx
│   │   ├── IntelligenceHealth.tsx
│   │   └── IntelligenceCharts.tsx
│   ├── semantic-search/
│   │   ├── SemanticSearchPanel.tsx
│   │   ├── SearchResults.tsx
│   │   ├── SimilarityVisualization.tsx
│   │   └── SearchFilters.tsx
│   ├── embeddings/
│   │   ├── EmbeddingsStatus.tsx
│   │   ├── EmbeddingsTimeline.tsx
│   │   └── BackfillControls.tsx
│   ├── classification/
│   │   ├── ClassificationList.tsx
│   │   ├── ClassificationCharts.tsx
│   │   └── ClassificationDetails.tsx
│   ├── prompt-enhancement/
│   │   ├── EnhancementHistory.tsx
│   │   ├── EnhancementComparison.tsx
│   │   └── EnhancementMetrics.tsx
│   ├── patterns/
│   │   ├── PatternList.tsx
│   │   ├── PatternDetails.tsx
│   │   └── PatternExtraction.tsx
│   ├── few-shot/
│   │   ├── FewShotMonitor.tsx
│   │   ├── ExampleLibrary.tsx
│   │   └── ExampleEffectiveness.tsx
│   ├── memory-analytics/
│   │   ├── MemoryDashboard.tsx
│   │   ├── MemoryEffectiveness.tsx
│   │   └── MemoryUsage.tsx
│   └── comparison/
│       ├── ComparisonView.tsx
│       ├── FeatureImpact.tsx
│       └── PerformanceComparison.tsx
└── lib/
    ├── mcp-client-orchestrator.ts (extend with intelligence methods)
    └── queries-v2.ts (extend with intelligence hooks)
```

## API Methods Needed

All methods will be added to `MCPClientOrchestrator`:

### Search & Embeddings
- `searchSimilarExecutions(query, filters)`
- `findSimilarSuccessfulExecutions(query, filters)`
- `findSimilarFailedExecutions(query, filters)`
- `extractFewShotExamples(query, phase, options)`

### Classification
- `classifyQuery(query, orchestratorId)`

### Prompt Enhancement
- `enhancePrompt(basePrompt, userQuery, orchestratorId, phase, options)`

### Patterns
- `extractPatterns(orchestratorId, dateRange)`
- `listPatterns(filters)`

### Memory
- `createMemory(data)`
- `retrieveMemories(query, orchestratorId, filters)`
- `listMemories(filters)`

## Next Steps

Read blueprints in order:
1. `01-PHASE-1-DASHBOARD.md` - Intelligence Dashboard
2. `02-PHASE-1-SEMANTIC-SEARCH.md` - Semantic Search Explorer
3. `03-PHASE-1-EMBEDDINGS.md` - Embeddings Status
4. `04-PHASE-2-CLASSIFICATION.md` - Query Classification Monitor
5. `05-PHASE-2-PROMPT-ENHANCEMENT.md` - Prompt Enhancement Viewer
6. `06-PHASE-2-PATTERNS.md` - Pattern Insights
7. `07-PHASE-3-FEW-SHOT.md` - Few-Shot Learning Monitor
8. `08-PHASE-3-MEMORY-ANALYTICS.md` - Memory Analytics
9. `09-PHASE-3-COMPARISON.md` - Intelligence Comparison


# Pattern Recognition Documentation

## Overview

The Pattern Recognition system identifies and reuses successful patterns from past executions. It queries stored patterns from memory to discover query patterns, plan patterns, tool sequences, and error patterns.

### Purpose

- Identify successful patterns from history
- Reuse proven approaches
- Learn from query structures
- Discover optimal tool sequences
- Recognize error patterns to avoid

### Key Features

- Pattern querying by type
- Query pattern recognition
- Plan pattern discovery
- Tool sequence patterns
- Error pattern identification

### Use Cases

- Find successful query patterns for similar tasks
- Discover optimal plan sequences
- Learn effective tool orderings
- Avoid known error patterns
- Reuse proven approaches

## MCP Tools Reference

### `get_memory_pattern`

Query stored patterns from memory by type and pattern.

**Tool Name:** `get_memory_pattern`

**Request Parameters:**

```typescript
interface GetMemoryPatternParams {
  patternType: 'query' | 'plan' | 'tool' | 'error'  // Type of pattern to query
  pattern: string                                     // Pattern to search for (natural language or pattern string)
}
```

**Response Format:**

```typescript
interface MemoryPattern {
  id: string
  patternType: 'query' | 'plan' | 'tool' | 'error'
  pattern: string                    // The pattern itself
  description: string                // Description of the pattern
  successRate: number                // Success rate 0-1
  usageCount: number                 // How many times this pattern was used
  examples: Array<{
    taskId: string
    context: string
    result: 'success' | 'failure'
  }>
  metadata?: {
    averageDuration?: number
    averageSteps?: number
    commonTools?: string[]
  }
  createdAt: string
  lastUsed: string
}

interface GetMemoryPatternResponse extends Array<MemoryPattern> {}
```

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "get_memory_pattern",
    "arguments": {
      "patternType": "query",
      "pattern": "create facility"
    }
  }
}
```

**Example Response:**

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "result": [
    {
      "id": "pattern-123",
      "patternType": "query",
      "pattern": "create facility with location",
      "description": "Successful pattern for creating facilities",
      "successRate": 0.95,
      "usageCount": 42,
      "examples": [
        {
          "taskId": "task-456",
          "context": "facility_management",
          "result": "success"
        }
      ],
      "metadata": {
        "averageDuration": 3000,
        "averageSteps": 3,
        "commonTools": ["create_facility", "get_facility"]
      },
      "createdAt": "2024-01-15T10:00:00Z",
      "lastUsed": "2024-01-20T14:30:00Z"
    }
  ]
}
```

## Query Hooks Specification

### File: `lib/queries-intelligence/pattern-recognition.ts`

### `useGetMemoryPattern`

Query hook to get memory patterns.

```typescript
export function useGetMemoryPattern(
  patternType: 'query' | 'plan' | 'tool' | 'error',
  pattern: string
) {
  return useQuery({
    queryKey: ['v2', 'intelligence', 'memory-patterns', patternType, pattern],
    queryFn: () => mcpClientIntelligence.getMemoryPattern(patternType, pattern),
    enabled: !!pattern && pattern.length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}
```

**Query Key:** `['v2', 'intelligence', 'memory-patterns', patternType, pattern]`

**Stale Time:** 10 minutes

## MCP Client Methods Specification

### File: `lib/mcp-client-intelligence/pattern-recognition.ts`

```typescript
import { mcpClientV2 } from '../mcp-client-v2'

export class PatternRecognitionClient {
  /**
   * Query stored patterns from memory
   */
  async getMemoryPattern(
    patternType: 'query' | 'plan' | 'tool' | 'error',
    pattern: string
  ): Promise<MemoryPattern[]> {
    return mcpClientV2.request('get_memory_pattern', {
      patternType,
      pattern,
    })
  }
}

export const patternRecognitionClient = new PatternRecognitionClient()
```

**Error Handling:**

- Network errors: Throw Error with message
- API errors: Throw Error with error message from response
- Validation errors: Throw Error with validation details

## UI Component Specifications

### File: `components/v2/pattern-recognition/PatternRecognitionPanel.tsx`

**Purpose:** Main panel for pattern querying

**Props:**

```typescript
interface PatternRecognitionPanelProps {
  // No props needed
}
```

**State Management:**

```typescript
const [patternType, setPatternType] = useState<'query' | 'plan' | 'tool' | 'error'>('query')
const [pattern, setPattern] = useState<string>('')
const [debouncedPattern, setDebouncedPattern] = useState<string>('')
```

**Features:**

- Pattern type selector (query, plan, tool, error)
- Pattern input field with debouncing
- Results display
- Filter options
- Pattern details view

**User Interactions:**

1. Select pattern type
2. Enter pattern to search
3. View matching patterns
4. Click pattern to view details
5. See success rate and usage count
6. View examples

### File: `components/v2/pattern-recognition/PatternQueryForm.tsx`

**Purpose:** Form for querying patterns

**Props:**

```typescript
interface PatternQueryFormProps {
  onQuery?: (patternType: string, pattern: string) => void
}
```

**Features:**

- Pattern type dropdown
- Pattern input field
- Search button
- Clear button
- Help text

### File: `components/v2/pattern-recognition/PatternResults.tsx`

**Purpose:** Display pattern query results

**Props:**

```typescript
interface PatternResultsProps {
  patterns: MemoryPattern[]
  patternType: 'query' | 'plan' | 'tool' | 'error'
  onViewPattern?: (patternId: string) => void
}
```

**Display:**

- Pattern cards list
- Success rate badges
- Usage count
- Pattern description
- Examples count
- Last used date
- Click to view details

**Pattern Card:**

- Pattern text/description
- Success rate indicator (color-coded)
- Usage count badge
- Pattern type badge
- Examples preview
- Metadata (duration, steps, tools)
- View details button

### File: `components/v2/pattern-recognition/PatternDetailsDialog.tsx`

**Purpose:** Detailed view of a pattern

**Props:**

```typescript
interface PatternDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pattern: MemoryPattern
}
```

**Features:**

- Full pattern details
- Success rate visualization
- Examples list with task links
- Metadata display
- Usage history
- Created/last used dates

## Page Structure

### File: `app/v2/pattern-recognition/page.tsx`

```typescript
'use client'

import { PatternRecognitionPanel } from '@/components/v2/pattern-recognition/PatternRecognitionPanel'
import { Network } from 'lucide-react'

export default function PatternRecognitionPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <Network className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Pattern Recognition</h1>
        </div>
        <p className="text-muted-foreground">
          Query stored patterns from memory. Discover successful query patterns, plan sequences, tool orderings, and error patterns.
        </p>
      </div>

      <PatternRecognitionPanel />
    </div>
  )
}
```

**Route:** `/v2/pattern-recognition`

**Navigation Icon:** `Network` from `lucide-react`

## Implementation Checklist

### Phase 1: Setup

- [ ] Create `lib/queries-intelligence/pattern-recognition.ts`
- [ ] Create `lib/mcp-client-intelligence/pattern-recognition.ts`
- [ ] Export pattern recognition client from index

### Phase 2: Components

- [ ] Create `components/v2/pattern-recognition/PatternRecognitionPanel.tsx`
- [ ] Create `components/v2/pattern-recognition/PatternQueryForm.tsx`
- [ ] Create `components/v2/pattern-recognition/PatternResults.tsx`
- [ ] Create `components/v2/pattern-recognition/PatternDetailsDialog.tsx`

### Phase 3: Page

- [ ] Create `app/v2/pattern-recognition/page.tsx`
- [ ] Add route to navigation sidebar
- [ ] Test pattern querying

### Phase 4: Integration

- [ ] Add links to task details from examples
- [ ] Add pattern type filtering
- [ ] Add success rate visualization
- [ ] Add usage count sorting
- [ ] Test with real pattern data

### Phase 5: Testing

- [ ] Test query pattern search
- [ ] Test plan pattern search
- [ ] Test tool pattern search
- [ ] Test error pattern search
- [ ] Test pattern details view
- [ ] Test error handling
- [ ] Test loading states
- [ ] Test empty states

## Dependencies

- `@tanstack/react-query` - For query hooks
- `lib/mcp-client-v2.ts` - Base MCP client
- `components/ui/*` - shadcn/ui components (Select, Input, Card, Badge, etc.)
- `lucide-react` - Icons

## Related Systems

- **Memory System** - Provides pattern data
- **History Query** - Uses patterns for recommendations
- **Smart Features** - Uses patterns for tool recommendations
- **Benchmarks** - Uses patterns for test optimization


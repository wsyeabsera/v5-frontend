<!-- c2a23a2b-9a98-4cdb-9f3d-a452f70fd00c c455d3c3-7e3d-491e-bcd9-9adff7e0ec9f -->
# Semantic Complexity Detector Implementation Plan

## Overview

Create a semantic-based complexity detector that uses Ollama embeddings to match user queries against a stored example database. The system will use cosine similarity to find the most similar example and return its configuration. Falls back to keyword-based detection if no match meets the 0.7 threshold.

## Architecture

- **Ollama Embeddings**: Local embeddings via `http://localhost:11434/api/embeddings` using `nomic-embed-text`
- **Vector Store**: IndexedDB storage for example queries with embeddings and configs
- **Similarity Matching**: Cosine similarity with 0.7 threshold
- **Fallback**: Keyword-based detection if no semantic match found
- **Request Integration**: Uses Request ID system to track queries

## Config Fields for Examples

Since you're building a Groq-like AI (fast inference), recommend storing:

- `complexityScore`: number (0.0-1.0)
- `reasoningPasses`: number (1, 2, or 3)
- `confidence`: number (0.0-1.0) - how confident we are in this config
- `tags`: string[] - optional tags/categories
- `agentHints`: string[] - optional hints for which agents to use

## Files to Create/Modify

### New Files

1. **`lib/ollama/embeddings.ts`** - Ollama embedding service

   - `generateEmbedding(text: string)` - Generate embedding via Ollama API
   - `generateEmbeddings(texts: string[])` - Batch embeddings
   - Error handling and retries

2. **`lib/utils/similarity.ts`** - Similarity calculation utilities

   - `cosineSimilarity(vec1: number[], vec2: number[])` - Calculate cosine similarity
   - `findMostSimilar(queryEmbedding: number[], examples: Example[])` - Find best match

3. **`lib/storage/complexity-examples-storage.ts`** - Vector store for examples

   - Uses existing IndexedDB wrapper
   - CRUD operations for complexity examples
   - Store embeddings with examples
   - Query by similarity

4. **`lib/agents/complexity-detector-semantic.ts`** - Semantic complexity detector

   - `detectComplexity(userQuery: string, requestId: string)` - Main detection method
   - Semantic matching via Ollama embeddings
   - Fallback to keyword-based detection
   - Generates Request ID (as first agent)

5. **`lib/agents/complexity-detector-keyword.ts`** - Keyword-based fallback

   - Fallback implementation using keyword matching
   - Similar logic to original blueprint but simplified

6. **`types/index.ts`** - Add complexity types

   - `ComplexityScore` interface
   - `ComplexityConfig` interface (stored with examples)
   - `ComplexityExample` interface
   - `ComplexityDetectorOutput` interface

7. **`app/api/agents/complexity-detector/route.ts`** - API endpoint

   - POST endpoint for complexity detection
   - Gets user query from request ID if provided
   - Returns complexity score and config

8. **`app/api/complexity-examples/route.ts`** - Example management API

   - GET: List all examples
   - POST: Create new example (with embedding generation)
   - PUT: Update example
   - DELETE: Delete example
   - POST /embed - Generate embedding for text

9. **`app/agents/complexity-detector/page.tsx`** - Complexity detector page

   - Input query or select from request history
   - Display complexity results
   - Show matched example (if semantic match)
   - Show fallback indicator if keyword-based

10. **`app/agents/complexity-examples/page.tsx`** - Example management page

    - List all stored examples
    - Create new example form
    - Edit existing examples
    - Delete examples
    - Test similarity matching
    - Bulk import/export

11. **`components/complexity/ExampleForm.tsx`** - Reusable example form

    - Form for creating/editing examples
    - Query text input
    - Config fields (score, passes, confidence, tags)
    - Auto-generate embedding on save

12. **`components/complexity/ExampleList.tsx`** - Reusable example list

    - Display examples in table/cards
    - Similarity scores
    - Edit/delete actions

13. **`components/complexity/ComplexityResult.tsx`** - Reusable result display

    - Show complexity score
    - Show reasoning passes
    - Show matched example (if semantic)
    - Show fallback indicator
    - Display confidence

14. **`components/complexity/SimilarityTest.tsx`** - Reusable similarity tester

    - Test query against examples
    - Show similarity scores
    - Visualize matches

### Modified Files

1. **`components/layout/Sidebar.tsx`** - Add navigation items

   - "Complexity Detector" link
   - "Complexity Examples" link

## Implementation Details

### Ollama Embedding Service

Using the official Ollama SDK (`ollama` package):

```typescript
// lib/ollama/embeddings.ts
import { Ollama } from 'ollama';

const ollama = new Ollama({ host: 'http://localhost:11434' });
const MODEL = 'nomic-embed-text';

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await ollama.embeddings({
    model: MODEL,
    prompt: text,
  });
  
  return response.embedding;
}

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings = await Promise.all(
    texts.map(text => generateEmbedding(text))
  );
  return embeddings;
}
```

### Complexity Example Storage Schema

Pinecone will store vectors with metadata:

```typescript
interface ComplexityExample {
  id: string; // Pinecone vector ID
  query: string; // Original query text
  embedding: number[]; // Vector embedding (stored as Pinecone vector)
  config: {
    complexityScore: number;
    reasoningPasses: number;
    confidence?: number;
    tags?: string[];
    agentHints?: string[];
  };
  createdAt: string; // ISO timestamp (in metadata)
  updatedAt: string; // ISO timestamp (in metadata)
  usageCount: number; // Track how often this example is matched
}

// Pinecone Metadata Structure
interface ComplexityExampleMetadata {
  query: string;
  complexityScore: number;
  reasoningPasses: number;
  confidence?: number;
  tags?: string; // JSON stringified array
  agentHints?: string; // JSON stringified array
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}
```

### Semantic Detection Flow

1. Generate embedding for user query via Ollama
2. Query all stored examples from IndexedDB
3. Calculate cosine similarity for each example
4. Find best match (highest similarity)
5. If similarity >= 0.7: Return matched example's config
6. If similarity < 0.7: Fallback to keyword-based detection
7. Generate Request ID (as first agent)
8. Return complexity result with Request ID

### Request ID Integration

- Complexity detector generates Request ID (first agent)
- Uses Request ID to retrieve user query from request storage if needed
- Stores complexity result back to request context
- Links example match to request for learning

### Fallback Keyword Detection

Simplified keyword-based detection:

- Analyze query length
- Check for analysis keywords
- Check for multi-step keywords
- Score complexity (0.0-1.0)
- Map to reasoning passes

## UI Features

### Complexity Examples Page (`/agents/complexity-examples`)

1. **Example List View**

   - Table/cards showing all examples
   - Query text, complexity score, reasoning passes
   - Usage count (how often matched)
   - Edit/delete actions

2. **Create/Edit Example Form**

   - Query text input
   - Complexity score slider (0.0-1.0)
   - Reasoning passes selector (1, 2, 3)
   - Confidence slider (optional)
   - Tags input (comma-separated)
   - Agent hints input (optional)
   - Auto-generate embedding button
   - Save button

3. **Similarity Tester**

   - Test query input
   - Shows similarity scores for all examples
   - Highlights best match
   - Visual similarity bar

4. **Bulk Operations**

   - Import examples (JSON)
   - Export examples (JSON)
   - Delete multiple

### Complexity Detector Page (`/agents/complexity-detector`)

1. **Query Input**

   - Text input for query
   - Or select from request history (uses Request ID)
   - Request ID input (to load existing query)

2. **Detection Results**

   - Complexity score visualization
   - Reasoning passes indicator
   - Matched example (if semantic match)
   - Similarity score (if semantic match)
   - Fallback indicator (if keyword-based)
   - Confidence level

3. **Request Integration**

   - Show Request ID (generated or provided)
   - Link to request detail page
   - Store result to request context

## Testing Considerations

- Mock Ollama API for tests
- Test embedding generation
- Test cosine similarity calculation
- Test fallback logic
- Test example storage/retrieval
- Integration tests for full flow

## Environment Variables

Add to `.env.local`:

```env
OLLAMA_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
COMPLEXITY_SIMILARITY_THRESHOLD=0.7
```

## Dependencies

No new npm packages needed (using fetch for Ollama API, IndexedDB for storage)

## Next Steps

After implementing:

1. Test with various queries
2. Build up example database
3. Integrate with chat interface
4. Monitor similarity scores
5. Refine examples based on usage
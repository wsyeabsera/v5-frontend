import { NextRequest, NextResponse } from 'next/server'
import { detectComplexitySemantic, getUserQueryFromRequest } from '@/lib/agents/complexity-detector-semantic'
import { ApiConfig } from '@/lib/ollama/complexity-analyzer'

/**
 * API Route for Complexity Detector Agent
 * 
 * POST /api/agents/complexity-detector
 * 
 * Body:
 * {
 *   userQuery?: string;        // Optional: User query to analyze
 *   requestId?: string;        // Optional: Request ID to get query from
 *   apiConfig?: {              // Optional: API configuration for LLM calls
 *     modelId: string;
 *     apiKey: string;
 *   }
 * }
 * 
 * Returns:
 * {
 *   complexity: ComplexityScore;
 *   requestId: string;
 *   requestContext: RequestContext;
 *   detectedKeywords?: string[];
 *   matchedExampleId?: string;
 *   similarity?: number;
 *   detectionMethod: 'semantic' | 'keyword' | 'llm';
 *   llmUsed?: boolean;
 *   llmExplanation?: string;
 *   llmConfidence?: number;
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userQuery, requestId, apiConfig } = body

    // Validate: must have either userQuery or requestId
    if (!userQuery && !requestId) {
      return NextResponse.json(
        { error: 'Either userQuery or requestId must be provided' },
        { status: 400 }
      )
    }

    // Validate API config if provided
    let validApiConfig: ApiConfig | undefined
    if (apiConfig) {
      if (!apiConfig.modelId || !apiConfig.apiKey) {
        return NextResponse.json(
          { error: 'If apiConfig is provided, both modelId and apiKey are required' },
          { status: 400 }
        )
      }
      validApiConfig = {
        modelId: apiConfig.modelId,
        apiKey: apiConfig.apiKey,
      }
    }

    let query: string

    if (userQuery) {
      // Use provided query
      query = userQuery
    } else if (requestId) {
      // Get query from request ID
      const fetchedQuery = await getUserQueryFromRequest(requestId)
      if (!fetchedQuery) {
        return NextResponse.json(
          { error: `Request ID ${requestId} not found or has no user query` },
          { status: 404 }
        )
      }
      query = fetchedQuery
    } else {
      // This shouldn't happen due to validation above, but TypeScript needs it
      query = ''
    }

    // Run complexity detection
    const result = await detectComplexitySemantic(query, requestId, validApiConfig)

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error('[Complexity Detector API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to detect complexity' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for health check
 */
export async function GET() {
  return NextResponse.json({
    agent: 'complexity-detector',
    status: 'ready',
    description: 'Analyzes query complexity using semantic matching with Ollama embeddings and LLM reasoning',
    methods: {
      semantic: 'Uses Pinecone vector store with similarity threshold',
      keyword: 'Fallback keyword-based detection',
      llm: 'LLM tie-breaker for conflicting scores or ambiguous queries',
    },
  })
}


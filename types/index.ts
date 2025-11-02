export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  toolInvocations?: ToolInvocation[];
}

export interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  args: any;
  result?: any;
  state?: 'partial-call' | 'call' | 'result';
}

export interface ToolCall {
  name: string;
  arguments: any;
  result?: any;
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  description: string;
  testStatus?: ModelTestStatus;
  testResult?: ModelTestResult;
}

/**
 * Model Test Status
 */
export type ModelTestStatus = 'untested' | 'testing' | 'success' | 'error';

/**
 * Model Test Result
 */
export interface ModelTestResult {
  status: ModelTestStatus;
  message: string;
  timestamp: string;
  latency?: number;
}

export interface ApiKeys {
  anthropic?: string;
  openai?: string;
  google?: string;
  groq?: string;
  ollama?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface Facility {
  _id: string;
  name: string;
  shortCode: string;
  location: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contaminant {
  _id: string;
  wasteItemDetected: string;
  material: string;
  facility_id: Facility;
  detection_time: string;
  explosive_level: 'low' | 'medium' | 'high';
  hcl_level: 'low' | 'medium' | 'high';
  so2_level: 'low' | 'medium' | 'high';
  estimated_size: number;
  shipment_id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Inspection {
  _id: string;
  facility_id: Facility;
  is_delivery_accepted: boolean;
  does_delivery_meets_conditions: boolean;
  selected_wastetypes: Array<{
    category: string;
    percentage: string;
  }>;
  heating_value_calculation: number;
  waste_producer: string;
  contract_reference_id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Shipment {
  _id: string;
  entry_timestamp: string;
  exit_timestamp: string;
  source: string;
  facility_id: Facility;
  license_plate: string;
  contract_reference_id: string;
  contractId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityData {
  recentInspections: Inspection[];
  recentContaminants: Contaminant[];
  recentShipments: Shipment[];
}

export interface StatsData {
  overview: {
    facilities: number;
    shipments: number;
    contaminants: number;
    inspections: number;
  };
  metrics: {
    overallAcceptanceRate: string;
    avgHeatingValue: number;
    highRiskContaminants: number;
  };
}

/**
 * Request ID system types
 */
export interface RequestContext {
  requestId: string;
  createdAt: Date;
  agentChain: string[];
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  userQuery?: string;
}

/**
 * Base interface for all agent outputs that includes Request ID
 * 
 * Every agent's output should extend this to include the request context
 */
export interface AgentOutput {
  requestId: string; // Links this output to the request chain
  agentName: string; // Which agent produced this output
  timestamp: Date; // When this agent ran
  requestContext: RequestContext; // Full context for chaining
}

/**
 * Complexity Score - Output of Complexity Detector
 * 
 * This determines how many reasoning passes other agents should perform.
 * Simple queries get 1 pass, complex queries get 3 passes.
 */
export interface ComplexityScore {
  score: number; // 0.0 (simple) to 1.0 (very complex)
  reasoningPasses: number; // 1, 2, or 3
  factors?: {
    queryLength?: number; // Normalized query length (0-1)
    hasMultipleQuestions?: boolean; // Multiple "?" in query
    requiresMultiStep?: boolean; // Contains step/sequence keywords
    involvesAnalysis?: boolean; // Contains analysis keywords
    needsDataAggregation?: boolean; // Contains aggregation keywords
    domainComplexity?: number; // Domain-specific complexity (0-1)
  };
}

/**
 * Complexity Configuration stored with examples
 */
export interface ComplexityConfig {
  complexityScore: number; // 0.0-1.0
  reasoningPasses: number; // 1, 2, or 3
  confidence?: number; // 0.0-1.0 - how confident we are in this config
  tags?: string[]; // Optional tags/categories
  agentHints?: string[]; // Optional hints for which agents to use
}

/**
 * Complexity Example stored in Pinecone
 */
export interface ComplexityExample {
  id: string; // Pinecone vector ID
  query: string; // Original query text
  embedding: number[]; // Vector embedding (for similarity calculations)
  config: ComplexityConfig;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  usageCount: number; // Track how often this example is matched
}

/**
 * Complexity Detector Output - Includes Request ID for chaining
 */
export interface ComplexityDetectorOutput extends AgentOutput {
  complexity: ComplexityScore;
  userQuery: string; // Original query analyzed
  detectedKeywords?: string[]; // Keywords that influenced scoring (if fallback)
  matchedExampleId?: string; // ID of matched example (if semantic match)
  similarity?: number; // Similarity score (if semantic match)
  detectionMethod: 'semantic' | 'keyword' | 'llm'; // How detection was performed
  llmUsed?: boolean; // Whether LLM was consulted
  llmExplanation?: string; // Human-readable explanation (for complex queries or when requested)
  llmConfidence?: number; // Confidence score from LLM analysis (0.0-1.0)
}


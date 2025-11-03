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

/**
 * Agent Parameters - Configurable parameters for AI model calls
 */
export interface AgentParameters {
  temperature?: number; // 0-1, controls randomness
  maxTokens?: number; // Maximum tokens in response
  topP?: number; // 0-1, nucleus sampling parameter
  [key: string]: any; // Extensible for agent-specific params
}

/**
 * Strategy Configuration - Configurable detection strategies per agent
 */
export interface StrategyConfig {
  enabled: string[]; // Enabled strategy names (e.g., ['semantic', 'keyword', 'llm'])
  fallbackOrder?: string[]; // Order to try strategies if first fails
  semantic?: {
    threshold?: number; // Similarity threshold (default: 0.75)
  };
  keyword?: {
    useWhen?: 'always' | 'fallback'; // When to use keyword strategy
  };
  llm?: {
    useWhen?: 'always' | 'conflict' | 'ambiguous'; // When to use LLM
  };
}

/**
 * Agent Configuration - AI configuration for each agent
 */
export interface AgentConfig {
  _id?: string; // MongoDB document ID
  agentId: string; // Unique agent identifier (e.g., 'complexity-detector')
  name: string; // Display name
  description: string; // What this agent does
  modelId: string; // Selected model from settings (e.g., 'claude-sonnet')
  apiKey?: string; // API key for the model provider (stored in MongoDB)
  parameters: AgentParameters; // Model parameters
  enabled: boolean; // Whether agent is active
  strategyConfig?: StrategyConfig; // Optional: Strategy configuration for detection methods
  createdAt?: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
}

/**
 * Base Agent Output - Generic output for utility agents
 */
export interface BaseAgentOutput extends AgentOutput {
  content: string; // Raw LLM response
  parsed?: any; // Optional parsed structured data
}

/**
 * Thought - Internal reasoning output from Thought Agent
 * 
 * This represents the AI's internal "thinking" before taking action.
 * It's like a senior engineer's thought process written down.
 */
export interface Thought {
  id: string; // Unique ID for this thought
  timestamp: Date;
  reasoning: string; // Natural language reasoning about the problem
  approaches: string[]; // Multiple possible approaches to solve it
  constraints: string[]; // Key constraints identified
  assumptions: string[]; // Assumptions being made
  uncertainties: string[]; // Areas of uncertainty
  confidence: number; // 0-1 confidence in this reasoning
}

/**
 * Thought Agent Result - Output with Request ID
 */
export interface ThoughtAgentOutput extends AgentOutput {
  thoughts: Thought[]; // One or more thoughts (for multi-pass reasoning)
  primaryApproach: string; // The main approach identified
  keyInsights: string[]; // Key insights extracted
  recommendedTools: string[]; // Tools that might be useful
  complexityScore?: number; // From Complexity Detector
  reasoningPass?: number; // Which pass this is (1, 2, or 3)
  totalPasses?: number; // Total passes planned
}

/**
 * Thought Example stored in Pinecone
 * 
 * Examples that teach the Thought Agent successful reasoning patterns
 */
export interface ThoughtExample {
  id: string; // Pinecone vector ID
  query: string; // Example user query
  embedding: number[]; // Vector embedding (for similarity calculations)
  reasoning: string; // Example reasoning about the problem
  approaches: string[]; // Example approaches to solve it
  constraints: string[]; // Example constraints identified
  assumptions: string[]; // Example assumptions made
  uncertainties: string[]; // Example uncertainties noted
  recommendedTools: string[]; // Tools that worked well
  successRating: number; // 0-1, how good this example is
  tags: string[]; // Categories like ['data-query', 'facility-analysis', 'compliance']
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  usageCount: number; // Track how often this example is matched
}

/**
 * Plan Step - Individual step in an action plan
 */
export interface PlanStep {
  id: string; // Unique step ID
  order: number; // Execution order (1, 2, 3, ...)
  description: string; // What this step does
  action: string; // Tool name or action type
  parameters?: Record<string, any>; // Parameters for the action
  expectedOutcome: string; // What should happen
  dependencies?: string[]; // IDs of steps that must complete first
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

/**
 * Plan - Complete action plan with steps
 */
export interface Plan {
  id: string;
  goal: string; // Overall goal statement
  steps: PlanStep[];
  estimatedComplexity: number; // 0-1
  confidence: number; // 0-1
  dependencies: string[]; // Overall plan dependencies
  createdAt: Date;
  planVersion?: number; // Version number for tracking multiple plans per request
}

/**
 * Planner Agent Output - Extends AgentOutput with plan details
 */
export interface PlannerAgentOutput extends AgentOutput {
  plan: Plan;
  alternativePlans?: Plan[]; // Alternative approaches if applicable
  rationale: string; // Why this plan will work
  basedOnThoughts: string[]; // IDs of thoughts this plan is based on
}

/**
 * Plan Example stored in Pinecone (optional)
 * 
 * Examples that teach the Planner Agent successful planning patterns
 */
export interface PlanExample {
  id: string; // Pinecone vector ID
  query: string; // Example user query
  embedding: number[]; // Vector embedding (for similarity calculations)
  goal: string; // Example plan goal
  steps: Array<{
    description: string;
    action: string;
    parameters?: Record<string, any>;
  }>; // Example plan steps
  rationale: string; // Why this plan worked
  successRating: number; // 0-1, how good this example is
  tags: string[]; // Categories like ['data-query', 'facility-analysis', 'compliance']
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  usageCount: number; // Track how often this example is matched
}

/**
 * Critique Issue - Individual problem found in a plan
 */
export interface CritiqueIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'logic' | 'feasibility' | 'efficiency' | 'safety' | 'completeness';
  description: string;
  suggestion: string;
  affectedSteps?: string[]; // Step IDs that have this issue
}

/**
 * Follow-Up Question - Question when plan needs clarification
 */
export interface FollowUpQuestion {
  id: string;
  question: string;
  category: 'missing-info' | 'ambiguous' | 'assumption' | 'constraint';
  priority: 'low' | 'medium' | 'high';
  userAnswer?: string; // User's response to the question
}

/**
 * Critique - Complete evaluation of a plan
 */
export interface Critique {
  id: string;
  planId: string;
  overallScore: number; // 0.0-1.0
  feasibilityScore: number;
  correctnessScore: number;
  efficiencyScore: number;
  safetyScore: number;
  issues: CritiqueIssue[];
  followUpQuestions: FollowUpQuestion[];
  strengths: string[];
  suggestions: string[];
  recommendation: 'approve' | 'revise' | 'reject' | 'approve-with-dynamic-fix';
  rationale: string;
}

/**
 * Critic Agent Output
 */
export interface CriticAgentOutput extends AgentOutput {
  critique: Critique;
  planId: string; // ID of the plan being critiqued
  requiresUserFeedback: boolean; // Whether user input is needed to proceed
  critiqueVersion?: number; // Version number for tracking critique evolution
  validationWarnings?: Array<{
    stepOrder: number
    stepId: string
    tool: string
    missingParam: string
    isRequired: boolean
  }>
}

/**
 * MCP Context - Information about available MCP resources
 */
export interface MCPContext {
  tools: Array<{
    name: string
    description: string
    inputSchema: any
  }>
  resources: Array<{
    uri: string
    name: string
    description: string
    mimeType: string
  }>
  prompts: Array<{
    name: string
    description: string
    arguments: Array<{
      name: string
      description: string
      required: boolean
    }>
  }>
}

/**
 * Execution Result for a single step
 */
export interface ExecutionResult {
  stepId: string;
  stepOrder: number;
  success: boolean;
  result?: any;
  error?: string;
  errorType?: 'tool-error' | 'validation-error' | 'coordination-error' | 'missing-data';
  duration: number;
  retries: number;
  timestamp: Date;
  toolCalled?: string;
  parametersUsed?: Record<string, any>;
}

/**
 * Execution Follow-Up Question (context-rich)
 */
export interface ExecutionFollowUpQuestion {
  id: string;
  question: string;
  category: 'missing-data' | 'error-recovery' | 'coordination' | 'ambiguity' | 'user-choice';
  priority: 'low' | 'medium' | 'high';
  context: {
    stepId: string;
    stepOrder: number;
    whatFailed: string;
    whatWasTried: string;
    currentState: string;
    suggestion: string;
  };
  userAnswer?: string;
}

/**
 * Plan Execution Result
 */
export interface PlanExecutionResult {
  planId: string;
  overallSuccess: boolean;
  steps: ExecutionResult[];
  partialResults: Record<string, any>; // stepId -> result
  errors: string[];
  totalDuration: number;
  questionsAsked: ExecutionFollowUpQuestion[];
  adaptations: Array<{
    stepId: string;
    originalAction: string;
    adaptedAction: string;
    reason: string;
  }>;
  planUpdates?: Array<{
    stepId: string;
    stepOrder: number;
    timestamp: Date;
    originalParameters: Record<string, any>;
    updatedParameters: Record<string, any>;
    reason: string;
  }>;
}

/**
 * Executor Agent Output
 */
export interface ExecutorAgentOutput extends AgentOutput {
  executionResult: PlanExecutionResult;
  planId: string;
  executionVersion?: number;
  requiresUserFeedback: boolean;
  critiqueAvailable?: boolean; // Whether critique was consulted
  critiqueRecommendation?: 'approve' | 'revise' | 'reject' | 'approve-with-dynamic-fix';
}


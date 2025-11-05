import { mcpClientV2 } from '../mcp-client-v2'

// Plan Quality Prediction interfaces
interface PlanQualityPredictionRiskFactor {
  factor: string
  severity: 'low' | 'medium' | 'high'
  description: string
  mitigation?: string
}

interface PlanQualityPredictionRecommendation {
  type: 'optimization' | 'warning' | 'alternative'
  priority: 'high' | 'medium' | 'low'
  message: string
  suggestedAction?: any
}

interface PlanQualityPredictionSimilarPlan {
  planId: string
  successRate: number
  similarity: number
}

interface PlanQualityPredictionBaseline {
  avgSuccessRate: number
  avgDuration: number
}

interface PlanQualityPredictionComparison {
  similarPlans: PlanQualityPredictionSimilarPlan[]
  baseline: PlanQualityPredictionBaseline
}

interface PlanQualityPredictionData {
  successProbability: number
  confidence: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  estimatedDuration: number
  estimatedCost?: number
}

interface PlanQualityPrediction {
  _id: string
  planId: string
  prediction: PlanQualityPredictionData
  riskFactors: PlanQualityPredictionRiskFactor[]
  recommendations: PlanQualityPredictionRecommendation[]
  comparison: PlanQualityPredictionComparison
  predictedAt: string
  createdAt: string
  updatedAt: string
}

interface PlanQualityPredictionListResponse {
  predictions: PlanQualityPrediction[]
  total: number
  limit: number
  skip: number
  hasMore: boolean
}

// Tool Recommendation interfaces
interface ToolRecommendationPerformance {
  successRate: number
  avgDuration: number
  reliability: number
}

interface ToolRecommendationContextFit {
  score: number
  matches: string[]
}

interface ToolRecommendationItem {
  toolName: string
  confidence: number
  score: number
  reasons: string[]
  performance: ToolRecommendationPerformance
  contextFit: ToolRecommendationContextFit
}

interface ToolRecommendationWarning {
  toolName: string
  warning: string
    severity: 'low' | 'medium' | 'high'
}

interface ToolRecommendation {
  _id: string
  requiredAction: string
  context: string
  recommendations: ToolRecommendationItem[]
  warnings: ToolRecommendationWarning[]
  recommendedAt: string
  createdAt: string
  updatedAt: string
}

interface ToolRecommendationListResponse {
  recommendations: ToolRecommendation[]
  total: number
  limit: number
  skip: number
  hasMore: boolean
}

// Legacy single recommendation interface (for backward compatibility)
interface ToolRecommendationSingle {
  toolName: string
  description: string
  confidence: number
  reason: string
  successRate?: number
  averageDuration?: number
}

interface RefinedPlan {
  originalPlanId: string
  refinedPlanId: string
  changes: Array<{
    stepId: string
    change: string
    reason: string
  }>
  confidence: number
  predictedImprovement: {
    successProbability: number
    estimatedDuration: number
  }
}

interface CostTracking {
  taskId: string
  planId: string
  agentConfigId: string
  totalTokens: number
  promptTokens: number
  completionTokens: number
  cost: number
  costBreakdown: Array<{
    stepId: string
    toolName?: string
    tokens: number
    cost: number
  }>
  timestamp: string
}

interface CostOptimization {
  originalPlanId: string
  optimizedPlanId: string
  estimatedSavings: number
  savingsPercentage: number
  changes: Array<{
    stepId: string
    change: string
    estimatedSavings: number
  }>
  qualityImpact: {
    predictedQuality: number
    qualityChange: number
  }
}

export class SmartFeaturesClient {
  /**
   * Predict plan quality before execution
   */
  async predictPlanQuality(planId: string): Promise<PlanQualityPrediction> {
    return mcpClientV2.request('predict_plan_quality', { planId })
  }

  /**
   * Get tool recommendations for an action (single query)
   */
  async getToolRecommendations(
    requiredAction: string,
    context?: string
  ): Promise<ToolRecommendationSingle[]> {
    return mcpClientV2.request('get_tool_recommendations', {
      requiredAction,
      context,
    })
  }

  /**
   * List plan quality predictions with filters and pagination
   */
  async listPlanQualityPredictions(filters?: {
    planId?: string
    startDate?: string
    endDate?: string
    limit?: number
    skip?: number
  }): Promise<PlanQualityPredictionListResponse> {
    const result = await mcpClientV2.request('list_plan_quality_predictions', filters || {})
    if (result && typeof result === 'object' && 'predictions' in result) {
      return result as PlanQualityPredictionListResponse
    }
    throw new Error('Unexpected response format from list_plan_quality_predictions')
  }

  /**
   * List tool recommendations with filters and pagination
   */
  async listToolRecommendations(filters?: {
    requiredAction?: string
    context?: string
    startDate?: string
    endDate?: string
    limit?: number
    skip?: number
  }): Promise<ToolRecommendationListResponse> {
    const result = await mcpClientV2.request('list_tool_recommendations', filters || {})
    if (result && typeof result === 'object' && 'recommendations' in result) {
      return result as ToolRecommendationListResponse
    }
    throw new Error('Unexpected response format from list_tool_recommendations')
  }

  /**
   * Automatically refine a failed plan
   */
  async refinePlan(planId: string, failureReason: string): Promise<RefinedPlan> {
    return mcpClientV2.request('refine_plan', {
      planId,
      failureReason,
    })
  }

  /**
   * Track costs for a task
   */
  async trackCost(taskId: string): Promise<CostTracking> {
    return mcpClientV2.request('track_cost', { taskId })
  }

  /**
   * Optimize plan costs
   */
  async optimizeCost(planId: string): Promise<CostOptimization> {
    return mcpClientV2.request('optimize_cost', { planId })
  }
}

export const smartFeaturesClient = new SmartFeaturesClient()

export type {
  PlanQualityPrediction,
  PlanQualityPredictionListResponse,
  PlanQualityPredictionData,
  PlanQualityPredictionRiskFactor,
  PlanQualityPredictionRecommendation,
  PlanQualityPredictionComparison,
  ToolRecommendation,
  ToolRecommendationListResponse,
  ToolRecommendationItem,
  ToolRecommendationWarning,
  ToolRecommendationPerformance,
  ToolRecommendationContextFit,
  ToolRecommendationSingle,
  RefinedPlan,
  CostTracking,
  CostOptimization,
}


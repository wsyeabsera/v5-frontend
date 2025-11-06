import { Period } from '../PeriodSelector'

/**
 * Get period key for grouping metrics
 */
function getPeriodKey(date: Date, period: Period): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')

  switch (period) {
    case 'minutely':
      return `${year}-${month}-${day} ${hour}:${minute}`
    case 'hourly':
      return `${year}-${month}-${day} ${hour}:00`
    case 'daily':
      return `${year}-${month}-${day}`
    case 'monthly':
      return `${year}-${month}`
    default:
      return `${year}-${month}-${day}`
  }
}

/**
 * Format date label based on period
 */
export function formatPeriodLabel(date: Date, period: Period): string {
  switch (period) {
    case 'minutely':
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    case 'hourly':
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
      })
    case 'daily':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    case 'monthly':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    default:
      return date.toLocaleDateString()
  }
}

/**
 * Group metrics by period
 */
export function groupByPeriod(metrics: any[], period: Period): Map<string, any[]> {
  const grouped = new Map<string, any[]>()

  for (const metric of metrics) {
    if (!metric.timestamp) continue

    const date = new Date(metric.timestamp)
    const key = getPeriodKey(date, period)

    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(metric)
  }

  return grouped
}

/**
 * Aggregate latency metrics for a period
 */
export function aggregateLatency(metrics: any[]): {
  total: number
  thought: number
  plan: number
  execution: number
  summary: number
} {
  const latencies = metrics.filter((m) => m.execution?.latency?.total)

  if (latencies.length === 0) {
    return { total: 0, thought: 0, plan: 0, execution: 0, summary: 0 }
  }

  const total = latencies.reduce((sum, m) => sum + (m.execution?.latency?.total || 0), 0) / latencies.length
  const thought = latencies.reduce((sum, m) => sum + (m.execution?.latency?.thought || 0), 0) / latencies.length
  const plan = latencies.reduce((sum, m) => sum + (m.execution?.latency?.plan || 0), 0) / latencies.length
  const execution = latencies.reduce((sum, m) => sum + (m.execution?.latency?.execution || 0), 0) / latencies.length
  const summary = latencies.reduce((sum, m) => sum + (m.execution?.latency?.summary || 0), 0) / latencies.length

  return {
    total: Math.round(total),
    thought: Math.round(thought),
    plan: Math.round(plan),
    execution: Math.round(execution),
    summary: Math.round(summary),
  }
}

/**
 * Calculate success rate for a period
 */
export function aggregateSuccessRate(metrics: any[]): { success: number; total: number; successRate: number } {
  const total = metrics.length
  const success = metrics.filter((m) => m.execution?.status === 'success').length
  const successRate = total > 0 ? Math.round((success / total) * 100) : 0

  return { success, total, successRate }
}

/**
 * Aggregate token usage for a period
 */
export function aggregateTokens(metrics: any[]): {
  input: number
  output: number
  total: number
} {
  return metrics.reduce(
    (acc, m) => {
      acc.input += m.resources?.tokenUsage?.input || 0
      acc.output += m.resources?.tokenUsage?.output || 0
      acc.total += m.resources?.tokenUsage?.total || 0
      return acc
    },
    { input: 0, output: 0, total: 0 }
  )
}

/**
 * Aggregate cost for a period
 */
export function aggregateCost(metrics: any[]): number {
  return metrics.reduce((sum, m) => sum + (m.resources?.cost || 0), 0)
}

/**
 * Aggregate quality scores for a period
 */
export function aggregateQuality(metrics: any[]): {
  completeness: number
  relevance: number
  accuracy: number
} {
  const qualities = metrics.filter((m) => m.quality)

  if (qualities.length === 0) {
    return { completeness: 0, relevance: 0, accuracy: 0 }
  }

  const completeness =
    qualities.reduce((sum, m) => sum + (m.quality?.outputCompleteness || 0), 0) / qualities.length
  const relevance = qualities.reduce((sum, m) => sum + (m.quality?.outputRelevance || 0), 0) / qualities.length
  const accuracy = qualities.reduce((sum, m) => sum + (m.quality?.outputAccuracy || 0), 0) / qualities.length

  return {
    completeness: Math.round(completeness),
    relevance: Math.round(relevance),
    accuracy: Math.round(accuracy),
  }
}

/**
 * Aggregate confidence scores for a period
 */
export function aggregateConfidence(metrics: any[]): {
  overall: number
  thought: number
  plan: number
  execution: number
  summary: number
} {
  const confidences = metrics.filter((m) => m.confidence)

  if (confidences.length === 0) {
    return { overall: 0, thought: 0, plan: 0, execution: 0, summary: 0 }
  }

  const overall = confidences.reduce((sum, m) => sum + (m.confidence?.overall || 0), 0) / confidences.length
  const thought = confidences.reduce((sum, m) => sum + (m.confidence?.thought || 0), 0) / confidences.length
  const plan = confidences.reduce((sum, m) => sum + (m.confidence?.plan || 0), 0) / confidences.length
  const execution = confidences.reduce((sum, m) => sum + (m.confidence?.execution || 0), 0) / confidences.length
  const summary = confidences.reduce((sum, m) => sum + (m.confidence?.summary || 0), 0) / confidences.length

  return {
    overall: Math.round(overall),
    thought: Math.round(thought),
    plan: Math.round(plan),
    execution: Math.round(execution),
    summary: Math.round(summary),
  }
}


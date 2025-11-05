/**
 * Summary storage utilities for caching generated task summaries
 */

export interface CachedSummary {
  taskId: string
  summary: string
  format: 'brief' | 'detailed' | 'technical'
  includeInsights: boolean
  includeRecommendations: boolean
  generatedAt: string
  taskMetadata?: {
    planId?: string
    status?: string
    createdAt?: string
  }
}

const STORAGE_PREFIX = 'task-summary-'
const MAX_SUMMARIES_PER_TASK = 10

/**
 * Get storage key for a specific summary
 */
function getSummaryKey(taskId: string, format: string, timestamp: string): string {
  return `${STORAGE_PREFIX}${taskId}-${format}-${timestamp}`
}

/**
 * Get all summary keys for a task
 */
function getTaskSummaryKeys(taskId: string): string[] {
  if (typeof window === 'undefined') return []
  
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(`${STORAGE_PREFIX}${taskId}-`)) {
      keys.push(key)
    }
  }
  return keys.sort().reverse() // Most recent first
}

/**
 * Save a summary to localStorage
 */
export function saveSummary(summary: CachedSummary): void {
  if (typeof window === 'undefined') return

  const timestamp = summary.generatedAt || new Date().toISOString()
  const key = getSummaryKey(summary.taskId, summary.format, timestamp)

  try {
    localStorage.setItem(key, JSON.stringify(summary))
    
    // Clean up old summaries (keep only MAX_SUMMARIES_PER_TASK)
    const allKeys = getTaskSummaryKeys(summary.taskId)
    if (allKeys.length > MAX_SUMMARIES_PER_TASK) {
      const keysToRemove = allKeys.slice(MAX_SUMMARIES_PER_TASK)
      keysToRemove.forEach(k => localStorage.removeItem(k))
    }
  } catch (error) {
    console.error('Failed to save summary to localStorage:', error)
  }
}

/**
 * Get all cached summaries for a task
 */
export function getTaskSummaries(taskId: string): CachedSummary[] {
  if (typeof window === 'undefined') return []

  const keys = getTaskSummaryKeys(taskId)
  const summaries: CachedSummary[] = []

  for (const key of keys) {
    try {
      const data = localStorage.getItem(key)
      if (data) {
        const summary = JSON.parse(data) as CachedSummary
        summaries.push(summary)
      }
    } catch (error) {
      console.error(`Failed to parse summary from ${key}:`, error)
    }
  }

  return summaries.sort((a, b) => 
    new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
  )
}

/**
 * Get a specific summary by taskId and format (most recent)
 */
export function getLatestSummary(
  taskId: string,
  format?: 'brief' | 'detailed' | 'technical'
): CachedSummary | null {
  const summaries = getTaskSummaries(taskId)
  
  if (format) {
    const filtered = summaries.filter(s => s.format === format)
    return filtered[0] || null
  }
  
  return summaries[0] || null
}

/**
 * Check if a summary exists for a task
 */
export function hasSummary(taskId: string): boolean {
  return getTaskSummaries(taskId).length > 0
}

/**
 * Delete a specific summary
 */
export function deleteSummary(taskId: string, timestamp: string, format: string): void {
  if (typeof window === 'undefined') return

  const key = getSummaryKey(taskId, format, timestamp)
  localStorage.removeItem(key)
}

/**
 * Delete all summaries for a task
 */
export function deleteAllTaskSummaries(taskId: string): void {
  if (typeof window === 'undefined') return

  const keys = getTaskSummaryKeys(taskId)
  keys.forEach(key => localStorage.removeItem(key))
}

/**
 * Clear all summaries
 */
export function clearAllSummaries(): void {
  if (typeof window === 'undefined') return

  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(STORAGE_PREFIX)) {
      keys.push(key)
    }
  }
  
  keys.forEach(key => localStorage.removeItem(key))
}

/**
 * Get summary statistics
 */
export function getSummaryStats(): {
  totalSummaries: number
  uniqueTasks: number
  byFormat: Record<string, number>
} {
  if (typeof window === 'undefined') {
    return { totalSummaries: 0, uniqueTasks: 0, byFormat: {} }
  }

  const taskIds = new Set<string>()
  const byFormat: Record<string, number> = {}
  let total = 0

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(STORAGE_PREFIX)) {
      total++
      try {
        const data = localStorage.getItem(key)
        if (data) {
          const summary = JSON.parse(data) as CachedSummary
          taskIds.add(summary.taskId)
          byFormat[summary.format] = (byFormat[summary.format] || 0) + 1
        }
      } catch {
        // Ignore parsing errors
      }
    }
  }

  return {
    totalSummaries: total,
    uniqueTasks: taskIds.size,
    byFormat,
  }
}


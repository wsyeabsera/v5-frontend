/**
 * Requests API Client
 * 
 * Client-side functions for interacting with the requests API endpoints.
 */

import { RequestContext } from '@/types'

const API_BASE = '/api/requests'

/**
 * Get all requests with optional filters
 */
export async function getAllRequests(filters?: {
  status?: string
  agentName?: string
  search?: string
  startDate?: string
  endDate?: string
}): Promise<RequestContext[]> {
  const params = new URLSearchParams()
  if (filters?.status) params.append('status', filters.status)
  if (filters?.agentName) params.append('agentName', filters.agentName)
  if (filters?.search) params.append('search', filters.search)
  if (filters?.startDate) params.append('startDate', filters.startDate)
  if (filters?.endDate) params.append('endDate', filters.endDate)

  const url = `${API_BASE}${params.toString() ? `?${params.toString()}` : ''}`
  
  // Add timeout to fetch request (30 seconds)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)
  
  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error || `Failed to fetch requests: ${response.statusText}`
      throw new Error(errorMessage)
    }

    const data = await response.json()
    // Convert date strings back to Date objects
    return data.map((req: any) => ({
      ...req,
      createdAt: new Date(req.createdAt),
    }))
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.')
    }
    throw error
  }
}

/**
 * Get a single request by ID
 */
export async function getRequest(id: string): Promise<RequestContext | null> {
  const response = await fetch(`${API_BASE}/${id}`)

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch request: ${response.statusText}`)
  }

  const data = await response.json()
  return {
    ...data,
    createdAt: new Date(data.createdAt),
  }
}

/**
 * Create a new request
 */
export async function createRequest(
  context: Omit<RequestContext, '_id'>
): Promise<RequestContext> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(context),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `Failed to create request: ${response.statusText}`)
  }

  const data = await response.json()
  return {
    ...data,
    createdAt: new Date(data.createdAt),
  }
}

/**
 * Update a request
 */
export async function updateRequest(
  id: string,
  updates: Partial<RequestContext>
): Promise<RequestContext> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `Failed to update request: ${response.statusText}`)
  }

  const data = await response.json()
  return {
    ...data,
    createdAt: new Date(data.createdAt),
  }
}

/**
 * Delete a request
 */
export async function deleteRequest(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `Failed to delete request: ${response.statusText}`)
  }
}

/**
 * Search requests
 */
export async function searchRequests(query: string, filters?: {
  status?: string
  agentName?: string
  startDate?: string
  endDate?: string
}): Promise<RequestContext[]> {
  const response = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      filters,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to search requests: ${response.statusText}`)
  }

  const data = await response.json()
  return data.map((req: any) => ({
    ...req,
    createdAt: new Date(req.createdAt),
  }))
}

/**
 * Delete all requests
 */
export async function deleteAllRequests(): Promise<{ success: boolean; count: number }> {
  const response = await fetch(API_BASE, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `Failed to delete all requests: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get requests with complexity-detector in their agent chain
 * 
 * Returns requests with a thoughtOutputExists boolean indicating
 * whether thought output already exists for each request.
 */
export async function getRequestsWithComplexityDetector(): Promise<(RequestContext & { thoughtOutputExists: boolean })[]> {
  const response = await fetch(`${API_BASE}/with-complexity-detector`)
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMessage = errorData.error || `Failed to fetch requests: ${response.statusText}`
    throw new Error(errorMessage)
  }
  
  const data = await response.json()
  // Convert date strings back to Date objects
  return data.map((req: any) => ({
    ...req,
    createdAt: new Date(req.createdAt),
  }))
}

/**
 * Get requests with thought-agent in their agent chain
 * 
 * Returns requests with a plannerOutputExists boolean indicating
 * whether planner output already exists for each request.
 */
export async function getRequestsWithThoughtAgent(): Promise<(RequestContext & { plannerOutputExists: boolean })[]> {
  const response = await fetch(`${API_BASE}/with-thought-agent`)
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMessage = errorData.error || `Failed to fetch requests: ${response.statusText}`
    throw new Error(errorMessage)
  }
  
  const data = await response.json()
  // Convert date strings back to Date objects
  return data.map((req: any) => ({
    ...req,
    createdAt: new Date(req.createdAt),
  }))
}

/**
 * Get requests with planner-agent in their agent chain
 * 
 * Returns requests with a critiqueOutputExists boolean indicating
 * whether critic output already exists for each request.
 */
export async function getRequestsWithPlannerAgent(): Promise<(RequestContext & { critiqueOutputExists: boolean })[]> {
  const response = await fetch(`${API_BASE}/with-planner-agent`)
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMessage = errorData.error || `Failed to fetch requests: ${response.statusText}`
    throw new Error(errorMessage)
  }
  
  const data = await response.json()
  // Convert date strings back to Date objects
  return data.map((req: any) => ({
    ...req,
    createdAt: new Date(req.createdAt),
  }))
}


import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useModels, useTools, useResources, useCallTool } from './queries'
import { apiClient } from './mcp-client'
import { ReactNode } from 'react'

vi.mock('./mcp-client')

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useModels', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch models successfully', async () => {
    const mockModels = {
      models: [
        { id: 'claude-sonnet', name: 'Claude Sonnet', provider: 'anthropic' },
      ],
    }
    vi.mocked(apiClient.getModels).mockResolvedValueOnce(mockModels)

    const { result } = renderHook(() => useModels(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockModels)
    expect(apiClient.getModels).toHaveBeenCalledTimes(1)
  })

  it('should handle errors when fetching models', async () => {
    vi.mocked(apiClient.getModels).mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useModels(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
  })
})

describe('useTools', () => {
  it('should fetch tools successfully', async () => {
    const mockTools = {
      tools: [
        { name: 'list_facilities', description: 'List all facilities' },
      ],
    }
    vi.mocked(apiClient.getTools).mockResolvedValueOnce(mockTools)

    const { result } = renderHook(() => useTools(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockTools)
  })
})

describe('useResources', () => {
  it('should fetch resources successfully', async () => {
    const mockResources = {
      resources: [
        { uri: 'facility://1', name: 'Facility 1' },
      ],
    }
    vi.mocked(apiClient.getResources).mockResolvedValueOnce(mockResources)

    const { result } = renderHook(() => useResources(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockResources)
  })
})

describe('useCallTool', () => {
  it('should call tool with arguments', async () => {
    const mockResult = {
      message: 'Success',
      tools: ['list_facilities'],
      result: { facilities: [] },
    }
    vi.mocked(apiClient.callTool).mockResolvedValueOnce(mockResult)

    const { result } = renderHook(() => useCallTool(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      name: 'list_facilities',
      args: { location: 'Amsterdam' },
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockResult)
    expect(apiClient.callTool).toHaveBeenCalledWith('list_facilities', {
      location: 'Amsterdam',
    })
  })

  it('should handle tool execution errors', async () => {
    vi.mocked(apiClient.callTool).mockRejectedValueOnce(new Error('Tool not found'))

    const { result } = renderHook(() => useCallTool(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      name: 'invalid_tool',
      args: {},
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
  })
})


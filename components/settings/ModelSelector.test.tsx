import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ModelSelector } from './ModelSelector'
import { useStore } from '@/lib/store'
import { apiClient } from '@/lib/mcp-client'
import { ReactNode } from 'react'

vi.mock('@/lib/mcp-client', () => ({
  apiClient: {
    getModels: vi.fn().mockResolvedValue({
      models: [
        { id: 'claude-sonnet', name: 'Claude Sonnet', provider: 'anthropic', description: 'Fast and intelligent AI model' },
        { id: 'gpt-4', name: 'GPT-4', provider: 'openai', description: 'Powerful language model' },
        { id: 'gemini-pro', name: 'Gemini Pro', provider: 'google', description: "Google's advanced AI" },
      ],
    }),
  },
}))

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

describe('ModelSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStore.setState({
      selectedModel: 'claude-sonnet',
      availableModels: [],
      setSelectedModel: vi.fn(),
      setAvailableModels: vi.fn(),
    })
  })

  it('should render with label', () => {
    const mockModels = { models: [] }
    vi.mocked(apiClient.getModels).mockResolvedValueOnce(mockModels)

    render(<ModelSelector />, { wrapper: createWrapper() })
    
    expect(screen.getByText('AI Model')).toBeInTheDocument()
  })

  it('should fetch models on mount', async () => {
    // getModels is now hardcoded in MCP client, so it returns immediately
    render(<ModelSelector />, { wrapper: createWrapper() })

    await waitFor(() => {
      // Models should be available (they're hardcoded now)
      expect(screen.getByText('Claude Sonnet')).toBeInTheDocument()
    })
  })

  it('should update store when models are fetched', async () => {
    const setAvailableModelsSpy = vi.fn()
    useStore.setState({ setAvailableModels: setAvailableModelsSpy })

    render(<ModelSelector />, { wrapper: createWrapper() })

    await waitFor(() => {
      // Should call with the 3 hardcoded models
      expect(setAvailableModelsSpy).toHaveBeenCalled()
      const calledWith = setAvailableModelsSpy.mock.calls[0][0]
      expect(calledWith).toHaveLength(3)
      expect(calledWith[0].id).toBe('claude-sonnet')
      expect(calledWith[1].id).toBe('gpt-4')
      expect(calledWith[2].id).toBe('gemini-pro')
    })
  })

  it('should display select trigger after loading', async () => {
    const mockModels = { 
      models: [
        { id: 'claude-sonnet', name: 'Claude Sonnet', provider: 'anthropic', description: 'Fast AI' }
      ] 
    }
    vi.mocked(apiClient.getModels).mockResolvedValueOnce(mockModels)

    render(<ModelSelector />, { wrapper: createWrapper() })
    
    await waitFor(() => {
      const trigger = screen.getByRole('combobox')
      expect(trigger).toBeInTheDocument()
    })
  })
})


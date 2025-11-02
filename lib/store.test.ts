import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useStore } from './store'

describe('useStore', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    // Reset the store state
    useStore.setState({
      selectedModel: 'claude-sonnet',
      apiKeys: {},
      sidebarOpen: true,
      availableModels: [],
    })
  })

  describe('initial state', () => {
    it('should have correct default values', () => {
      const state = useStore.getState()
      
      expect(state.selectedModel).toBe('claude-sonnet')
      expect(state.apiKeys).toEqual({})
      expect(state.sidebarOpen).toBe(true)
      expect(state.availableModels).toEqual([])
    })
  })

  describe('setSelectedModel', () => {
    it('should update selected model', () => {
      const { setSelectedModel } = useStore.getState()
      
      setSelectedModel('gpt-4')
      
      const state = useStore.getState()
      expect(state.selectedModel).toBe('gpt-4')
    })
  })

  describe('setApiKey', () => {
    it('should store API key for provider', () => {
      const { setApiKey } = useStore.getState()
      
      setApiKey('anthropic', 'sk-ant-test123')
      
      const state = useStore.getState()
      expect(state.apiKeys.anthropic).toBe('sk-ant-test123')
    })

    it('should add multiple API keys', () => {
      const { setApiKey } = useStore.getState()
      
      setApiKey('anthropic', 'sk-ant-test')
      setApiKey('openai', 'sk-test')
      
      const state = useStore.getState()
      expect(state.apiKeys.anthropic).toBe('sk-ant-test')
      expect(state.apiKeys.openai).toBe('sk-test')
    })

    it('should update existing API key', () => {
      const { setApiKey } = useStore.getState()
      
      setApiKey('anthropic', 'old-key')
      setApiKey('anthropic', 'new-key')
      
      const state = useStore.getState()
      expect(state.apiKeys.anthropic).toBe('new-key')
    })
  })

  describe('clearApiKeys', () => {
    it('should remove all API keys', () => {
      const { setApiKey, clearApiKeys } = useStore.getState()
      
      setApiKey('anthropic', 'sk-ant-test')
      setApiKey('openai', 'sk-test')
      clearApiKeys()
      
      const state = useStore.getState()
      expect(state.apiKeys).toEqual({})
    })
  })

  describe('toggleSidebar', () => {
    it('should toggle sidebar state', () => {
      const { toggleSidebar } = useStore.getState()
      const initialState = useStore.getState().sidebarOpen
      
      toggleSidebar()
      
      const newState = useStore.getState().sidebarOpen
      expect(newState).toBe(!initialState)
    })

    it('should toggle multiple times', () => {
      const { toggleSidebar } = useStore.getState()
      
      toggleSidebar()
      expect(useStore.getState().sidebarOpen).toBe(false)
      
      toggleSidebar()
      expect(useStore.getState().sidebarOpen).toBe(true)
    })
  })

  describe('setAvailableModels', () => {
    it('should update available models list', () => {
      const { setAvailableModels } = useStore.getState()
      const models = [
        { id: 'claude-sonnet', name: 'Claude Sonnet', provider: 'anthropic' },
        { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
      ]
      
      setAvailableModels(models)
      
      const state = useStore.getState()
      expect(state.availableModels).toEqual(models)
    })

    it('should replace previous models list', () => {
      const { setAvailableModels } = useStore.getState()
      
      setAvailableModels([{ id: 'model-1', name: 'Model 1', provider: 'test' }])
      setAvailableModels([{ id: 'model-2', name: 'Model 2', provider: 'test' }])
      
      const state = useStore.getState()
      expect(state.availableModels).toHaveLength(1)
      expect(state.availableModels[0].id).toBe('model-2')
    })
  })

  describe('persistence', () => {
    it('should persist selected model to localStorage', () => {
      const { setSelectedModel } = useStore.getState()
      
      setSelectedModel('gpt-4')
      
      // Check if localStorage was called
      const stored = localStorage.getItem('mcp-client-storage')
      expect(stored).toBeTruthy()
      
      if (stored) {
        const parsed = JSON.parse(stored)
        expect(parsed.state.selectedModel).toBe('gpt-4')
      }
    })

    it('should persist API keys to localStorage', () => {
      const { setApiKey } = useStore.getState()
      
      setApiKey('anthropic', 'sk-ant-test')
      
      const stored = localStorage.getItem('mcp-client-storage')
      expect(stored).toBeTruthy()
      
      if (stored) {
        const parsed = JSON.parse(stored)
        expect(parsed.state.apiKeys.anthropic).toBe('sk-ant-test')
      }
    })

    it('should persist sidebar state to localStorage', () => {
      const { toggleSidebar } = useStore.getState()
      
      toggleSidebar()
      
      const stored = localStorage.getItem('mcp-client-storage')
      expect(stored).toBeTruthy()
      
      if (stored) {
        const parsed = JSON.parse(stored)
        expect(parsed.state.sidebarOpen).toBe(false)
      }
    })

    it('should not persist availableModels to localStorage', () => {
      const { setAvailableModels } = useStore.getState()
      
      setAvailableModels([{ id: 'test', name: 'Test', provider: 'test' }])
      
      const stored = localStorage.getItem('mcp-client-storage')
      
      if (stored) {
        const parsed = JSON.parse(stored)
        // availableModels should not be in persisted state
        expect(parsed.state.availableModels).toBeUndefined()
      }
    })
  })
})


import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ApiKeys {
  anthropic?: string
  openai?: string
  google?: string
  groq?: string
}

interface Model {
  id: string
  name: string
  provider: string
  description?: string
}

interface AppState {
  // Model selection
  selectedModel: string
  setSelectedModel: (model: string) => void

  // API Keys (persisted to localStorage)
  apiKeys: ApiKeys
  setApiKey: (provider: keyof ApiKeys, key: string) => void
  clearApiKeys: () => void

  // UI State
  sidebarOpen: boolean
  toggleSidebar: () => void

  // Available models (fetched from backend)
  availableModels: Model[]
  setAvailableModels: (models: Model[]) => void
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // Model selection
      selectedModel: 'claude-sonnet',
      setSelectedModel: (model) => set({ selectedModel: model }),

      // API Keys
      apiKeys: {},
      setApiKey: (provider, key) =>
        set((state) => ({
          apiKeys: { ...state.apiKeys, [provider]: key },
        })),
      clearApiKeys: () => set({ apiKeys: {} }),

      // UI State
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      // Available models
      availableModels: [],
      setAvailableModels: (models) => set({ availableModels: models }),
    }),
    {
      name: 'mcp-client-storage', // localStorage key
      partialize: (state) => ({
        // Only persist these fields
        selectedModel: state.selectedModel,
        apiKeys: state.apiKeys,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
)


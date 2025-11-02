import { describe, it, expect, beforeEach, vi } from 'vitest'
import { apiClient, mcpClient } from './mcp-client'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('apiClient (MCP)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the connection state
    mcpClient.disconnect()
  })

  function mockSuccessResponse(result: any) {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result,
      }),
    })
  }

  function mockErrorResponse(error: string) {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        error,
      }),
    })
  }

  describe('getModels', () => {
    it('should return hardcoded models list', async () => {
      const result = await apiClient.getModels()

      expect(result.models).toHaveLength(5) // Now includes Groq models
      expect(result.models[0]).toEqual({
        id: 'claude-sonnet',
        name: 'Claude Sonnet',
        provider: 'anthropic',
        description: 'Fast and intelligent AI model',
      })
      // Verify Groq models are included
      expect(result.models.find(m => m.id === 'groq-llama')).toBeDefined()
      expect(result.models.find(m => m.id === 'groq-mixtral')).toBeDefined()
    })
  })

  describe('getTools', () => {
    it('should fetch MCP tools', async () => {
      // Mock initialize
      mockSuccessResponse({
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'test-server', version: '1.0.0' },
        capabilities: {},
      })
      
      // Mock tools/list
      mockSuccessResponse({
        tools: [
          { name: 'list_facilities', description: 'List all facilities', inputSchema: {} },
        ],
      })
      
      const result = await apiClient.getTools()

      expect(result).toHaveProperty('tools')
      expect(result.tools).toHaveLength(1)
      expect(result.tools[0].name).toBe('list_facilities')
    })
  })

  describe('getResources', () => {
    it('should fetch MCP resources', async () => {
      // Mock initialize
      mockSuccessResponse({
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'test-server', version: '1.0.0' },
        capabilities: {},
      })
      
      // Mock resources/list
      mockSuccessResponse({
        resources: [
          { uri: 'facility://list', name: 'All Facilities', description: 'List of all facilities', mimeType: 'application/json' },
        ],
      })
      
      const result = await apiClient.getResources()

      expect(result).toHaveProperty('resources')
      expect(result.resources).toHaveLength(1)
      expect(result.resources[0].uri).toBe('facility://list')
    })
  })

  describe('readResource', () => {
    it('should read MCP resource by URI', async () => {
      // Mock initialize
      mockSuccessResponse({
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'test-server', version: '1.0.0' },
        capabilities: {},
      })
      
      // Mock resources/read
      mockSuccessResponse({
        contents: [{ uri: 'facility://123', mimeType: 'application/json', text: '{"id": "123"}' }],
      })
      
      const uri = 'facility://123'
      const result = await apiClient.readResource(uri)

      expect(result).toHaveProperty('contents')
      expect(result.contents).toHaveLength(1)
      expect(result.contents[0].uri).toBe('facility://123')
    })
  })

  describe('callTool', () => {
    it('should execute MCP tool with arguments', async () => {
      // Mock initialize
      mockSuccessResponse({
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'test-server', version: '1.0.0' },
        capabilities: {},
      })
      
      // Mock tools/call
      mockSuccessResponse({
        content: [{ type: 'text', text: 'Tool executed successfully' }],
      })
      
      const toolName = 'list_facilities'
      const args = { location: 'Amsterdam' }
      
      const result = await apiClient.callTool(toolName, args)

      expect(result).toHaveProperty('message', 'Success')
      expect(result).toHaveProperty('tools')
      expect(result).toHaveProperty('result')
      expect(result.tools).toContain(toolName)
    })
  })

  describe('streamChat', () => {
    it('should throw error as chat is not supported via MCP directly', async () => {
      await expect(
        apiClient.streamChat([], 'claude-sonnet', 'sk-test')
      ).rejects.toThrow('Chat should use MCP prompts or external AI SDK')
    })
  })

  describe('MCPClient initialization', () => {
    it('should initialize once and reuse connection', async () => {
      // Mock initialize
      mockSuccessResponse({
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'test-server', version: '1.0.0' },
        capabilities: {},
      })
      
      // Mock first tools/list
      mockSuccessResponse({ tools: [] })
      
      // Mock second tools/list (no initialize should be called)
      mockSuccessResponse({ tools: [] })
      
      await apiClient.getTools()
      await apiClient.getTools()

      // Initialize should only be called once, plus two tools/list calls = 3 total
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('error handling', () => {
    it('should handle MCP error responses', async () => {
      // Mock initialize
      mockSuccessResponse({
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'test-server', version: '1.0.0' },
        capabilities: {},
      })
      
      // Mock error response
      mockErrorResponse('Unknown resource URI')
      
      await expect(
        apiClient.readResource('invalid://uri')
      ).rejects.toThrow('Unknown resource URI')
    })

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: 'Internal server error',
        }),
      })
      
      await expect(
        apiClient.getTools()
      ).rejects.toThrow('Internal server error')
    })
  })
})

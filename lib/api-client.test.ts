import { describe, it, expect, beforeEach, vi } from 'vitest'
import axios from 'axios'
import { apiClient } from './api-client'

vi.mock('axios')

const mockedAxios = axios as any

describe('apiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getModels', () => {
    it('should fetch models from the correct endpoint', async () => {
      const mockModels = {
        models: [
          { id: 'claude-sonnet', name: 'Claude Sonnet', provider: 'anthropic' },
        ],
      }
      mockedAxios.get.mockResolvedValueOnce({ data: mockModels })

      const result = await apiClient.getModels()

      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:3000/api/models')
      expect(result).toEqual(mockModels)
    })

    it('should handle errors when fetching models', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'))

      await expect(apiClient.getModels()).rejects.toThrow('Network error')
    })
  })

  describe('getTools', () => {
    it('should fetch MCP tools from the correct endpoint', async () => {
      const mockTools = {
        tools: [
          { name: 'list_facilities', description: 'List all facilities' },
        ],
      }
      mockedAxios.get.mockResolvedValueOnce({ data: mockTools })

      const result = await apiClient.getTools()

      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:3000/mcp/tools')
      expect(result).toEqual(mockTools)
    })
  })

  describe('getResources', () => {
    it('should fetch MCP resources from the correct endpoint', async () => {
      const mockResources = {
        resources: [
          { uri: 'facility://1', name: 'Facility 1' },
        ],
      }
      mockedAxios.get.mockResolvedValueOnce({ data: mockResources })

      const result = await apiClient.getResources()

      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:3000/mcp/resources')
      expect(result).toEqual(mockResources)
    })
  })

  describe('readResource', () => {
    it('should post URI and return resource data', async () => {
      const uri = 'facility://123'
      const mockData = { contents: [{ text: 'Facility data' }] }
      mockedAxios.post.mockResolvedValueOnce({ data: mockData })

      const result = await apiClient.readResource(uri)

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/resource/read',
        { uri }
      )
      expect(result).toEqual(mockData)
    })
  })

  describe('callTool', () => {
    it('should execute tool with arguments', async () => {
      const toolName = 'list_facilities'
      const args = { location: 'Amsterdam' }
      const mockResult = { 
        message: 'Success', 
        tools: [toolName],
        result: { facilities: [] }
      }
      mockedAxios.post.mockResolvedValueOnce({ data: mockResult })

      const result = await apiClient.callTool(toolName, args)

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/tool/call',
        { name: toolName, arguments: args }
      )
      expect(result).toEqual(mockResult)
    })

    it('should handle tool execution errors', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Tool not found'))

      await expect(
        apiClient.callTool('invalid_tool', {})
      ).rejects.toThrow('Tool not found')
    })
  })

  describe('streamChat', () => {
    it('should return response body for streaming', async () => {
      const messages = [{ role: 'user', content: 'Hello' }]
      const modelId = 'claude-sonnet'
      const apiKey = 'sk-ant-test'
      const mockBody = new ReadableStream()
      
      mockedAxios.post.mockResolvedValueOnce({ 
        data: mockBody,
        headers: {},
        status: 200,
        statusText: 'OK'
      })

      const result = await apiClient.streamChat(messages, modelId, apiKey)

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/chat',
        { messages, modelId, apiKey },
        { responseType: 'stream' }
      )
      expect(result).toBe(mockBody)
    })
  })
})


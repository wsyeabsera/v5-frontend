'use client'

import { Model, MCPTool, MCPResource } from '@/types'

// Use Next.js API route as proxy to MCP server
const MCP_API_URL = '/api/mcp'

// HTTP JSON-RPC client for MCP
class MCPClient {
  private url: string
  private initialized = false

  constructor(url: string) {
    this.url = url
  }

  private async request(method: string, params: any = {}) {
    console.log(`[MCP] Request: ${method}`, params)
    
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method,
        params,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log(`[MCP] Response: ${method}`, data)

    if (data.error) {
      throw new Error(data.error || 'MCP request failed')
    }

    return data.result
  }

  async connect() {
    if (this.initialized) return
    
    const result = await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'v5-clear-ai-frontend',
        version: '1.0.0',
      },
    })
    
    this.initialized = true
    console.log('[MCP] Initialized:', result)
    return result
  }

  async ensureConnected() {
    if (!this.initialized) {
      await this.connect()
    }
  }

  async listTools() {
    await this.ensureConnected()
    const result = await this.request('tools/list')
    return {
      tools: result.tools || [],
    }
  }

  async callTool(name: string, args: any) {
    await this.ensureConnected()
    const result = await this.request('tools/call', { name, arguments: args })
    return {
      message: 'Success',
      tools: [name],
      result: result.content || result,
    }
  }

  async listResources() {
    await this.ensureConnected()
    const result = await this.request('resources/list')
    return {
      resources: result.resources || [],
    }
  }

  async readResource(uri: string) {
    await this.ensureConnected()
    const result = await this.request('resources/read', { uri })
    return {
      contents: result.contents || result,
    }
  }

  async listPrompts() {
    await this.ensureConnected()
    const result = await this.request('prompts/list')
    return {
      prompts: result.prompts || [],
    }
  }

  async getPrompt(name: string, args: any = {}) {
    await this.ensureConnected()
    return this.request('prompts/get', { name, arguments: args })
  }

  isConnected() {
    return this.initialized
  }

  disconnect() {
    this.initialized = false
    console.log('[MCP] Disconnected')
  }
}

// Singleton instance
const mcpClient = new MCPClient(MCP_API_URL)

export { mcpClient }

// For backwards compatibility with existing api-client interface
export const apiClient = {
  async getModels() {
    // Models are hardcoded for now since MCP doesn't have a getModels endpoint
    return {
      models: [
        {
          id: 'claude-sonnet',
          name: 'Claude Sonnet',
          provider: 'anthropic',
          description: 'Fast and intelligent AI model',
        },
        {
          id: 'gpt-4',
          name: 'GPT-4',
          provider: 'openai',
          description: 'Powerful language model',
        },
        {
          id: 'gemini-pro',
          name: 'Gemini Pro',
          provider: 'google',
          description: 'Google\'s advanced AI',
        },
        {
          id: 'groq-llama',
          name: 'Llama 3.3 70B (Groq)',
          provider: 'groq',
          description: 'Lightning-fast inference with Groq',
        },
        {
          id: 'groq-mixtral',
          name: 'Mixtral 8x7B (Groq)',
          provider: 'groq',
          description: 'High-performance mixture of experts',
        },
      ],
    }
  },

  async getTools() {
    return mcpClient.listTools()
  },

  async getResources() {
    return mcpClient.listResources()
  },

  async readResource(uri: string) {
    return mcpClient.readResource(uri)
  },

  async callTool(name: string, args: any) {
    return mcpClient.callTool(name, args)
  },

  // For chat, we'll keep this as a placeholder
  // The actual implementation will depend on how the MCP server handles chat
  async streamChat(messages: any[], modelId: string, apiKey: string) {
    throw new Error('Chat should use MCP prompts or external AI SDK')
  },
}

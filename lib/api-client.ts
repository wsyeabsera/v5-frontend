import axios from 'axios'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'

export const apiClient = {
  // Models
  async getModels() {
    const response = await axios.get(`${BACKEND_URL}/api/models`)
    return response.data
  },

  // MCP Tools
  async getTools() {
    const response = await axios.get(`${BACKEND_URL}/mcp/tools`)
    return response.data
  },

  // MCP Resources
  async getResources() {
    const response = await axios.get(`${BACKEND_URL}/mcp/resources`)
    return response.data
  },

  // Read Resource
  async readResource(uri: string) {
    const response = await axios.post(`${BACKEND_URL}/api/resource/read`, { uri })
    return response.data
  },

  // Call Tool
  async callTool(name: string, args: any) {
    const response = await axios.post(`${BACKEND_URL}/api/tool/call`, {
      name,
      arguments: args,
    })
    return response.data
  },

  // Chat (streaming)
  async streamChat(messages: any[], modelId: string, apiKey: string) {
    const response = await axios.post(
      `${BACKEND_URL}/api/chat`,
      { messages, modelId, apiKey },
      { responseType: 'stream' }
    )
    return response.data
  },
}


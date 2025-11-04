/**
 * API Client for Agents MCP Server
 * Handles JSON-RPC 2.0 requests and responses
 */

class MCPClient {
  constructor(baseUrl = 'http://localhost:3000/sse') {
    this.baseUrl = baseUrl;
    this.requestId = 0;
  }

  /**
   * Generate a unique request ID
   */
  generateId() {
    return `req_${Date.now()}_${++this.requestId}`;
  }

  /**
   * Make a JSON-RPC 2.0 request
   */
  async request(method, params = {}) {
    const id = this.generateId();

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'Unknown error');
    }

    return data.result;
  }

  /**
   * Initialize the MCP connection
   */
  async initialize() {
    return await this.request('initialize', {});
  }

  /**
   * List all available tools
   */
  async listTools() {
    const result = await this.request('tools/list', {});
    return result.tools || [];
  }

  /**
   * Call a tool
   */
  async callTool(toolName, arguments = {}) {
    const result = await this.request('tools/call', {
      name: toolName,
      arguments,
    });

    // Check for errors in result
    if (result.isError) {
      const errorText = result.content[0]?.text || 'Unknown error';
      throw new Error(errorText);
    }

    // Parse the JSON response
    const textContent = result.content[0]?.text;
    if (!textContent) {
      throw new Error('No content in response');
    }

    try {
      return JSON.parse(textContent);
    } catch (error) {
      // If not JSON, return as string
      return textContent;
    }
  }

  /**
   * Validate tool parameters
   */
  async validateTool(toolName, arguments = {}, context = {}) {
    return await this.request('tools/validate', {
      name: toolName,
      arguments,
      context,
    });
  }
}

/**
 * Tool Management Service
 */
class ToolService extends MCPClient {
  async listTools(source = null) {
    const params = source ? { source } : {};
    return await this.callTool('list_tools', params);
  }

  async getTool(name) {
    return await this.callTool('get_tool', { name });
  }

  async createTool(toolData) {
    return await this.callTool('add_tool', toolData);
  }

  async updateTool(name, updates) {
    return await this.callTool('update_tool', {
      name,
      ...updates,
    });
  }

  async deleteTool(name) {
    return await this.callTool('remove_tool', { name });
  }
}

/**
 * Model Management Service
 */
class ModelService extends MCPClient {
  async listModels(provider = null) {
    const params = provider ? { provider } : {};
    return await this.callTool('list_available_models', params);
  }

  async getModel(id) {
    return await this.callTool('get_available_model', { id });
  }

  async createModel(provider, modelName) {
    return await this.callTool('add_available_model', {
      provider,
      modelName,
    });
  }

  async updateModel(id, updates) {
    return await this.callTool('update_available_model', {
      id,
      ...updates,
    });
  }

  async deleteModel(id) {
    return await this.callTool('remove_available_model', { id });
  }
}

/**
 * Agent Config Service
 */
class AgentConfigService extends MCPClient {
  async listConfigs(isEnabled = null) {
    const params = isEnabled !== null ? { isEnabled } : {};
    return await this.callTool('list_agent_configs', params);
  }

  async getConfig(id) {
    return await this.callTool('get_agent_config', { id });
  }

  async createConfig(availableModelId, apiKey, maxTokenCount, isEnabled = true) {
    return await this.callTool('add_agent_config', {
      availableModelId,
      apiKey,
      maxTokenCount,
      isEnabled,
    });
  }

  async updateConfig(id, updates) {
    return await this.callTool('update_agent_config', {
      id,
      ...updates,
    });
  }

  async deleteConfig(id) {
    return await this.callTool('remove_agent_config', { id });
  }
}

/**
 * Tool Execution Service
 */
class ToolExecutionService extends MCPClient {
  async executeTool(toolName, arguments = {}) {
    return await this.callTool('execute_mcp_tool', {
      toolName,
      arguments,
    });
  }
}

/**
 * Search Service
 */
class SearchService extends MCPClient {
  async searchTools(query, topK = 3) {
    try {
      return await this.callTool('get_tool_for_user_prompt', {
        userPrompt: query,
        topK,
      });
    } catch (error) {
      if (error.message.includes('Pinecone')) {
        throw new Error('Semantic search is not configured. Please set up Pinecone.');
      }
      throw error;
    }
  }

  async searchPrompts(query, topK = 3) {
    try {
      return await this.callTool('get_prompt_for_user_prompt', {
        userPrompt: query,
        topK,
      });
    } catch (error) {
      if (error.message.includes('Pinecone')) {
        throw new Error('Semantic search is not configured. Please set up Pinecone.');
      }
      throw error;
    }
  }
}

/**
 * Initialization Service
 */
class InitializationService extends MCPClient {
  async initTools(force = false, source = 'remote') {
    return await this.callTool('init_tools', {
      force,
      source,
    });
  }

  async initPrompts(force = false, source = 'remote') {
    return await this.callTool('init_prompts', {
      force,
      source,
    });
  }

  async syncAll(force = false) {
    const [toolsResult, promptsResult] = await Promise.all([
      this.initTools(force),
      this.initPrompts(force),
    ]);

    return {
      tools: toolsResult,
      prompts: promptsResult,
    };
  }
}

// Export services
export {
  MCPClient,
  ToolService,
  ModelService,
  AgentConfigService,
  ToolExecutionService,
  SearchService,
  InitializationService,
};

// Example usage:
/*
const client = new MCPClient();
const tools = await client.listTools();

const toolService = new ToolService();
const allTools = await toolService.listTools();

const modelService = new ModelService();
const models = await modelService.listModels('openai');

const configService = new AgentConfigService();
const configs = await configService.listConfigs(true); // Only enabled

const execService = new ToolExecutionService();
const result = await execService.executeTool('create_facility', {
  name: 'Facility A',
  shortCode: 'FAC-A',
  location: 'New York'
});

const searchService = new SearchService();
const results = await searchService.searchTools('create a new facility');
*/


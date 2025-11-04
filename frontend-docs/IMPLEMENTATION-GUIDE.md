# Implementation Guide

Step-by-step guide for building frontend pages to interact with the Agents MCP Server.

## Step 1: Set Up API Client

First, create an API client to handle JSON-RPC 2.0 requests.

See [API Client Example](./examples/api-client.js) for a complete implementation.

```javascript
async function callTool(toolName, arguments = {}) {
  const response = await fetch('http://localhost:3000/sse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: generateId(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: arguments,
      },
    }),
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message);
  }

  if (data.result.isError) {
    const errorText = JSON.parse(data.result.content[0].text);
    throw new Error(errorText);
  }

  return JSON.parse(data.result.content[0].text);
}
```

## Step 2: Build Tool Management Page

### List Tools

```javascript
async function loadTools() {
  const tools = await callTool('list_tools', {});
  return tools;
}
```

### Create Tool Form

```javascript
async function createTool(formData) {
  const tool = await callTool('add_tool', {
    name: formData.name,
    description: formData.description,
    inputSchema: formData.inputSchema,
    source: formData.source || 'local',
    operationType: formData.operationType,
    entityType: formData.entityType,
  });
  return tool;
}
```

### Update Tool

```javascript
async function updateTool(toolName, updates) {
  const tool = await callTool('update_tool', {
    name: toolName,
    ...updates,
  });
  return tool;
}
```

### Delete Tool

```javascript
async function deleteTool(toolName) {
  const result = await callTool('remove_tool', {
    name: toolName,
  });
  return result;
}
```

## Step 3: Build Model Management Page

### List Available Models

```javascript
async function loadModels(provider = null) {
  const params = provider ? { provider } : {};
  const models = await callTool('list_available_models', params);
  return models;
}
```

### Create Model

```javascript
async function createModel(provider, modelName) {
  const model = await callTool('add_available_model', {
    provider,
    modelName,
  });
  return model;
}
```

## Step 4: Build Agent Config Page

### List Agent Configs

```javascript
async function loadAgentConfigs(isEnabled = null) {
  const params = isEnabled !== null ? { isEnabled } : {};
  const configs = await callTool('list_agent_configs', params);
  return configs;
}
```

### Create Agent Config

```javascript
async function createAgentConfig(availableModelId, apiKey, maxTokenCount, isEnabled = true) {
  const config = await callTool('add_agent_config', {
    availableModelId,
    apiKey,
    maxTokenCount,
    isEnabled,
  });
  return config;
}
```

## Step 5: Build Tool Execution Page

### Execute Remote Tool

```javascript
async function executeRemoteTool(toolName, arguments = {}) {
  const result = await callTool('execute_mcp_tool', {
    toolName,
    arguments,
  });
  return result;
}
```

### List Available Remote Tools

First, get all tools from the remote server:

```javascript
async function getRemoteTools() {
  const response = await fetch('http://localhost:3000/sse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: generateId(),
      method: 'tools/list',
      params: {},
    }),
  });

  const data = await response.json();
  return data.result.tools;
}
```

## Step 6: Build Search & Discovery Page

### Search for Tools

```javascript
async function searchTools(query, topK = 3) {
  const results = await callTool('get_tool_for_user_prompt', {
    userPrompt: query,
    topK,
  });
  return results;
}
```

### Search for Prompts

```javascript
async function searchPrompts(query, topK = 3) {
  const results = await callTool('get_prompt_for_user_prompt', {
    userPrompt: query,
    topK,
  });
  return results;
}
```

## Step 7: Error Handling

Implement proper error handling:

```javascript
async function callToolWithErrorHandling(toolName, arguments = {}) {
  try {
    return await callTool(toolName, arguments);
  } catch (error) {
    if (error.message.includes('duplicate key')) {
      // Handle duplicate error
      showError('This item already exists');
    } else if (error.message.includes('not found')) {
      // Handle not found error
      showError('Item not found');
    } else {
      // Handle generic error
      showError(`Error: ${error.message}`);
    }
    throw error;
  }
}
```

See [Error Handling Documentation](./examples/error-handling.md) for more patterns.

## Step 8: React Components

See [React Components Documentation](./examples/react-components.md) for complete component examples.

## Best Practices

1. **Always validate input** before calling tools
2. **Handle errors gracefully** with user-friendly messages
3. **Use loading states** for async operations
4. **Cache results** when appropriate to reduce API calls
5. **Implement retry logic** for network failures
6. **Validate tool schemas** before execution using `tools/validate`

## Next Steps

- Review [API Reference](./API-REFERENCE.md) for complete API details
- Check [Tool Categories](./TOOL-CATEGORIES.md) for all available tools
- Explore [Examples](./examples/) for code samples


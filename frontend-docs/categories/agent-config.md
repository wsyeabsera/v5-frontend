# Agent Config Management

Tools for managing agent configurations (API keys, token limits, enabled status).

## Overview

Agent configurations link available models with API credentials and settings. Each configuration references an `availableModelId` from the AvailableModel collection.

## Available Tools

### `add_agent_config`

Add a new agent config to the database.

**Arguments:**
- `availableModelId` (string, required) - Available model ID (must exist)
- `apiKey` (string, required) - API key for the model
- `maxTokenCount` (number, required) - Maximum token count
- `isEnabled` (boolean, optional) - Whether the config is enabled (default: true)

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "add_agent_config",
    "arguments": {
      "availableModelId": "690a49f848d59bdd77ab9b24",
      "apiKey": "sk-...",
      "maxTokenCount": 4096,
      "isEnabled": true
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"_id\": \"690a49fc48d59bdd77ab9b2e\",\n  \"availableModelId\": \"690a49f848d59bdd77ab9b24\",\n  \"apiKey\": \"sk-...\",\n  \"maxTokenCount\": 4096,\n  \"isEnabled\": true,\n  \"createdAt\": \"2025-11-04T18:46:20.953Z\",\n  \"updatedAt\": \"2025-11-04T18:46:20.953Z\",\n  \"__v\": 0\n}"
      }
    ]
  }
}
```

**Error Response (Invalid Model ID):**
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Available model not found: invalid-id"
      }
    ],
    "isError": true
  }
}
```

### `get_agent_config`

Get an agent config by ID.

**Arguments:**
- `id` (string, required) - Agent config ID

**Example:**
```javascript
const config = await callTool('get_agent_config', {
  id: '690a49fc48d59bdd77ab9b2e'
});
```

### `list_agent_configs`

List all agent configs with optional filters.

**Arguments:**
- `isEnabled` (boolean, optional) - Filter by enabled status

**Example:**
```javascript
// List all configs
const allConfigs = await callTool('list_agent_configs', {});

// List only enabled configs
const enabledConfigs = await callTool('list_agent_configs', {
  isEnabled: true
});

// List only disabled configs
const disabledConfigs = await callTool('list_agent_configs', {
  isEnabled: false
});
```

### `update_agent_config`

Update an agent config.

**Arguments:**
- `id` (string, required) - Agent config ID
- `availableModelId` (string, optional) - Available model ID (validated if provided)
- `apiKey` (string, optional) - API key
- `maxTokenCount` (number, optional) - Maximum token count
- `isEnabled` (boolean, optional) - Whether the config is enabled

**Example:**
```javascript
const updatedConfig = await callTool('update_agent_config', {
  id: '690a49fc48d59bdd77ab9b2e',
  maxTokenCount: 8192,
  isEnabled: false
});
```

### `remove_agent_config`

Remove an agent config from database.

**Arguments:**
- `id` (string, required) - Agent config ID

**Example:**
```javascript
const result = await callTool('remove_agent_config', {
  id: '690a49fc48d59bdd77ab9b2e'
});
```

## Frontend Implementation Example

```javascript
// Agent Config Service
class AgentConfigService {
  async listConfigs(isEnabled = null) {
    const params = isEnabled !== null ? { isEnabled } : {};
    return await callTool('list_agent_configs', params);
  }

  async getConfig(id) {
    return await callTool('get_agent_config', { id });
  }

  async createConfig(availableModelId, apiKey, maxTokenCount, isEnabled = true) {
    return await callTool('add_agent_config', {
      availableModelId,
      apiKey,
      maxTokenCount,
      isEnabled,
    });
  }

  async updateConfig(id, updates) {
    return await callTool('update_agent_config', {
      id,
      ...updates,
    });
  }

  async deleteConfig(id) {
    return await callTool('remove_agent_config', { id });
  }
}
```

## React Component Example

```jsx
function AgentConfigManagement() {
  const [configs, setConfigs] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [maxTokens, setMaxTokens] = useState(4096);
  const [loading, setLoading] = useState(false);

  const configService = new AgentConfigService();
  const modelService = new ModelService();

  useEffect(() => {
    loadConfigs();
    loadModels();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const data = await configService.listConfigs();
      setConfigs(data);
    } catch (error) {
      console.error('Error loading configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadModels = async () => {
    try {
      const data = await modelService.listModels();
      setModels(data);
    } catch (error) {
      console.error('Error loading models:', error);
    }
  };

  const handleCreate = async () => {
    if (!selectedModelId || !apiKey) return;
    
    try {
      await configService.createConfig(selectedModelId, apiKey, maxTokens);
      setSelectedModelId('');
      setApiKey('');
      setMaxTokens(4096);
      loadConfigs();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleToggleEnabled = async (config) => {
    try {
      await configService.updateConfig(config._id, {
        isEnabled: !config.isEnabled,
      });
      loadConfigs();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div>
      <h2>Agent Configurations</h2>
      
      <div>
        <select
          value={selectedModelId}
          onChange={(e) => setSelectedModelId(e.target.value)}
        >
          <option value="">Select a model</option>
          {models.map((model) => (
            <option key={model._id} value={model._id}>
              {model.provider} - {model.modelName}
            </option>
          ))}
        </select>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="API Key"
        />
        <input
          type="number"
          value={maxTokens}
          onChange={(e) => setMaxTokens(parseInt(e.target.value))}
          placeholder="Max Tokens"
        />
        <button onClick={handleCreate}>Create Config</button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Model</th>
              <th>Max Tokens</th>
              <th>Enabled</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {configs.map((config) => (
              <tr key={config._id}>
                <td>{config.availableModelId}</td>
                <td>{config.maxTokenCount}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={config.isEnabled}
                    onChange={() => handleToggleEnabled(config)}
                  />
                </td>
                <td>
                  <button onClick={() => configService.deleteConfig(config._id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

## Common Use Cases

1. **Agent Configuration Management** - Create and manage agent configurations
2. **API Key Management** - Securely store and manage API keys
3. **Model Selection** - Link configurations to available models
4. **Configuration Toggle** - Enable/disable configurations without deleting

## Security Considerations

- **API Keys**: Store API keys securely. Consider encrypting them before storing.
- **Access Control**: Implement proper authentication and authorization.
- **Validation**: Always validate `availableModelId` exists before creating configs.


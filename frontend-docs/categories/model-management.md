# Model Management

Tools for managing available AI models (provider + model name).

## Available Tools

### `add_available_model`

Add a new available model to the database.

**Arguments:**
- `provider` (string, required) - Provider name (e.g., "openai", "anthropic")
- `modelName` (string, required) - Model name (e.g., "gpt-4", "claude-3-opus")

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "add_available_model",
    "arguments": {
      "provider": "openai",
      "modelName": "gpt-4"
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
        "text": "{\n  \"_id\": \"690a49f848d59bdd77ab9b24\",\n  \"provider\": \"openai\",\n  \"modelName\": \"gpt-4\",\n  \"createdAt\": \"2025-11-04T18:46:16.777Z\",\n  \"updatedAt\": \"2025-11-04T18:46:16.777Z\",\n  \"__v\": 0\n}"
      }
    ]
  }
}
```

**Note:** The combination of `provider` + `modelName` must be unique. Attempting to add a duplicate will result in an error.

### `get_available_model`

Get an available model by ID.

**Arguments:**
- `id` (string, required) - Available model ID

**Example:**
```javascript
const model = await callTool('get_available_model', {
  id: '690a49f848d59bdd77ab9b24'
});
```

### `list_available_models`

List all available models with optional filters.

**Arguments:**
- `provider` (string, optional) - Filter by provider

**Example:**
```javascript
// List all models
const allModels = await callTool('list_available_models', {});

// List models by provider
const openaiModels = await callTool('list_available_models', {
  provider: 'openai'
});
```

### `update_available_model`

Update an available model.

**Arguments:**
- `id` (string, required) - Available model ID
- `provider` (string, optional) - Provider name
- `modelName` (string, optional) - Model name

**Example:**
```javascript
const updatedModel = await callTool('update_available_model', {
  id: '690a49f848d59bdd77ab9b24',
  modelName: 'gpt-4-turbo'
});
```

### `remove_available_model`

Remove an available model from database.

**Arguments:**
- `id` (string, required) - Available model ID

**Example:**
```javascript
const result = await callTool('remove_available_model', {
  id: '690a49f848d59bdd77ab9b24'
});
```

## Frontend Implementation Example

```javascript
// Model Management Service
class ModelService {
  async listModels(provider = null) {
    const params = provider ? { provider } : {};
    return await callTool('list_available_models', params);
  }

  async getModel(id) {
    return await callTool('get_available_model', { id });
  }

  async createModel(provider, modelName) {
    return await callTool('add_available_model', {
      provider,
      modelName,
    });
  }

  async updateModel(id, updates) {
    return await callTool('update_available_model', {
      id,
      ...updates,
    });
  }

  async deleteModel(id) {
    return await callTool('remove_available_model', { id });
  }
}
```

## React Component Example

```jsx
function ModelManagement() {
  const [models, setModels] = useState([]);
  const [provider, setProvider] = useState('');
  const [modelName, setModelName] = useState('');
  const [loading, setLoading] = useState(false);

  const service = new ModelService();

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    setLoading(true);
    try {
      const data = await service.listModels();
      setModels(data);
    } catch (error) {
      console.error('Error loading models:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!provider || !modelName) return;
    
    try {
      await service.createModel(provider, modelName);
      setProvider('');
      setModelName('');
      loadModels();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div>
      <h2>Available Models</h2>
      
      <div>
        <input
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          placeholder="Provider (e.g., openai)"
        />
        <input
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          placeholder="Model name (e.g., gpt-4)"
        />
        <button onClick={handleCreate}>Add Model</button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>Model Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {models.map((model) => (
              <tr key={model._id}>
                <td>{model.provider}</td>
                <td>{model.modelName}</td>
                <td>
                  <button onClick={() => service.deleteModel(model._id)}>
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

1. **Model Registry** - Maintain a list of available AI models
2. **Model Selection** - Select models for agent configurations
3. **Provider Management** - Organize models by provider
4. **Model Discovery** - Browse available models for use in agents


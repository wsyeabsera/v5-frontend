# Initialization

Tools for initializing the database with tools and prompts from remote server.

## Available Tools

### `init_tools`

Initialize database by fetching tools from remote MCP server and seeding local database.

**Arguments:**
- `force` (boolean, optional) - If true, update existing tools; if false, skip duplicates (default: false)
- `source` (string, optional) - Source to set for seeded tools: "remote" or "local" (default: "remote")

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "init_tools",
    "arguments": {
      "force": false,
      "source": "remote"
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
        "text": "{\n  \"message\": \"Tools initialized successfully\",\n  \"added\": 25,\n  \"skipped\": 0,\n  \"updated\": 0,\n  \"total\": 25\n}"
      }
    ]
  }
}
```

### `init_prompts`

Initialize database by fetching prompts from remote MCP server and seeding local database.

**Arguments:**
- `force` (boolean, optional) - If true, update existing prompts; if false, skip duplicates (default: false)
- `source` (string, optional) - Source to set for seeded prompts: "remote" or "local" (default: "remote")

**Example:**
```javascript
// Initialize prompts without updating existing ones
const result = await callTool('init_prompts', {
  force: false,
  source: 'remote'
});

// Force update all prompts
const result = await callTool('init_prompts', {
  force: true,
  source: 'remote'
});
```

## Frontend Implementation Example

```javascript
// Initialization Service
class InitializationService {
  async initTools(force = false, source = 'remote') {
    return await callTool('init_tools', {
      force,
      source,
    });
  }

  async initPrompts(force = false, source = 'remote') {
    return await callTool('init_prompts', {
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
```

## React Component Example

```jsx
function Initialization() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [force, setForce] = useState(false);

  const initService = new InitializationService();

  const handleInitTools = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await initService.initTools(force);
      setResult({ type: 'tools', data });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInitPrompts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await initService.initPrompts(force);
      setResult({ type: 'prompts', data });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await initService.syncAll(force);
      setResult({ type: 'all', data });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Initialize Database</h2>
      
      <div>
        <label>
          <input
            type="checkbox"
            checked={force}
            onChange={(e) => setForce(e.target.checked)}
          />
          Force update existing items
        </label>
      </div>

      <div>
        <button onClick={handleInitTools} disabled={loading}>
          Initialize Tools
        </button>
        <button onClick={handleInitPrompts} disabled={loading}>
          Initialize Prompts
        </button>
        <button onClick={handleSyncAll} disabled={loading}>
          Sync All
        </button>
      </div>

      {loading && <div>Initializing...</div>}
      
      {error && (
        <div className="error">Error: {error}</div>
      )}

      {result && (
        <div>
          <h3>Result</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

## Common Use Cases

1. **Initial Setup** - Populate database with tools and prompts from remote server
2. **Sync Operations** - Keep local database in sync with remote server
3. **Bulk Updates** - Update all tools/prompts when remote server changes
4. **Migration** - Migrate tools and prompts from remote to local

## Notes

- **Force Mode**: When `force: true`, existing items will be updated. When `force: false`, duplicates will be skipped.
- **Remote Server**: The remote MCP server URL is configured in the server's environment variables.
- **Indexing**: After initialization, tools and prompts should be indexed in Pinecone for semantic search to work.


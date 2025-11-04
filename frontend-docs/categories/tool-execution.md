# Tool Execution

Tools for executing remote MCP tools.

## Available Tools

### `execute_mcp_tool`

Execute a tool on the remote MCP server.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "execute_mcp_tool",
    "arguments": {
      "toolName": "create_facility",
      "arguments": {
        "name": "Facility A",
        "shortCode": "FAC-A",
        "location": "New York"
      }
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
        "text": "{\n  \"_id\": \"...\",\n  \"name\": \"Facility A\",\n  \"shortCode\": \"FAC-A\",\n  \"location\": \"New York\",\n  \"createdAt\": \"2025-11-04T...\",\n  \"updatedAt\": \"2025-11-04T...\"\n}"
      }
    ]
  }
}
```

## Arguments

- `toolName` (string, required) - Name of the tool to execute on the remote MCP server
- `arguments` (object, optional) - Arguments to pass to the remote tool

## Frontend Implementation Example

```javascript
// Tool Execution Service
class ToolExecutionService {
  async executeTool(toolName, toolArguments = {}) {
    try {
      const result = await callTool('execute_mcp_tool', {
        toolName,
        arguments: toolArguments,
      });
      return result;
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error);
      throw error;
    }
  }

  async listRemoteTools() {
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
}
```

## React Component Example

```jsx
function ToolExecutor() {
  const [toolName, setToolName] = useState('');
  const [arguments, setArguments] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleExecute = async () => {
    setLoading(true);
    setError(null);
    try {
      const service = new ToolExecutionService();
      const result = await service.executeTool(toolName, arguments);
      setResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        value={toolName}
        onChange={(e) => setToolName(e.target.value)}
        placeholder="Tool name"
      />
      <textarea
        value={JSON.stringify(arguments, null, 2)}
        onChange={(e) => {
          try {
            setArguments(JSON.parse(e.target.value));
          } catch {}
        }}
        placeholder="Arguments (JSON)"
      />
      <button onClick={handleExecute} disabled={loading}>
        {loading ? 'Executing...' : 'Execute'}
      </button>
      {error && <div className="error">{error}</div>}
      {result && (
        <pre>{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}
```

## Common Use Cases

1. **Tool Playground** - Interactive tool execution interface
2. **Workflow Builder** - Chain multiple tool executions
3. **Facility Management** - Execute facility CRUD operations
4. **Data Import** - Execute tools to import data from external sources

## Error Handling

When executing remote tools, handle these common errors:

- **Tool not found**: The tool name doesn't exist on the remote server
- **Invalid arguments**: The provided arguments don't match the tool's schema
- **Network errors**: Connection issues with the remote MCP server
- **Remote server errors**: Errors returned from the remote tool execution


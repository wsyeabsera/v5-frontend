# Tool Management

Tools for managing tools stored in the database.

## Available Tools

### `add_tool`

Add a new tool to the database.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "add_tool",
    "arguments": {
      "name": "my_tool",
      "description": "My tool description",
      "inputSchema": {
        "type": "object",
        "properties": {
          "param1": {
            "type": "string",
            "description": "Parameter 1"
          }
        },
        "required": ["param1"]
      },
      "source": "local",
      "operationType": "query",
      "entityType": "other"
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
        "text": "{\n  \"_id\": \"...\",\n  \"name\": \"my_tool\",\n  \"description\": \"My tool description\",\n  \"inputSchema\": {...},\n  \"source\": \"local\",\n  \"operationType\": \"query\",\n  \"entityType\": \"other\",\n  \"createdAt\": \"2025-11-04T...\",\n  \"updatedAt\": \"2025-11-04T...\"\n}"
      }
    ]
  }
}
```

### `get_tool`

Get a tool by name.

**Arguments:**
- `name` (string, required) - Tool name

**Example:**
```javascript
const tool = await callTool('get_tool', {
  name: 'my_tool'
});
```

### `list_tools`

List all tools with optional filters.

**Arguments:**
- `source` (string, optional) - Filter by source: "remote" or "local"

**Example:**
```javascript
// List all tools
const allTools = await callTool('list_tools', {});

// List only local tools
const localTools = await callTool('list_tools', {
  source: 'local'
});

// List only remote tools
const remoteTools = await callTool('list_tools', {
  source: 'remote'
});
```

### `update_tool`

Update a tool.

**Arguments:**
- `name` (string, required) - Tool name
- `description` (string, optional) - Tool description
- `inputSchema` (object, optional) - JSON schema for tool inputs
- `source` (string, optional) - Source of the tool
- `operationType` (string, optional) - Operation type: "query" or "mutation"
- `entityType` (string, optional) - Entity type

**Example:**
```javascript
const updatedTool = await callTool('update_tool', {
  name: 'my_tool',
  description: 'Updated description',
  operationType: 'mutation'
});
```

### `remove_tool`

Remove a tool from database.

**Arguments:**
- `name` (string, required) - Tool name

**Example:**
```javascript
const result = await callTool('remove_tool', {
  name: 'my_tool'
});
```

## Frontend Implementation Example

```javascript
// Tool Management Service
class ToolService {
  async listTools(source = null) {
    const params = source ? { source } : {};
    return await callTool('list_tools', params);
  }

  async getTool(name) {
    return await callTool('get_tool', { name });
  }

  async createTool(toolData) {
    return await callTool('add_tool', toolData);
  }

  async updateTool(name, updates) {
    return await callTool('update_tool', {
      name,
      ...updates,
    });
  }

  async deleteTool(name) {
    return await callTool('remove_tool', { name });
  }
}
```

## Common Use Cases

1. **Tool Library Page** - List all tools with filters
2. **Tool Editor** - Create/edit tool definitions
3. **Tool Inspector** - View tool details and schema
4. **Tool Sync** - Sync tools from remote server using `init_tools`


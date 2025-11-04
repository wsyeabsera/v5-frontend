# API Reference

Complete reference for the Agents MCP Server API.

## Base URL

```
http://localhost:3000/sse
```

For production, replace `localhost:3000` with your server URL.

## Protocol

The server uses **JSON-RPC 2.0** protocol.

## Request Format

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "method": "method_name",
  "params": {
    // Method-specific parameters
  }
}
```

### Required Fields

- `jsonrpc`: Must be `"2.0"`
- `id`: Unique identifier for the request (string or number)
- `method`: The method to call (see Methods below)
- `params`: Method-specific parameters (object)

## Methods

### `initialize`

Initialize the MCP connection.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "initialize",
  "params": {}
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "result": {
    "protocolVersion": "2024-11-05",
    "serverInfo": {
      "name": "agents-mcp-server",
      "version": "1.0.0"
    },
    "capabilities": {
      "tools": {},
      "prompts": {},
      "resources": {
        "subscribe": false,
        "listChanged": false
      },
      "sampling": {}
    }
  }
}
```

### `tools/list`

List all available tools.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "2",
  "method": "tools/list",
  "params": {}
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "2",
  "result": {
    "tools": [
      {
        "name": "add_tool",
        "description": "Add a new tool to the database",
        "inputSchema": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "description": "Tool name"
            },
            "description": {
              "type": "string",
              "description": "Tool description"
            }
          },
          "required": ["name", "description"]
        }
      }
      // ... more tools
    ]
  }
}
```

### `tools/call`

Execute a tool.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "3",
  "method": "tools/call",
  "params": {
    "name": "add_tool",
    "arguments": {
      "name": "my_tool",
      "description": "My tool description",
      "inputSchema": {},
      "source": "local"
    }
  }
}
```

**Response (Success):**
```json
{
  "jsonrpc": "2.0",
  "id": "3",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"_id\": \"...\",\n  \"name\": \"my_tool\",\n  \"description\": \"My tool description\",\n  \"source\": \"local\",\n  \"createdAt\": \"2025-11-04T...\",\n  \"updatedAt\": \"2025-11-04T...\"\n}"
      }
    ]
  }
}
```

**Response (Error):**
```json
{
  "jsonrpc": "2.0",
  "id": "3",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Error adding tool: E11000 duplicate key error..."
      }
    ],
    "isError": true
  }
}
```

### `tools/validate`

Validate tool parameters before execution.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "4",
  "method": "tools/validate",
  "params": {
    "name": "add_tool",
    "arguments": {
      "name": "my_tool",
      "description": "My tool description"
    },
    "context": {}
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "4",
  "result": {
    "toolName": "add_tool",
    "requiredParams": ["name", "description", "inputSchema"],
    "providedParams": ["name", "description"],
    "missingParams": ["inputSchema"],
    "categorization": {
      "resolvable": [],
      "mustAskUser": ["inputSchema"],
      "canInfer": []
    },
    "validation": {
      "isValid": false,
      "invalidParams": []
    },
    "confidence": 0
  }
}
```

## Error Responses

### Invalid Request

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32600,
    "message": "Invalid Request: jsonrpc must be \"2.0\""
  },
  "id": null
}
```

### Method Not Found

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32601,
    "message": "Method not found: unknown_method"
  },
  "id": "1"
}
```

### Invalid Params

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32602,
    "message": "Invalid params"
  },
  "id": "1"
}
```

### Internal Error

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32603,
    "message": "Internal server error",
    "data": "Error details..."
  },
  "id": "1"
}
```

## Health Check

The server also provides a health check endpoint:

```
GET http://localhost:3000/health
```

**Response:**
```json
{
  "status": "healthy",
  "mongodb": "connected",
  "timestamp": "2025-11-04T18:00:00.000Z"
}
```

## Server Info

```
GET http://localhost:3000/
```

**Response:**
```json
{
  "name": "Agents MCP Server",
  "version": "1.0.0",
  "description": "Hybrid MCP Server/Client - Exposes tools for executing remote MCP tools",
  "endpoints": {
    "mcp": "/sse (POST)",
    "health": "/health"
  },
  "tools": 42,
  "remoteServer": "http://localhost:3001"
}
```


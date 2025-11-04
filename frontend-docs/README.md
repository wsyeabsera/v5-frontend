# Frontend Documentation

This documentation provides comprehensive guidance for building frontend pages to interact with the Agents MCP Server.

## Overview

The Agents MCP Server exposes a JSON-RPC 2.0 API endpoint that allows you to manage tools, models, agent configurations, prompts, resources, and execute remote MCP tools. This documentation categorizes all available tools by their purpose and provides implementation examples.

## Quick Start

### Endpoint

All API calls are made to:
```
POST http://localhost:3000/sse
```

### Request Format

The server uses JSON-RPC 2.0 format:

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "method": "tools/list" | "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": {
      "param1": "value1",
      "param2": "value2"
    }
  }
}
```

### Response Format

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "JSON stringified result"
      }
    ],
    "isError": false
  }
}
```

## Documentation Structure

- **[API Reference](./API-REFERENCE.md)** - Complete API reference with JSON-RPC format
- **[Tool Categories](./TOOL-CATEGORIES.md)** - All tools categorized by purpose
- **[Implementation Guide](./IMPLEMENTATION-GUIDE.md)** - Step-by-step guide for building pages

## Tool Categories

### Tool Management
Manage tools stored in the database (CRUD operations)
- See [Tool Management](./categories/tool-management.md)

### Tool Execution
Execute tools on the remote MCP server
- See [Tool Execution](./categories/tool-execution.md)

### Model Management
Manage available AI models (provider + model name)
- See [Model Management](./categories/model-management.md)

### Agent Config Management
Manage agent configurations (API keys, token limits, enabled status)
- See [Agent Config](./categories/agent-config.md)

### Prompt Management
Manage prompts stored in the database
- See [Prompt Management](./categories/prompt-management.md)

### Resource Management
Manage resources (URIs, files, etc.)
- See [Resource Management](./categories/resource-management.md)

### Search & Discovery
Semantic search to find tools and prompts by natural language
- See [Search & Discovery](./categories/search-discovery.md)

### Initialization
Initialize database with tools and prompts from remote server
- See [Initialization](./categories/initialization.md)

## Examples

- [API Client Example](./examples/api-client.js)
- [React Components](./examples/react-components.md)
- [Error Handling](./examples/error-handling.md)

## Getting Started

1. **Read the [API Reference](./API-REFERENCE.md)** to understand the request/response format
2. **Review [Tool Categories](./TOOL-CATEGORIES.md)** to see what tools are available
3. **Follow the [Implementation Guide](./IMPLEMENTATION-GUIDE.md)** to build your first page
4. **Check the Examples** for code snippets and patterns


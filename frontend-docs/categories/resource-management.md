# Resource Management

Tools for managing resources (URIs, files, etc.).

## Available Tools

### `add_resource`

Add a new resource to the database.

**Arguments:**
- `uri` (string, required) - Resource URI (unique)
- `name` (string, required) - Resource name
- `description` (string, optional) - Resource description
- `mimeType` (string, optional) - MIME type of resource
- `source` (string, optional) - Source of the resource: "remote" or "local" (default: "remote")

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "add_resource",
    "arguments": {
      "uri": "https://example.com/resource.txt",
      "name": "Example Resource",
      "description": "An example resource",
      "mimeType": "text/plain",
      "source": "local"
    }
  }
}
```

### `get_resource`

Get a resource by URI.

**Arguments:**
- `uri` (string, required) - Resource URI

**Example:**
```javascript
const resource = await callTool('get_resource', {
  uri: 'https://example.com/resource.txt'
});
```

### `list_resources`

List all resources with optional filters.

**Arguments:**
- `source` (string, optional) - Filter by source: "remote" or "local"

**Example:**
```javascript
// List all resources
const allResources = await callTool('list_resources', {});

// List only local resources
const localResources = await callTool('list_resources', {
  source: 'local'
});
```

### `update_resource`

Update a resource.

**Arguments:**
- `uri` (string, required) - Resource URI
- `name` (string, optional) - Resource name
- `description` (string, optional) - Resource description
- `mimeType` (string, optional) - MIME type of resource
- `source` (string, optional) - Source of the resource

**Example:**
```javascript
const updatedResource = await callTool('update_resource', {
  uri: 'https://example.com/resource.txt',
  description: 'Updated description'
});
```

### `remove_resource`

Remove a resource from database.

**Arguments:**
- `uri` (string, required) - Resource URI

**Example:**
```javascript
const result = await callTool('remove_resource', {
  uri: 'https://example.com/resource.txt'
});
```

## Frontend Implementation Example

```javascript
// Resource Management Service
class ResourceService {
  async listResources(source = null) {
    const params = source ? { source } : {};
    return await callTool('list_resources', params);
  }

  async getResource(uri) {
    return await callTool('get_resource', { uri });
  }

  async createResource(resourceData) {
    return await callTool('add_resource', resourceData);
  }

  async updateResource(uri, updates) {
    return await callTool('update_resource', {
      uri,
      ...updates,
    });
  }

  async deleteResource(uri) {
    return await callTool('remove_resource', { uri });
  }
}
```

## Common Use Cases

1. **Resource Library** - Maintain a library of resources (files, URLs, etc.)
2. **Resource Browser** - Browse and manage resources
3. **Resource Sync** - Sync resources from remote server


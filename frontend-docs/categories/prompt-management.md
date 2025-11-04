# Prompt Management

Tools for managing prompts stored in the database.

## Available Tools

### `add_prompt`

Add a new prompt to the database.

**Arguments:**
- `name` (string, required) - Prompt name
- `description` (string, required) - Prompt description
- `arguments` (array, optional) - Prompt arguments schema
- `source` (string, optional) - Source of the prompt: "remote" or "local" (default: "remote")

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "add_prompt",
    "arguments": {
      "name": "my_prompt",
      "description": "My prompt description",
      "arguments": [
        {
          "name": "topic",
          "description": "The topic to discuss",
          "required": true
        }
      ],
      "source": "local"
    }
  }
}
```

### `get_prompt`

Get a prompt by name.

**Arguments:**
- `name` (string, required) - Prompt name

**Example:**
```javascript
const prompt = await callTool('get_prompt', {
  name: 'my_prompt'
});
```

### `list_prompts`

List all prompts with optional filters.

**Arguments:**
- `source` (string, optional) - Filter by source: "remote" or "local"

**Example:**
```javascript
// List all prompts
const allPrompts = await callTool('list_prompts', {});

// List only local prompts
const localPrompts = await callTool('list_prompts', {
  source: 'local'
});
```

### `update_prompt`

Update a prompt.

**Arguments:**
- `name` (string, required) - Prompt name
- `description` (string, optional) - Prompt description
- `arguments` (array, optional) - Prompt arguments schema
- `source` (string, optional) - Source of the prompt

**Example:**
```javascript
const updatedPrompt = await callTool('update_prompt', {
  name: 'my_prompt',
  description: 'Updated description'
});
```

### `remove_prompt`

Remove a prompt from database.

**Arguments:**
- `name` (string, required) - Prompt name

**Example:**
```javascript
const result = await callTool('remove_prompt', {
  name: 'my_prompt'
});
```

## Frontend Implementation Example

```javascript
// Prompt Management Service
class PromptService {
  async listPrompts(source = null) {
    const params = source ? { source } : {};
    return await callTool('list_prompts', params);
  }

  async getPrompt(name) {
    return await callTool('get_prompt', { name });
  }

  async createPrompt(promptData) {
    return await callTool('add_prompt', promptData);
  }

  async updatePrompt(name, updates) {
    return await callTool('update_prompt', {
      name,
      ...updates,
    });
  }

  async deletePrompt(name) {
    return await callTool('remove_prompt', { name });
  }
}
```

## Common Use Cases

1. **Prompt Library** - Maintain a library of reusable prompts
2. **Prompt Editor** - Create and edit prompt templates
3. **Prompt Sync** - Sync prompts from remote server using `init_prompts`


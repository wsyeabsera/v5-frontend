# API Client & React Query

## File: `lib/api-client.ts` (Complete)

```typescript
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export const apiClient = {
  // Models
  async getModels() {
    const res = await fetch(`${BACKEND_URL}/api/models`);
    if (!res.ok) throw new Error('Failed to fetch models');
    return res.json();
  },

  // MCP Tools
  async getTools() {
    const res = await fetch(`${BACKEND_URL}/mcp/tools`);
    if (!res.ok) throw new Error('Failed to fetch tools');
    return res.json();
  },

  // MCP Resources
  async getResources() {
    const res = await fetch(`${BACKEND_URL}/mcp/resources`);
    if (!res.ok) throw new Error('Failed to fetch resources');
    return res.json();
  },

  // Read Resource
  async readResource(uri: string) {
    const res = await fetch(`${BACKEND_URL}/api/resource/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri }),
    });
    if (!res.ok) throw new Error('Failed to read resource');
    return res.json();
  },

  // Call Tool
  async callTool(name: string, args: any) {
    const res = await fetch(`${BACKEND_URL}/api/tool/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, arguments: args }),
    });
    if (!res.ok) throw new Error('Failed to call tool');
    return res.json();
  },

  // Chat (streaming)
  async streamChat(messages: any[], modelId: string, apiKey: string) {
    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, modelId, apiKey }),
    });

    if (!response.ok) {
      throw new Error('Failed to start chat');
    }

    return response.body;
  },
};
```

## File: `lib/queries.ts` (React Query Hooks)

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from './api-client';

export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: () => apiClient.getModels(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useTools() {
  return useQuery({
    queryKey: ['tools'],
    queryFn: () => apiClient.getTools(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useResources() {
  return useQuery({
    queryKey: ['resources'],
    queryFn: () => apiClient.getResources(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useResource(uri: string) {
  return useQuery({
    queryKey: ['resource', uri],
    queryFn: () => apiClient.readResource(uri),
    enabled: !!uri,
  });
}

export function useCallTool() {
  return useMutation({
    mutationFn: ({ name, args }: { name: string; args: any }) =>
      apiClient.callTool(name, args),
  });
}
```

## Example Usage

```typescript
'use client';

import { useTools, useCallTool } from '@/lib/queries';
import { Button } from '@/components/ui/button';

export function ToolExplorer() {
  const { data: toolsData, isLoading } = useTools();
  const callTool = useCallTool();

  if (isLoading) return <div>Loading tools...</div>;

  return (
    <div>
      {toolsData?.tools.map((tool: any) => (
        <div key={tool.name} className="border p-4 rounded">
          <h3 className="font-semibold">{tool.name}</h3>
          <p className="text-sm text-muted-foreground">{tool.description}</p>
          <Button
            onClick={() => {
              callTool.mutate(
                { name: tool.name, args: {} },
                {
                  onSuccess: (data) => console.log('Tool result:', data),
                }
              );
            }}
          >
            Execute
          </Button>
        </div>
      ))}
    </div>
  );
}
```

## Next Blueprint

Read `06-DEPLOYMENT.md`


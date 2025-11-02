# Chat Interface

## Overview

Build the main chat interface using Vercel AI SDK React hooks.

## File: `lib/api-client.ts`

```typescript
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export const apiClient = {
  // Stream chat messages
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

  // Fetch available models
  async getModels() {
    const res = await fetch(`${BACKEND_URL}/api/models`);
    return res.json();
  },

  // Fetch MCP tools
  async getTools() {
    const res = await fetch(`${BACKEND_URL}/mcp/tools`);
    return res.json();
  },
};
```

## File: `components/chat/ChatInterface.tsx`

```typescript
'use client';

import { useChat } from 'ai/react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useStore } from '@/lib/store';

export function ChatInterface() {
  const { selectedModel, apiKeys } = useStore();

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat`,
    body: {
      modelId: selectedModel,
      apiKey: apiKeys[getProviderForModel(selectedModel)],
    },
  });

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b p-4">
        <h1 className="text-2xl font-bold">Chat</h1>
        <p className="text-sm text-muted-foreground">
          Ask questions about your facilities, shipments, and operations
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <ChatInput
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

function getProviderForModel(modelId: string): 'anthropic' | 'openai' | 'google' {
  if (modelId.startsWith('claude')) return 'anthropic';
  if (modelId.startsWith('gpt')) return 'openai';
  return 'google';
}
```

## File: `components/chat/MessageList.tsx`

```typescript
'use client';

import { Message } from 'ai';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="text-lg">No messages yet</p>
          <p className="text-sm">Start a conversation by typing a message below</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full p-4">
      <div className="space-y-4 max-w-4xl mx-auto">
        {messages.map((message) => (
          <Card
            key={message.id}
            className={`p-4 ${
              message.role === 'user' 
                ? 'bg-primary text-primary-foreground ml-auto max-w-[80%]' 
                : 'bg-muted max-w-[80%]'
            }`}
          >
            <div className="text-sm font-medium mb-1">
              {message.role === 'user' ? 'You' : 'Assistant'}
            </div>
            <div className="whitespace-pre-wrap">{message.content}</div>
            
            {message.toolInvocations && (
              <div className="mt-2 text-xs opacity-70">
                <div>🛠️ Tools used:</div>
                {message.toolInvocations.map((tool: any, i: number) => (
                  <div key={i}>- {tool.toolName}</div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
```

## File: `components/chat/ChatInput.tsx`

```typescript
'use client';

import { FormEvent, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

interface ChatInputProps {
  input: string;
  handleInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

export function ChatInput({ 
  input, 
  handleInputChange, 
  handleSubmit, 
  isLoading 
}: ChatInputProps) {
  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Textarea
        value={input}
        onChange={handleInputChange}
        placeholder="Ask about facilities, shipments, or operations..."
        className="min-h-[60px] resize-none"
        disabled={isLoading}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e as any);
          }
        }}
      />
      <Button type="submit" disabled={isLoading || !input.trim()}>
        <Send className="w-4 h-4" />
      </Button>
    </form>
  );
}
```

## Page: `app/chat/page.tsx`

```typescript
import { ChatInterface } from '@/components/chat/ChatInterface';

export default function ChatPage() {
  return <ChatInterface />;
}
```

## Test

```bash
npm run dev
# Visit http://localhost:3000/chat
```

Should see chat interface!

## Next Blueprint

Read `03-DASHBOARD.md`


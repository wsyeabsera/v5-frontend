# State Management with Zustand

## Overview

Manage global state for model selection, API keys, and preferences.

## File: `lib/store.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ApiKeys {
  anthropic?: string;
  openai?: string;
  google?: string;
}

interface AppState {
  // Model selection
  selectedModel: string;
  setSelectedModel: (model: string) => void;

  // API Keys (persisted to localStorage)
  apiKeys: ApiKeys;
  setApiKey: (provider: keyof ApiKeys, key: string) => void;
  clearApiKeys: () => void;

  // UI State
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  // Available models (fetched from backend)
  availableModels: any[];
  setAvailableModels: (models: any[]) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // Model selection
      selectedModel: 'claude-sonnet',
      setSelectedModel: (model) => set({ selectedModel: model }),

      // API Keys
      apiKeys: {},
      setApiKey: (provider, key) =>
        set((state) => ({
          apiKeys: { ...state.apiKeys, [provider]: key },
        })),
      clearApiKeys: () => set({ apiKeys: {} }),

      // UI State
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      // Available models
      availableModels: [],
      setAvailableModels: (models) => set({ availableModels: models }),
    }),
    {
      name: 'mcp-client-storage', // localStorage key
      partialize: (state) => ({
        // Only persist these fields
        selectedModel: state.selectedModel,
        apiKeys: state.apiKeys,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
```

## File: `components/settings/ModelSelector.tsx`

```typescript
'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStore } from '@/lib/store';
import { useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

export function ModelSelector() {
  const { selectedModel, setSelectedModel, availableModels, setAvailableModels } = useStore();

  useEffect(() => {
    apiClient.getModels().then((data) => {
      setAvailableModels(data.models);
    });
  }, [setAvailableModels]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">AI Model</label>
      <Select value={selectedModel} onValueChange={setSelectedModel}>
        <SelectTrigger>
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          {availableModels.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div>
                <div className="font-medium">{model.name}</div>
                <div className="text-xs text-muted-foreground">{model.description}</div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

## File: `components/settings/ApiKeyInput.tsx`

```typescript
'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface ApiKeyInputProps {
  provider: 'anthropic' | 'openai' | 'google';
  label: string;
  placeholder: string;
}

export function ApiKeyInput({ provider, label, placeholder }: ApiKeyInputProps) {
  const { apiKeys, setApiKey } = useStore();
  const [show, setShow] = useState(false);
  const [value, setValue] = useState(apiKeys[provider] || '');

  const handleSave = () => {
    setApiKey(provider, value);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            onClick={() => setShow(!show)}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
        <Button onClick={handleSave}>Save</Button>
      </div>
    </div>
  );
}
```

## Page: `app/settings/page.tsx`

```typescript
import { ModelSelector } from '@/components/settings/ModelSelector';
import { ApiKeyInput } from '@/components/settings/ApiKeyInput';
import { Card } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-4xl font-bold mb-8">Settings</h1>

      <div className="space-y-6">
        {/* Model Selection */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">AI Model</h2>
          <ModelSelector />
        </Card>

        {/* API Keys */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">API Keys</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Your API keys are stored locally in your browser and never sent to our servers.
          </p>
          
          <div className="space-y-4">
            <ApiKeyInput
              provider="anthropic"
              label="Anthropic API Key"
              placeholder="sk-ant-..."
            />
            <ApiKeyInput
              provider="openai"
              label="OpenAI API Key"
              placeholder="sk-..."
            />
            <ApiKeyInput
              provider="google"
              label="Google API Key"
              placeholder="AIza..."
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
```

## Next Blueprint

Read `05-API-CLIENT.md`


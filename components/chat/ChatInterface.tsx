'use client'

import { useChat } from 'ai/react'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Settings, Sparkles } from 'lucide-react'
import Link from 'next/link'

function getProviderForModel(modelId: string): 'anthropic' | 'openai' | 'google' | 'groq' {
  if (modelId.startsWith('claude')) return 'anthropic'
  if (modelId.startsWith('gpt')) return 'openai'
  if (modelId.startsWith('groq')) return 'groq'
  if (modelId.startsWith('gemini')) return 'google'
  return 'anthropic' // default
}

export function ChatInterface() {
  const { selectedModel, apiKeys } = useStore()

  const provider = getProviderForModel(selectedModel)
  const apiKey = apiKeys[provider]

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
    body: {
      modelId: selectedModel,
      apiKey,
    },
    streamProtocol: 'data',
    onError: (error) => {
      console.error('Chat error:', error)
    },
  })

  // Check if API key is set
  if (!apiKey) {
    return (
      <div className="flex flex-col h-screen">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">API Key Required</h2>
              <p className="text-muted-foreground">
                Please set your {provider.charAt(0).toUpperCase() + provider.slice(1)} API key to start chatting with AI.
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/settings">
                <Settings className="w-4 h-4 mr-2" />
                Go to Settings
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="m-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg">
            Error: {error.message}
          </div>
        )}
        
        <MessageList messages={messages} />
        
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full p-6">
            <div className="max-w-xl w-full space-y-4">
              <div className="text-center space-y-1">
                <h2>How can I help you?</h2>
                <p className="text-[13px] text-muted-foreground">
                  Ask about facilities, shipments, and operations
                </p>
              </div>
              
              <div className="grid gap-2">
                {[
                  { icon: '🏢', text: 'List all facilities' },
                  { icon: '📋', text: 'Show me recent inspections' },
                  { icon: '⚠️', text: 'What contaminants have been detected recently?' },
                  { icon: '📊', text: 'Analyze the performance of all facilities' },
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      handleInputChange({ target: { value: suggestion.text } } as any)
                    }}
                    className="group text-left p-3 border border-border/40 dark:border-border/20 rounded-lg hover:border-accent hover:bg-accent/5 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{suggestion.icon}</span>
                      <span className="text-[13px] font-medium group-hover:text-accent transition-colors">
                        {suggestion.text}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto p-4">
          <ChatInput
            input={input}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  )
}


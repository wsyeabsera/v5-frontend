'use client'

import { useStore } from '@/lib/store'
import { AI_MODELS } from '@/lib/ai-config'
import { ModelTestButton } from './ModelTestButton'
import { Card } from '@/components/ui/card'
import { useModelTest } from '@/lib/hooks/useModelTest'
import { Check, X, AlertCircle } from 'lucide-react'

const PROVIDER_NAMES: Record<string, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google',
  groq: 'Groq',
  ollama: 'Ollama',
}

const PROVIDER_EMOJIS: Record<string, string> = {
  anthropic: '🤖',
  openai: '🧠',
  google: '🔍',
  groq: '⚡',
  ollama: '🦙',
}

export function ModelTestList() {
  const { apiKeys, ollamaUrl } = useStore()
  const { getTestStatus } = useModelTest()

  // Group models by provider
  const modelsByProvider = Object.entries(AI_MODELS).reduce((acc, [modelId, config]) => {
    const provider = config.provider
    if (!acc[provider]) {
      acc[provider] = []
    }
    acc[provider].push({ modelId, config })
    return acc
  }, {} as Record<string, Array<{ modelId: string; config: any }>>)

  const getStatusIcon = (modelId: string) => {
    const status = getTestStatus(modelId)
    switch (status) {
      case 'success':
        return <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
      case 'error':
        return <X className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
      default:
        return <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
    }
  }

  return (
    <div className="space-y-4">
      {Object.entries(modelsByProvider).map(([provider, models], providerIndex) => (
        <div key={provider}>
          {providerIndex > 0 && <div className="border-b border-border/40 dark:border-border/20 my-4" />}
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{PROVIDER_EMOJIS[provider]}</span>
              <h4 className="font-medium text-sm">{PROVIDER_NAMES[provider]}</h4>
            </div>

            <div className="space-y-3">
              {models.map(({ modelId, config }) => {
                const apiKey = provider === 'ollama' ? undefined : apiKeys[provider as keyof typeof apiKeys]
                const testUrl = provider === 'ollama' ? ollamaUrl : undefined

                return (
                  <Card key={modelId} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        {getStatusIcon(modelId)}
                        <div className="flex-1">
                          <div className="font-medium text-sm">{modelId}</div>
                          <div className="text-xs text-muted-foreground">{config.model}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {provider === 'ollama' && !ollamaUrl && (
                          <span className="text-xs text-muted-foreground">Configure Ollama URL</span>
                        )}
                        {provider !== 'ollama' && !apiKey && (
                          <span className="text-xs text-muted-foreground">Add API key above</span>
                        )}
                        {(provider === 'ollama' ? ollamaUrl : apiKey) && (
                          <ModelTestButton
                            provider={provider}
                            modelId={config.model}
                            apiKey={apiKey}
                            ollamaUrl={testUrl}
                            storeAsModelId={modelId}
                          />
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}


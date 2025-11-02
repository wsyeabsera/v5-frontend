'use client'

import { useStore } from '@/lib/store'
import { AI_MODELS } from '@/lib/ai-config'
import { ModelTestButton } from './ModelTestButton'
import { Badge } from '@/components/ui/badge'
import { useModelTest } from '@/lib/hooks/useModelTest'
import { Check, X, AlertCircle, Clock } from 'lucide-react'

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

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900',
  openai: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900',
  google: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900',
  groq: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900',
  ollama: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900',
}

export function ModelTestList() {
  const { apiKeys, ollamaUrl, modelTestResults } = useStore()
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

  const getStatusBadge = (modelId: string) => {
    const status = getTestStatus(modelId)
    const result = modelTestResults[modelId]
    
    switch (status) {
      case 'success':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900">
            <Check className="w-3 h-3 mr-1" />
            Working
            {result?.latency && (
              <span className="ml-1 text-xs">({result.latency}ms)</span>
            )}
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900">
            <X className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        )
      case 'testing':
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900">
            <Clock className="w-3 h-3 mr-1 animate-spin" />
            Testing...
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border">
            <AlertCircle className="w-3 h-3 mr-1" />
            Untested
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {Object.entries(modelsByProvider).map(([provider, models]) => (
        <div key={provider} className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={`${PROVIDER_COLORS[provider]} px-3 py-1 text-sm font-semibold`}>
              <span className="text-base mr-2">{PROVIDER_EMOJIS[provider]}</span>
              {PROVIDER_NAMES[provider]}
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {models.map(({ modelId, config }) => {
              const apiKey = provider === 'ollama' ? undefined : apiKeys[provider as keyof typeof apiKeys]
              const testUrl = provider === 'ollama' ? ollamaUrl : undefined

              return (
                <div 
                  key={modelId} 
                  className="group relative p-4 rounded-lg border border-border/40 dark:border-border/20 bg-card/30 hover:bg-card/60 transition-all duration-200 hover:border-primary/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex-1">
                        <div className="font-semibold text-sm mb-1">{modelId.replace('-', ' ')}</div>
                        <div className="text-xs text-muted-foreground font-mono">{config.model}</div>
                      </div>
                      {getStatusBadge(modelId)}
                    </div>
                    
                    <div className="ml-4 flex items-center gap-2">
                      {provider === 'ollama' && !ollamaUrl && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Configure Ollama URL</span>
                      )}
                      {provider !== 'ollama' && !apiKey && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Add API key above</span>
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
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}


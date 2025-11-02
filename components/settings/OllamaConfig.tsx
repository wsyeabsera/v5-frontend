'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/lib/store'
import { ModelTestButton } from './ModelTestButton'
import { Check, Loader2, Link2, Server } from 'lucide-react'

export function OllamaConfig() {
  const { ollamaUrl, setOllamaUrl, ollamaModel, setOllamaModel } = useStore()
  const [urlValue, setUrlValue] = useState(ollamaUrl)
  const [saved, setSaved] = useState(false)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [loadingModels, setLoadingModels] = useState(false)

  const fetchAvailableModels = async (url: string) => {
    setLoadingModels(true)
    try {
      const response = await fetch('/api/models/ollama/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ollamaUrl: url }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch models')
      }

      const data = await response.json()
      setAvailableModels(data.models || [])
    } catch (error: any) {
      console.error('Failed to fetch Ollama models:', error)
      setAvailableModels([])
    } finally {
      setLoadingModels(false)
    }
  }

  useEffect(() => {
    if (ollamaUrl) {
      fetchAvailableModels(ollamaUrl)
    }
  }, [ollamaUrl])

  const handleSaveUrl = () => {
    setOllamaUrl(urlValue)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Server URL */}
      <div className="p-4 rounded-lg border border-indigo-200/50 dark:border-indigo-900/30 bg-indigo-50/30 dark:bg-indigo-950/10">
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <label className="text-sm font-semibold text-foreground">Server URL</label>
        </div>
        <div className="flex gap-2">
          <Input
            type="text"
            value={urlValue}
            onChange={(e) => {
              setUrlValue(e.target.value)
              setSaved(false)
            }}
            placeholder="http://localhost:11434"
            className="font-mono text-sm border-indigo-200 dark:border-indigo-900 focus:border-indigo-400 dark:focus:border-indigo-600"
          />
          <Button 
            onClick={handleSaveUrl}
            disabled={!urlValue || urlValue === ollamaUrl}
            className="min-w-[90px]"
            size="sm"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 mr-1.5" />
                Saved
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
        {saved && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 animate-fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>URL saved successfully</span>
          </div>
        )}
      </div>

      {/* Model Selection */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <label className="text-sm font-semibold text-foreground">Available Models</label>
        </div>
        {loadingModels ? (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground bg-muted/30 rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin" />
            Fetching available models from Ollama...
          </div>
        ) : availableModels.length > 0 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 max-h-[240px] overflow-y-auto pr-2">
              {availableModels.map((model) => (
                <Button
                  key={model}
                  onClick={() => setOllamaModel(model)}
                  variant={ollamaModel === model ? 'default' : 'outline'}
                  size="sm"
                  className="justify-between h-auto py-3 px-4 hover:scale-[1.02] transition-transform"
                >
                  <span className="font-mono text-sm">{model}</span>
                  {ollamaModel === model && (
                    <Badge variant="outline" className="ml-2 bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900">
                      <Check className="w-3 h-3" />
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
            {ollamaModel && (
              <div className="pt-2">
                <ModelTestButton
                  provider="ollama"
                  modelId={ollamaModel}
                  ollamaUrl={ollamaUrl}
                  storeAsModelId={`ollama-${ollamaModel}`}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 text-sm text-muted-foreground bg-muted/30 rounded-lg border border-dashed border-border">
            {ollamaUrl ? 'No models available. Make sure Ollama is running and models are installed.' : 'Enter Ollama URL to see available models'}
          </div>
        )}
      </div>
    </div>
  )
}

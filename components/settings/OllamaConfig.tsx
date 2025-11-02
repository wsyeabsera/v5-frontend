'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { ModelTestButton } from './ModelTestButton'
import { Check, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'

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
    <Card className="p-4 space-y-4">
      <div className="space-y-2">
        <label className="text-[13px] font-medium text-foreground">Ollama Server URL</label>
        <div className="flex gap-2">
          <Input
            type="text"
            value={urlValue}
            onChange={(e) => {
              setUrlValue(e.target.value)
              setSaved(false)
            }}
            placeholder="http://localhost:11434"
            className="font-mono text-[12px] border-border/40 dark:border-border/20"
          />
          <Button 
            onClick={handleSaveUrl}
            disabled={!urlValue || urlValue === ollamaUrl}
            className="min-w-[75px]"
            size="sm"
          >
            {saved ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1" />
                Saved
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
        {saved && (
          <p className="text-[11px] text-primary flex items-center gap-1">
            <Check className="w-3 h-3" />
            URL saved successfully
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-[13px] font-medium text-foreground">Ollama Model</label>
        {loadingModels ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Fetching available models...
          </div>
        ) : availableModels.length > 0 ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
              {availableModels.map((model) => (
                <Button
                  key={model}
                  onClick={() => setOllamaModel(model)}
                  variant={ollamaModel === model ? 'default' : 'outline'}
                  size="sm"
                  className="justify-start text-[12px]"
                >
                  {model}
                  {ollamaModel === model && <Check className="w-3.5 h-3.5 ml-auto" />}
                </Button>
              ))}
            </div>
            <ModelTestButton
              provider="ollama"
              modelId={ollamaModel}
              ollamaUrl={ollamaUrl}
              storeAsModelId={`ollama-${ollamaModel}`}
            />
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            {ollamaUrl ? 'No models available. Make sure Ollama is running and models are installed.' : 'Enter Ollama URL to see available models'}
          </div>
        )}
      </div>
    </Card>
  )
}

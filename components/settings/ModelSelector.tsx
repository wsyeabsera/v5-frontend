'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/lib/store'
import { useEffect } from 'react'
import { useModels } from '@/lib/queries'
import { Check, X, AlertCircle, Zap } from 'lucide-react'
import { getProviderForModel } from '@/lib/ai-config'

const PROVIDER_EMOJIS: Record<string, string> = {
  anthropic: '🤖',
  openai: '🧠',
  google: '🔍',
  groq: '⚡',
  ollama: '🦙',
}

export function ModelSelector() {
  const { selectedModel, setSelectedModel, setAvailableModels, modelTestResults } = useStore()
  const { data: modelsData, isLoading } = useModels()

  useEffect(() => {
    if (modelsData?.models) {
      setAvailableModels(modelsData.models)
    }
  }, [modelsData, setAvailableModels])

  const models = modelsData?.models || []

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
          Loading models...
        </div>
      </div>
    )
  }

  const getStatusBadge = (model: any) => {
    const testResult = modelTestResults[model.id]
    
    if (!testResult) {
      return (
        <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border">
          <AlertCircle className="w-3 h-3 mr-1" />
          Untested
        </Badge>
      )
    }
    
    switch (testResult.status) {
      case 'success':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900">
            <Check className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900">
            <X className="w-3 h-3 mr-1" />
            Failed
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

  const isModelWorking = (model: any) => {
    const testResult = modelTestResults[model.id]
    return testResult?.status === 'success'
  }

  const getSelectedModel = () => {
    return models.find((m: any) => m.id === selectedModel)
  }

  const selectedModelData = getSelectedModel()

  return (
    <div className="space-y-3">
      <Select value={selectedModel} onValueChange={setSelectedModel}>
        <SelectTrigger className="h-12 text-base bg-card/50 border-border/60 hover:border-primary/50 transition-colors">
          <SelectValue placeholder="Select a model">
            {selectedModelData && (
              <div className="flex items-center gap-3">
                <span className="text-xl">{PROVIDER_EMOJIS[getProviderForModel(selectedModelData.id)] || '🧠'}</span>
                <div className="flex flex-col items-start">
                  <div className="font-semibold">{selectedModelData.name}</div>
                  {selectedModelData.description && (
                    <div className="text-xs text-muted-foreground">
                      {selectedModelData.description}
                    </div>
                  )}
                </div>
                {getStatusBadge(selectedModelData)}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {models.map((model: any) => {
            const provider = getProviderForModel(model.id)
            const isWorking = isModelWorking(model)
            
            return (
              <SelectItem 
                key={model.id} 
                value={model.id}
                disabled={!isWorking}
              >
                <div className="flex items-center gap-3 py-1">
                  <span className="text-xl">{PROVIDER_EMOJIS[provider] || '🧠'}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm ${!isWorking ? 'opacity-50' : ''}`}>
                      {model.name}
                    </div>
                    {model.description && (
                      <div className="text-xs text-muted-foreground truncate">
                        {model.description}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {getStatusBadge(model)}
                  </div>
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
      
      {selectedModelData && !isModelWorking(selectedModelData) && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Model Not Tested
            </div>
            <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Please test this model above before selecting it
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


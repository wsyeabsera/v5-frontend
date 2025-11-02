'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useStore } from '@/lib/store'
import { useEffect } from 'react'
import { useModels } from '@/lib/queries'
import { Check, X, AlertCircle } from 'lucide-react'
import { getProviderForModel } from '@/lib/ai-config'

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
      <div className="space-y-2">
        <label className="text-sm font-medium">AI Model</label>
        <div className="text-sm text-muted-foreground">Loading models...</div>
      </div>
    )
  }

  const getStatusIcon = (model: any) => {
    const testResult = modelTestResults[model.id]
    
    if (!testResult) {
      return <AlertCircle className="w-3 h-3 text-muted-foreground" />
    }
    
    switch (testResult.status) {
      case 'success':
        return <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
      case 'error':
        return <X className="w-3 h-3 text-red-600 dark:text-red-400" />
      default:
        return <AlertCircle className="w-3 h-3 text-muted-foreground" />
    }
  }

  const isModelWorking = (model: any) => {
    const testResult = modelTestResults[model.id]
    return testResult?.status === 'success'
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">AI Model</label>
      <Select value={selectedModel} onValueChange={setSelectedModel}>
        <SelectTrigger>
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          {models.map((model: any) => (
            <SelectItem 
              key={model.id} 
              value={model.id}
              disabled={!isModelWorking(model)}
            >
              <div className="flex items-center gap-2">
                {getStatusIcon(model)}
                <div>
                  <div className={`font-medium ${!isModelWorking(model) ? 'opacity-50' : ''}`}>
                    {model.name}
                    {!isModelWorking(model) && ' (Untested)'}
                  </div>
                  {model.description && (
                    <div className="text-xs text-muted-foreground">
                      {model.description}
                    </div>
                  )}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}


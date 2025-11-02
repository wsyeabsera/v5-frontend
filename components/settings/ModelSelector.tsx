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

export function ModelSelector() {
  const { selectedModel, setSelectedModel, setAvailableModels } = useStore()
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

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">AI Model</label>
      <Select value={selectedModel} onValueChange={setSelectedModel}>
        <SelectTrigger>
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          {models.map((model: any) => (
            <SelectItem key={model.id} value={model.id}>
              <div>
                <div className="font-medium">{model.name}</div>
                {model.description && (
                  <div className="text-xs text-muted-foreground">
                    {model.description}
                  </div>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}


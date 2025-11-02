'use client'

import { Button } from '@/components/ui/button'
import { useModelTest } from '@/lib/hooks/useModelTest'
import { Check, X, Loader2, AlertCircle } from 'lucide-react'
import { ModelTestStatus } from '@/types'
import { useStore } from '@/lib/store'

interface ModelTestButtonProps {
  provider: string
  modelId: string
  apiKey?: string
  ollamaUrl?: string
  compact?: boolean
  storeAsModelId?: string // Optional override for store key
}

export function ModelTestButton({ provider, modelId, apiKey, ollamaUrl, compact = false, storeAsModelId }: ModelTestButtonProps) {
  const { testModel, isTesting, getTestStatus } = useModelTest()
  const { modelTestResults } = useStore()
  
  const resultKey = storeAsModelId || modelId
  const status = getTestStatus(resultKey)
  const result = modelTestResults[resultKey]

  const handleTest = async () => {
    await testModel({ provider, modelId, apiKey, ollamaUrl, storeAsModelId: resultKey })
  }

  const getStatusIcon = (status: ModelTestStatus) => {
    switch (status) {
      case 'success':
        return <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
      case 'error':
        return <X className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
      case 'testing':
        return <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
      default:
        return <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
    }
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        {getStatusIcon(status)}
        <Button
          onClick={handleTest}
          disabled={isTesting}
          variant="outline"
          size="sm"
          className="h-7 px-2 text-[11px]"
        >
          {isTesting ? 'Testing...' : 'Test'}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleTest}
        disabled={isTesting}
        variant="outline"
        size="sm"
        className="h-9 font-medium hover:scale-[1.02] active:scale-[0.98] transition-transform"
      >
        {isTesting ? (
          <>
            <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
            Testing...
          </>
        ) : (
          'Test Connection'
        )}
      </Button>
      {result && !isTesting && status !== 'untested' && (
        <span className={`text-xs font-medium animate-fade-in ${status === 'success' ? 'text-green-600 dark:text-green-400' : status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
          {result.message}
        </span>
      )}
    </div>
  )
}

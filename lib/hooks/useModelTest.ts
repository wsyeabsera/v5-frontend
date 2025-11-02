'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { ModelTestResult, ModelTestStatus } from '@/types'

interface TestModelParams {
  provider: string
  modelId: string
  apiKey?: string
  ollamaUrl?: string
  storeAsModelId?: string // Optional override for store key
}

/**
 * Custom hook for testing model APIs
 * 
 * Manages testing state, calls the API, and updates the store with results
 */
export function useModelTest() {
  const [isTesting, setIsTesting] = useState(false)
  const { setModelTestResult, modelTestResults } = useStore()

  const testModel = async ({ provider, modelId, apiKey, ollamaUrl, storeAsModelId }: TestModelParams): Promise<ModelTestResult> => {
    setIsTesting(true)
    
    // Use storeAsModelId if provided, otherwise use modelId
    const resultKey = storeAsModelId || modelId

    try {
      // Set status to testing
      const testingResult: ModelTestResult = {
        status: 'testing',
        message: 'Testing...',
        timestamp: new Date().toISOString(),
      }
      setModelTestResult(resultKey, testingResult)

      // Call the test API
      const response = await fetch('/api/models/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          modelId,
          apiKey,
          ollamaUrl,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Test failed')
      }

      // Set final result
      const result: ModelTestResult = {
        status: data.success ? 'success' : 'error',
        message: data.message || (data.success ? 'Test successful' : 'Test failed'),
        timestamp: new Date().toISOString(),
        latency: data.latency,
      }

      setModelTestResult(resultKey, result)
      
      return result
    } catch (error: any) {
      const result: ModelTestResult = {
        status: 'error',
        message: error.message || 'Test failed',
        timestamp: new Date().toISOString(),
      }

      setModelTestResult(resultKey, result)
      
      return result
    } finally {
      setIsTesting(false)
    }
  }

  const getTestResult = (modelId: string): ModelTestResult | undefined => {
    return modelTestResults[modelId]
  }

  const getTestStatus = (modelId: string): ModelTestStatus => {
    return modelTestResults[modelId]?.status || 'untested'
  }

  return {
    testModel,
    isTesting,
    getTestResult,
    getTestStatus,
  }
}

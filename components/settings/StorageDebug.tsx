'use client'

import { useStore } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'

export function StorageDebug() {
  const { apiKeys } = useStore()
  const [localStorageValue, setLocalStorageValue] = useState<string>('')
  const [showDebug, setShowDebug] = useState(false)

  useEffect(() => {
    // Read from localStorage
    const stored = localStorage.getItem('mcp-client-storage')
    setLocalStorageValue(stored || 'null')
  }, [apiKeys]) // Re-check when apiKeys change

  const handleClearStorage = () => {
    if (confirm('Clear all saved API keys? This cannot be undone.')) {
      localStorage.removeItem('mcp-client-storage')
      window.location.reload()
    }
  }

  if (!showDebug) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setShowDebug(true)}
        className="mt-4"
      >
        🐛 Show Debug Info
      </Button>
    )
  }

  let parsedStorage: any = null
  try {
    parsedStorage = JSON.parse(localStorageValue)
  } catch (e) {
    // Invalid JSON
  }

  return (
    <Card className="p-4 mt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-sm">🐛 Storage Debug</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowDebug(false)}
        >
          Hide
        </Button>
      </div>

      <div className="space-y-3 text-xs">
        {/* Zustand State */}
        <div>
          <div className="font-semibold mb-1">Current Zustand State (apiKeys):</div>
          <pre className="bg-muted p-2 rounded overflow-auto">
            {JSON.stringify(apiKeys, null, 2)}
          </pre>
        </div>

        {/* localStorage Raw */}
        <div>
          <div className="font-semibold mb-1">localStorage Raw Value:</div>
          <pre className="bg-muted p-2 rounded overflow-auto max-h-40">
            {localStorageValue === 'null' ? 'No data stored' : localStorageValue}
          </pre>
        </div>

        {/* Parsed Storage */}
        {parsedStorage && (
          <div>
            <div className="font-semibold mb-1">Parsed Storage (apiKeys):</div>
            <pre className="bg-muted p-2 rounded overflow-auto">
              {JSON.stringify(parsedStorage?.state?.apiKeys || parsedStorage?.apiKeys, null, 2)}
            </pre>
          </div>
        )}

        {/* Key Comparison */}
        <div>
          <div className="font-semibold mb-1">Key Status:</div>
          <div className="space-y-1">
            <div>Anthropic: {apiKeys.anthropic ? '✓ Set' : '✗ Not set'}</div>
            <div>OpenAI: {apiKeys.openai ? '✓ Set' : '✗ Not set'}</div>
            <div>Google: {apiKeys.google ? '✓ Set' : '✗ Not set'}</div>
            <div className="font-bold text-blue-600">
              Groq: {apiKeys.groq ? '✓ Set' : '✗ Not set'}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 border-t">
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleClearStorage}
          >
            Clear All Storage & Reload
          </Button>
        </div>

        {/* Instructions */}
        <div className="pt-2 border-t text-muted-foreground">
          <div className="font-semibold mb-1">Quick Test in Console:</div>
          <code className="bg-muted p-1 rounded text-[10px] block">
            localStorage.getItem('mcp-client-storage')
          </code>
        </div>
      </div>
    </Card>
  )
}


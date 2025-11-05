'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useInitTools } from '@/lib/queries-v2'
import { Loader2, RefreshCw } from 'lucide-react'

export function InitToolsButton() {
  const [force, setForce] = useState(false)
  const initMutation = useInitTools()

  const handleInit = async () => {
    try {
      await initMutation.mutateAsync({ force, source: 'remote' })
      // Success - tools will be refreshed automatically via query invalidation
    } catch (error) {
      console.error('Failed to initialize tools:', error)
      alert(error instanceof Error ? error.message : 'Failed to initialize tools')
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="force-init"
          checked={force}
          onChange={(e) => setForce(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <Label htmlFor="force-init" className="text-sm font-normal cursor-pointer">
          Force update
        </Label>
      </div>
      <Button
        onClick={handleInit}
        disabled={initMutation.isPending}
        variant="outline"
        className="gap-2"
      >
        {initMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Initializing...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Initialize Tools
          </>
        )}
      </Button>
    </div>
  )
}


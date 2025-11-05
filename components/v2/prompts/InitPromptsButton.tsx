'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useInitPrompts } from '@/lib/queries-v2'
import { Loader2, RefreshCw } from 'lucide-react'

export function InitPromptsButton() {
  const [force, setForce] = useState(false)
  const initMutation = useInitPrompts()

  const handleInit = async () => {
    try {
      await initMutation.mutateAsync({ force, source: 'remote' })
      // Success - prompts will be refreshed automatically via query invalidation
    } catch (error) {
      console.error('Failed to initialize prompts:', error)
      alert(error instanceof Error ? error.message : 'Failed to initialize prompts')
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="force-init-prompts"
          checked={force}
          onChange={(e) => setForce(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <Label htmlFor="force-init-prompts" className="text-sm font-normal cursor-pointer">
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
            Initialize Prompts
          </>
        )}
      </Button>
    </div>
  )
}


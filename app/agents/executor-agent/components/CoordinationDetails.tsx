'use client'

import { PlanExecutionResult } from '@/types'

interface CoordinationDetailsProps {
  update: NonNullable<PlanExecutionResult['planUpdates']>[number]
}

export function CoordinationDetails({ update }: CoordinationDetailsProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Coordination Analysis</p>
        <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
          {update.reason}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Before</p>
          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
            {JSON.stringify(update.originalParameters, null, 2)}
          </pre>
        </div>
        <div>
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">After</p>
          <pre className="text-xs bg-blue-500/10 p-2 rounded overflow-x-auto border border-blue-500/20">
            {JSON.stringify(update.updatedParameters, null, 2)}
          </pre>
        </div>
      </div>

      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <span>Timestamp:</span>
        <span className="font-mono">
          {new Date(update.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  )
}


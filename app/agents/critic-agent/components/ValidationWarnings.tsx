'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'

interface ValidationWarning {
  stepOrder: number
  stepId: string
  tool: string
  missingParam: string
  isRequired: boolean
}

interface ValidationWarningsProps {
  warnings: ValidationWarning[]
}

export function ValidationWarnings({ warnings }: ValidationWarningsProps) {
  if (!warnings || warnings.length === 0) {
    return null
  }

  // Group warnings by step
  const warningsByStep = warnings.reduce((acc, warning) => {
    if (!acc[warning.stepOrder]) {
      acc[warning.stepOrder] = []
    }
    acc[warning.stepOrder].push(warning)
    return acc
  }, {} as Record<number, ValidationWarning[]>)

  return (
    <Card className="border-yellow-500/50 bg-yellow-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          Missing Required Parameters
          <Badge variant="outline" className="ml-auto bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
            {warnings.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          The following required parameters are missing or contain placeholder values:
        </p>
        
        {Object.entries(warningsByStep).map(([stepOrder, stepWarnings]) => (
          <div key={stepOrder} className="p-3 border border-yellow-500/20 rounded-lg bg-background">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs">
                Step {stepOrder}
              </Badge>
              <span className="text-xs font-mono text-muted-foreground">
                {stepWarnings[0].tool}
              </span>
            </div>
            
            <div className="space-y-1">
              {stepWarnings.map((warning, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-3 h-3 text-yellow-600 flex-shrink-0" />
                  <span className="text-muted-foreground">Missing:</span>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                    {warning.missingParam}
                  </code>
                  <Badge variant="outline" className="text-xs bg-red-500/10 text-red-700 border-red-500/20">
                    Required
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}


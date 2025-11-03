'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ExecutionResult, PlanExecutionResult } from '@/types'
import { CheckCircle, XCircle, ChevronDown, Clock, AlertTriangle, RefreshCw, Sparkles } from 'lucide-react'
import { useState } from 'react'

interface ExecutionStepCardProps {
  step: ExecutionResult
  planUpdate?: NonNullable<PlanExecutionResult['planUpdates']>[number]
}

export function ExecutionStepCard({ step, planUpdate }: ExecutionStepCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getStatusIcon = () => {
    if (step.success) {
      return <CheckCircle className="w-5 h-5 text-green-600" />
    }
    return <XCircle className="w-5 h-5 text-red-600" />
  }

  const getStatusBadge = () => {
    if (step.success) {
      return <Badge variant="default" className="bg-green-500/10 text-green-700 border-green-500/20">Success</Badge>
    }
    return <Badge variant="destructive">Failed</Badge>
  }

  const formatResult = (result: any): string => {
    if (typeof result === 'string') {
      return result
    }
    // Handle MCP result format: array with {type: "text", text: "..."} objects
    if (Array.isArray(result)) {
      // Check if it's an array of MCP content objects
      if (result.length > 0 && result[0]?.type === 'text' && result[0]?.text) {
        return result.map((item: any) => item.text || '').join('')
      }
      // Otherwise stringify the array
      try {
        return JSON.stringify(result, null, 2)
      } catch {
        return String(result)
      }
    }
    // Handle single object with type/text
    if (result?.type === 'text' && result?.text) {
      return result.text
    }
    // Handle other objects
    try {
      return JSON.stringify(result, null, 2)
    } catch {
      return String(result)
    }
  }

  return (
    <Card className={`border ${step.success ? 'border-green-500/20' : 'border-red-500/20'}`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardContent className="cursor-pointer hover:bg-muted/50 transition-colors pt-6">
            <div className="flex items-start gap-4">
              {/* Status Icon */}
              <div className="mt-0.5">
                {getStatusIcon()}
              </div>

              {/* Main Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-semibold">Step {step.stepOrder}</span>
                  {getStatusBadge()}
                  {planUpdate && (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 text-xs">
                      <Sparkles className="w-3 h-3 mr-1" />
                      LLM-Coordinated
                    </Badge>
                  )}
                  {step.errorType && (
                    <Badge variant="outline" className="text-xs">
                      {step.errorType}
                    </Badge>
                  )}
                </div>

                {step.toolCalled && (
                  <div className="flex items-center gap-2 mb-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                      {step.toolCalled}
                    </code>
                  </div>
                )}

                {step.error && (
                  <div className="flex items-start gap-2 text-sm text-destructive">
                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                    <span className="line-clamp-2">{step.error}</span>
                  </div>
                )}

                {step.success && step.result && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    Result: {typeof step.result === 'string' ? step.result.substring(0, 100) : 'Object returned'}
                  </p>
                )}

                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {step.duration}ms
                  </div>
                  {step.retries > 0 && (
                    <span>Retries: {step.retries}</span>
                  )}
                  <span>
                    {new Date(step.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              {/* Expand Icon */}
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${
                isExpanded ? 'transform rotate-180' : ''
              }`} />
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Plan Update Information */}
            {planUpdate && (
              <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">LLM-Driven Parameter Coordination</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{planUpdate.reason}</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Original Parameters</p>
                    <pre className="bg-muted p-2 rounded overflow-x-auto text-xs">
                      {JSON.stringify(planUpdate.originalParameters, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="font-medium text-blue-600 dark:text-blue-400 mb-1">Updated Parameters</p>
                    <pre className="bg-blue-500/10 p-2 rounded overflow-x-auto text-xs border border-blue-500/20">
                      {JSON.stringify(planUpdate.updatedParameters, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Parameters Used */}
            {step.parametersUsed && Object.keys(step.parametersUsed).length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Parameters Used</p>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                  {JSON.stringify(step.parametersUsed, null, 2)}
                </pre>
                {planUpdate && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    Parameters were dynamically updated during execution using LLM coordination
                  </p>
                )}
              </div>
            )}

            {/* Result */}
            {step.success && step.result && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Result</p>
                <div className="bg-muted p-3 rounded-lg">
                  <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                    {formatResult(step.result)}
                  </pre>
                </div>
              </div>
            )}

            {/* Error Details */}
            {!step.success && step.error && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Error Details</p>
                <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
                  <p className="text-sm text-destructive">{step.error}</p>
                  {step.errorType && (
                    <p className="text-xs text-muted-foreground mt-2">Type: {step.errorType}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}


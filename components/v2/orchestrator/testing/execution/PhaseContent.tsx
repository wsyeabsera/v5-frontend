'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, Copy, Check, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { extractPhaseError, formatError, hasError, type ExtractedError } from './errorUtils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface PhaseContentProps {
  phaseId: string
  content: any
  error?: ExtractedError | null
}

export function PhaseContent({ phaseId, content, error: propError }: PhaseContentProps) {
  // Auto-expand if there's an error
  const extractedError = propError || extractPhaseError(content, phaseId)
  const [isExpanded, setIsExpanded] = useState(!!extractedError)
  const [copied, setCopied] = useState(false)
  const [showStack, setShowStack] = useState(false)

  const handleCopy = async () => {
    const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatErrorDisplay = (error: ExtractedError) => {
    return (
      <Alert variant="destructive" className="mb-4 border-2">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="font-semibold">Error in {phaseId.charAt(0).toUpperCase() + phaseId.slice(1)} Phase</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <div className="font-medium">{formatError(error)}</div>
          {error.code && (
            <div className="text-xs text-muted-foreground">
              Error Code: <code className="bg-background px-1 py-0.5 rounded">{error.code}</code>
            </div>
          )}
          {error.stack && (
            <Collapsible open={showStack} onOpenChange={setShowStack}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 text-xs">
                  {showStack ? (
                    <>
                      <ChevronUp className="w-3 h-3 mr-1" />
                      Hide Stack Trace
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3 mr-1" />
                      Show Stack Trace
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="mt-2 text-xs bg-background/50 p-3 rounded-md overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap border border-destructive/20">
                  {error.stack}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  const formatContent = () => {
    if (!content) return null

    // Show error prominently if present
    if (extractedError) {
      return (
        <div>
          {formatErrorDisplay(extractedError)}
          {/* Still show content below error if available */}
          {content && typeof content !== 'object' && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Phase Content:</div>
              <pre className="whitespace-pre-wrap text-sm bg-muted p-3 rounded-md">{content}</pre>
            </div>
          )}
        </div>
      )
    }

    if (typeof content === 'string') {
      return <pre className="whitespace-pre-wrap text-sm">{content}</pre>
    }

    if (typeof content === 'object') {
      // Handle different phase content structures
      if (phaseId === 'thought' && content.thought) {
        return <pre className="whitespace-pre-wrap text-sm">{content.thought}</pre>
      }

      if (phaseId === 'plan' && content.steps) {
        return (
          <div className="space-y-2">
            {content.steps?.map((step: any, idx: number) => (
              <div key={idx} className="p-3 bg-muted rounded-md">
                <div className="font-medium">Step {idx + 1}: {step.name || step.description}</div>
                {step.details && (
                  <div className="text-sm text-muted-foreground mt-1">{step.details}</div>
                )}
                {step.error && (
                  <div className="mt-2 text-sm text-red-600">
                    <strong>Error:</strong> {typeof step.error === 'string' ? step.error : step.error.message || JSON.stringify(step.error)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      }

      if (phaseId === 'execution' && content.taskId) {
        return (
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Task ID:</span> {content.taskId}
            </div>
            {content.status && (
              <div className="text-sm">
                <span className="font-medium">Status:</span> {content.status}
              </div>
            )}
            {content.error && (
              <div className="mt-2 text-sm text-red-600">
                <strong>Error:</strong> {typeof content.error === 'string' ? content.error : content.error.message || JSON.stringify(content.error)}
              </div>
            )}
            {content.result && (
              <div className="mt-2">
                <div className="font-medium text-sm mb-1">Result:</div>
                <pre className="whitespace-pre-wrap text-sm bg-muted p-3 rounded-md">
                  {typeof content.result === 'string'
                    ? content.result
                    : JSON.stringify(content.result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )
      }

      // Default: show as formatted JSON
      return (
        <pre className="whitespace-pre-wrap text-sm bg-muted p-3 rounded-md overflow-x-auto">
          {JSON.stringify(content, null, 2)}
        </pre>
      )
    }

    return <div className="text-sm text-muted-foreground">No content available</div>
  }

  const hasContent = content !== null && content !== undefined
  const hasErrorContent = !!extractedError

  if (!hasContent && !hasErrorContent) {
    return (
      <div className="text-sm text-muted-foreground italic">Content not available yet</div>
    )
  }

  return (
    <Card className={`border-2 ${hasErrorContent ? 'border-red-300 dark:border-red-700' : ''}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">Phase Content</div>
            {hasErrorContent && (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 w-8 p-0"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Expand
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Always show error even when collapsed */}
        {hasErrorContent && !isExpanded && (
          <div className="mt-2">
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="h-3 w-3" />
              <AlertDescription className="text-xs">
                <strong>Error:</strong> {extractedError.message}
                {extractedError.code && ` [${extractedError.code}]`}
              </AlertDescription>
            </Alert>
            <div className="mt-2 text-xs text-muted-foreground">
              Click expand to view full error details and stack trace
            </div>
          </div>
        )}

        {isExpanded && (
          <div className="mt-4 max-h-[600px] overflow-y-auto">
            {formatContent()}
          </div>
        )}

        {!isExpanded && !hasErrorContent && (
          <div className="mt-2 text-sm text-muted-foreground">
            Click expand to view full content
          </div>
        )}
      </div>
    </Card>
  )
}


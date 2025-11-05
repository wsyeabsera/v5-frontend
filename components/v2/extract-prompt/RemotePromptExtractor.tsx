'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useExtractRemotePrompt } from '@/lib/queries-v2'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

export function RemotePromptExtractor() {
  const [promptName, setPromptName] = useState('')
  const [argumentsJson, setArgumentsJson] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const extractMutation = useExtractRemotePrompt()

  const handleExtract = async () => {
    if (!promptName.trim()) {
      setError('Prompt name is required')
      return
    }

    setError(null)
    setResult(null)

    let parsedArgs: Record<string, any> = {}
    if (argumentsJson.trim()) {
      try {
        parsedArgs = JSON.parse(argumentsJson)
        if (typeof parsedArgs !== 'object' || Array.isArray(parsedArgs)) {
          setError('Arguments must be a valid JSON object')
          return
        }
      } catch (e) {
        setError('Invalid JSON format for arguments')
        return
      }
    }

    try {
      const response = await extractMutation.mutateAsync({
        name: promptName.trim(),
        arguments: parsedArgs,
      })
      // The response should be a string (the resolved prompt)
      setResult(typeof response === 'string' ? response : JSON.stringify(response, null, 2))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract prompt')
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prompt-name-remote">
            Prompt Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="prompt-name-remote"
            placeholder="Enter prompt name..."
            value={promptName}
            onChange={(e) => setPromptName(e.target.value)}
            disabled={extractMutation.isPending}
          />
          <p className="text-xs text-muted-foreground">
            The name of the prompt to extract from the remote MCP server
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="arguments-remote">Arguments (JSON, optional)</Label>
          <Textarea
            id="arguments-remote"
            placeholder='{"key": "value"}'
            value={argumentsJson}
            onChange={(e) => setArgumentsJson(e.target.value)}
            disabled={extractMutation.isPending}
            rows={6}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Optional JSON object with arguments to resolve in the prompt template
          </p>
        </div>

        <Button onClick={handleExtract} disabled={extractMutation.isPending || !promptName.trim()}>
          {extractMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Extracting...
            </>
          ) : (
            'Extract Prompt'
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-red-900 dark:text-red-100">Error</div>
            <div className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</div>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            <Label className="text-base font-semibold">Resolved Prompt</Label>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <ScrollArea className="max-h-[500px]">
              <pre className="whitespace-pre-wrap break-words text-sm font-mono">
                {result}
              </pre>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  )
}


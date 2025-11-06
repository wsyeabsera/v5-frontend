'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface EnhancementComparisonProps {
  enhancement: any
}

export function EnhancementComparison({ enhancement }: EnhancementComparisonProps) {
  const [copiedOriginal, setCopiedOriginal] = useState(false)
  const [copiedEnhanced, setCopiedEnhanced] = useState(false)
  const { toast } = useToast()

  if (!enhancement) {
    return (
      <Card className="p-12">
        <div className="text-center text-muted-foreground">
          Select an enhancement from the history to view comparison
        </div>
      </Card>
    )
  }

  const handleCopy = async (text: string, type: 'original' | 'enhanced') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'original') {
        setCopiedOriginal(true)
        setTimeout(() => setCopiedOriginal(false), 2000)
      } else {
        setCopiedEnhanced(true)
        setTimeout(() => setCopiedEnhanced(false), 2000)
      }
      toast({
        title: 'Copied',
        description: `${type === 'original' ? 'Original' : 'Enhanced'} prompt copied to clipboard`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      })
    }
  }

  const lengthDiff = enhancement.enhancedLength - enhancement.originalLength
  const lengthDiffPercent = enhancement.originalLength > 0
    ? Math.round((lengthDiff / enhancement.originalLength) * 100 * 10) / 10
    : 0

  return (
    <div className="space-y-6">
      {/* Enhancement Info */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="capitalize">
              {enhancement.phase}
            </Badge>
            {enhancement.orchestratorName && (
              <Badge variant="secondary">{enhancement.orchestratorName}</Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {new Date(enhancement.timestamp).toLocaleString()}
            </span>
          </div>
          {enhancement.orchestratorId && (
            <Link href={`/v2/orchestrator/orchestrators?id=${enhancement.orchestratorId}`}>
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Orchestrator
              </Button>
            </Link>
          )}
        </div>
        {enhancement.userQuery && (
          <div className="mt-3">
            <p className="text-sm font-medium">User Query:</p>
            <p className="text-sm text-muted-foreground mt-1 break-words">{enhancement.userQuery}</p>
          </div>
        )}
        <div className="mt-3 flex items-center gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Length: </span>
            <span className="font-medium">
              {enhancement.originalLength} → {enhancement.enhancedLength} chars
            </span>
            {lengthDiff !== 0 && (
              <span className={lengthDiff > 0 ? 'text-green-600' : 'text-red-600'}>
                {' '}({lengthDiff > 0 ? '+' : ''}{lengthDiff}, {lengthDiffPercent > 0 ? '+' : ''}
                {lengthDiffPercent}%)
              </span>
            )}
          </div>
          {enhancement.options && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Options: </span>
              {enhancement.options.includeFewShot && (
                <Badge variant="outline" className="text-xs">Few-Shot</Badge>
              )}
              {enhancement.options.includeContext && (
                <Badge variant="outline" className="text-xs">Context</Badge>
              )}
              {enhancement.options.maxFewShotExamples && (
                <span className="text-xs text-muted-foreground">
                  ({enhancement.options.maxFewShotExamples} examples)
                </span>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Original Prompt</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{enhancement.originalLength} chars</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(enhancement.originalPrompt, 'original')}
              >
                {copiedOriginal ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          <ScrollArea className="h-[500px] border rounded-md p-4 bg-muted/30">
            <pre className="text-sm whitespace-pre-wrap font-mono break-words">
              {enhancement.originalPrompt}
            </pre>
          </ScrollArea>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Enhanced Prompt</h3>
            <div className="flex items-center gap-2">
              <Badge>{enhancement.enhancedLength} chars</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(enhancement.enhancedPrompt, 'enhanced')}
              >
                {copiedEnhanced ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          <ScrollArea className="h-[500px] border rounded-md p-4 bg-muted/30">
            <pre className="text-sm whitespace-pre-wrap font-mono break-words">
              {enhancement.enhancedPrompt}
            </pre>
          </ScrollArea>
        </Card>
      </div>
    </div>
  )
}


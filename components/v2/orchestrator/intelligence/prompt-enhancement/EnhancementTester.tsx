'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useEnhancePrompt, useOrchestrators } from '@/lib/queries-v2'
import { Loader2, Play } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface EnhancementTesterProps {
  onEnhancementComplete?: (enhancement: any) => void
}

export function EnhancementTester({ onEnhancementComplete }: EnhancementTesterProps) {
  const [basePrompt, setBasePrompt] = useState('')
  const [userQuery, setUserQuery] = useState('')
  const [orchestratorId, setOrchestratorId] = useState<string>('')
  const [phase, setPhase] = useState<'thought' | 'plan' | 'execution' | 'summary'>('thought')
  const [includeFewShot, setIncludeFewShot] = useState(true)
  const [includeContext, setIncludeContext] = useState(true)
  const [maxFewShotExamples, setMaxFewShotExamples] = useState(3)
  const { data: orchestrators } = useOrchestrators()
  const enhancePrompt = useEnhancePrompt()
  const { toast } = useToast()

  const handleEnhance = async () => {
    if (!basePrompt.trim() || !userQuery.trim() || !orchestratorId.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    try {
      const result = await enhancePrompt.mutateAsync({
        basePrompt: basePrompt.trim(),
        userQuery: userQuery.trim(),
        orchestratorId: orchestratorId.trim(),
        phase,
        options: {
          includeFewShot,
          includeContext,
          maxFewShotExamples,
        },
      })
      
      // Extract the enhanced prompt from the response
      // The API returns: { enhancedPrompt: string, originalLength: number, enhancedLength: number }
      const enhancedPromptText = result?.enhancedPrompt || result?.data?.enhancedPrompt || result || ''
      const originalLength = result?.originalLength || basePrompt.trim().length
      const enhancedLength = result?.enhancedLength || enhancedPromptText.length
      
      // Store enhancement in localStorage for history
      const enhancementData = {
        id: `enhancement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        originalPrompt: basePrompt.trim(),
        enhancedPrompt: enhancedPromptText,
        userQuery: userQuery.trim(),
        phase,
        orchestratorId: orchestratorId.trim(),
        orchestratorName: orchestrators?.find((o: any) => (o._id || o.id) === orchestratorId.trim())?.name || 'Unknown',
        originalLength,
        enhancedLength,
        options: {
          includeFewShot,
          includeContext,
          maxFewShotExamples,
        },
        timestamp: new Date().toISOString(),
      }
      
      // Save to localStorage (client-side only)
      if (typeof window !== 'undefined') {
        const existingHistory = JSON.parse(localStorage.getItem('prompt-enhancement-history') || '[]')
        existingHistory.unshift(enhancementData)
        // Keep only last 100 enhancements
        const limitedHistory = existingHistory.slice(0, 100)
        localStorage.setItem('prompt-enhancement-history', JSON.stringify(limitedHistory))
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event('prompt-enhancement-updated'))
      }
      
      if (onEnhancementComplete) {
        onEnhancementComplete(enhancementData)
      }
      toast({
        title: 'Enhancement Complete',
        description: `Prompt enhanced for ${phase} phase`,
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to enhance prompt',
        variant: 'destructive',
      })
    }
  }

  // Extract enhanced prompt from the response
  const result = enhancePrompt.data
  const enhancedPromptText = result?.enhancedPrompt || result?.data?.enhancedPrompt || (typeof result === 'string' ? result : '')

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="orchestrator">Orchestrator</Label>
            <Select value={orchestratorId} onValueChange={(value) => setOrchestratorId(value)}>
              <SelectTrigger id="orchestrator" className="mt-1">
                <SelectValue placeholder="Select an orchestrator" />
              </SelectTrigger>
              <SelectContent>
                {(orchestrators || []).map((orch: any) => {
                  const id = orch._id || orch.id
                  return (
                    <SelectItem key={id} value={id}>
                      {orch.name}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="phase">Phase</Label>
            <Select value={phase} onValueChange={(v) => setPhase(v as any)}>
              <SelectTrigger id="phase" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thought">Thought</SelectItem>
                <SelectItem value="plan">Plan</SelectItem>
                <SelectItem value="execution">Execution</SelectItem>
                <SelectItem value="summary">Summary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="user-query">User Query</Label>
            <Input
              id="user-query"
              placeholder="Enter the user query..."
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="base-prompt">Base Prompt</Label>
            <Textarea
              id="base-prompt"
              placeholder="Enter the base system prompt..."
              value={basePrompt}
              onChange={(e) => setBasePrompt(e.target.value)}
              className="mt-1 min-h-[150px]"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-few-shot"
                checked={includeFewShot}
                onCheckedChange={(checked) => setIncludeFewShot(checked as boolean)}
              />
              <Label htmlFor="include-few-shot" className="cursor-pointer">
                Include Few-Shot Examples
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-context"
                checked={includeContext}
                onCheckedChange={(checked) => setIncludeContext(checked as boolean)}
              />
              <Label htmlFor="include-context" className="cursor-pointer">
                Include Context
              </Label>
            </div>
            {includeFewShot && (
              <div>
                <Label htmlFor="max-examples">Max Few-Shot Examples</Label>
                <Input
                  id="max-examples"
                  type="number"
                  min={1}
                  max={10}
                  value={maxFewShotExamples}
                  onChange={(e) => setMaxFewShotExamples(parseInt(e.target.value) || 3)}
                  className="mt-1 w-32"
                />
              </div>
            )}
          </div>

          <Button onClick={handleEnhance} disabled={!basePrompt.trim() || !userQuery.trim() || !orchestratorId.trim() || enhancePrompt.isPending} className="w-full">
            {enhancePrompt.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enhancing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Enhance Prompt
              </>
            )}
          </Button>
        </div>
      </Card>

      {enhancePrompt.isPending && (
        <Card className="p-12">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Enhancing prompt...</span>
          </div>
        </Card>
      )}

      {enhancePrompt.error && (
        <Card className="p-6 border-red-200 bg-red-50 dark:bg-red-950/20">
          <div className="text-red-600">Error: {enhancePrompt.error.message}</div>
        </Card>
      )}

      {enhancedPromptText && (
        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Enhanced Prompt</h3>
            <div className="p-4 bg-muted rounded-md">
              <pre className="text-sm whitespace-pre-wrap font-mono">{enhancedPromptText}</pre>
            </div>
            <div className="text-sm text-muted-foreground">
              Length: {result?.originalLength || basePrompt.length} → {result?.enhancedLength || enhancedPromptText.length} characters
              ({enhancedPromptText.length > basePrompt.length ? '+' : ''}
              {enhancedPromptText.length - basePrompt.length})
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}


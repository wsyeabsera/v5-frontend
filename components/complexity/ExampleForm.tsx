'use client'

import { useState } from 'react'
import { ComplexityExample, ComplexityConfig } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ExampleFormProps {
  example?: ComplexityExample
  onSubmit: (example: Omit<ComplexityExample, 'id' | 'embedding' | 'createdAt' | 'updatedAt' | 'usageCount'>) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

export function ExampleForm({ example, onSubmit, onCancel, isLoading = false }: ExampleFormProps) {
  const [query, setQuery] = useState(example?.query || '')
  const [complexityScore, setComplexityScore] = useState(
    example?.config.complexityScore || 0.5
  )
  const [reasoningPasses, setReasoningPasses] = useState<1 | 2 | 3>(
    (example?.config.reasoningPasses as 1 | 2 | 3) || 2
  )
  const [confidence, setConfidence] = useState(
    example?.config.confidence ?? 0.8
  )
  const [tags, setTags] = useState(
    example?.config.tags?.join(', ') || ''
  )
  const [agentHints, setAgentHints] = useState(
    example?.config.agentHints?.join(', ') || ''
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const config: ComplexityConfig = {
      complexityScore,
      reasoningPasses,
      confidence,
    }

    if (tags.trim()) {
      config.tags = tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
    }

    if (agentHints.trim()) {
      config.agentHints = agentHints.split(',').map(h => h.trim()).filter(h => h.length > 0)
    }

    await onSubmit({
      query: query.trim(),
      config,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Query Input */}
      <div className="space-y-2">
        <Label htmlFor="query">Query Text</Label>
        <Textarea
          id="query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter example query..."
          rows={3}
          required
          disabled={isLoading}
        />
      </div>

      {/* Complexity Score */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="complexityScore">Complexity Score</Label>
          <span className="text-sm text-muted-foreground">
            {(complexityScore * 100).toFixed(0)}%
          </span>
        </div>
        <Slider
          id="complexityScore"
          value={[complexityScore]}
          onValueChange={(value) => setComplexityScore(value[0])}
          min={0}
          max={1}
          step={0.01}
          disabled={isLoading}
        />
      </div>

      {/* Reasoning Passes */}
      <div className="space-y-2">
        <Label htmlFor="reasoningPasses">Reasoning Passes</Label>
        <Select
          value={reasoningPasses.toString()}
          onValueChange={(value) => setReasoningPasses(parseInt(value) as 1 | 2 | 3)}
          disabled={isLoading}
        >
          <SelectTrigger id="reasoningPasses">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 Pass (Simple)</SelectItem>
            <SelectItem value="2">2 Passes (Medium)</SelectItem>
            <SelectItem value="3">3 Passes (Complex)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Confidence */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="confidence">Confidence (Optional)</Label>
          <span className="text-sm text-muted-foreground">
            {(confidence * 100).toFixed(0)}%
          </span>
        </div>
        <Slider
          id="confidence"
          value={[confidence]}
          onValueChange={(value) => setConfidence(value[0])}
          min={0}
          max={1}
          step={0.01}
          disabled={isLoading}
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label htmlFor="tags">Tags (Optional, comma-separated)</Label>
        <Input
          id="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g., analysis, facility, query"
          disabled={isLoading}
        />
      </div>

      {/* Agent Hints */}
      <div className="space-y-2">
        <Label htmlFor="agentHints">Agent Hints (Optional, comma-separated)</Label>
        <Input
          id="agentHints"
          value={agentHints}
          onChange={(e) => setAgentHints(e.target.value)}
          placeholder="e.g., thought-agent, planner-agent"
          disabled={isLoading}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading || !query.trim()}>
          {isLoading ? 'Saving...' : example ? 'Update Example' : 'Create Example'}
        </Button>
      </div>
    </form>
  )
}


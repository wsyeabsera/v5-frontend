'use client'

import { useState } from 'react'
import { ThoughtExample } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ThoughtExampleFormProps {
  example?: ThoughtExample
  onSubmit: (example: Omit<ThoughtExample, 'id' | 'embedding' | 'createdAt' | 'updatedAt' | 'usageCount'>) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

export function ThoughtExampleForm({ example, onSubmit, onCancel, isLoading = false }: ThoughtExampleFormProps) {
  const [query, setQuery] = useState(example?.query || '')
  const [reasoning, setReasoning] = useState(example?.reasoning || '')
  const [approaches, setApproaches] = useState(example?.approaches.join('\n') || '')
  const [constraints, setConstraints] = useState(example?.constraints.join('\n') || '')
  const [assumptions, setAssumptions] = useState(example?.assumptions.join('\n') || '')
  const [uncertainties, setUncertainties] = useState(example?.uncertainties.join('\n') || '')
  const [recommendedTools, setRecommendedTools] = useState(example?.recommendedTools.join(', ') || '')
  const [successRating, setSuccessRating] = useState(example?.successRating ?? 0.8)
  const [tags, setTags] = useState(example?.tags?.join(', ') || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Convert newline-separated strings to arrays
    const parseArray = (text: string): string[] => {
      return text.split('\n').map(s => s.trim()).filter(s => s.length > 0)
    }

    await onSubmit({
      query: query.trim(),
      reasoning: reasoning.trim(),
      approaches: parseArray(approaches),
      constraints: parseArray(constraints),
      assumptions: parseArray(assumptions),
      uncertainties: parseArray(uncertainties),
      recommendedTools: recommendedTools.split(',').map(t => t.trim()).filter(t => t.length > 0),
      successRating,
      tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
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

      {/* Reasoning */}
      <div className="space-y-2">
        <Label htmlFor="reasoning">Reasoning</Label>
        <Textarea
          id="reasoning"
          value={reasoning}
          onChange={(e) => setReasoning(e.target.value)}
          placeholder="Example reasoning about the problem..."
          rows={4}
          required
          disabled={isLoading}
        />
      </div>

      {/* Approaches */}
      <div className="space-y-2">
        <Label htmlFor="approaches">Approaches (one per line)</Label>
        <Textarea
          id="approaches"
          value={approaches}
          onChange={(e) => setApproaches(e.target.value)}
          placeholder="Approach 1&#10;Approach 2&#10;..."
          rows={4}
          disabled={isLoading}
        />
      </div>

      {/* Constraints */}
      <div className="space-y-2">
        <Label htmlFor="constraints">Constraints (one per line)</Label>
        <Textarea
          id="constraints"
          value={constraints}
          onChange={(e) => setConstraints(e.target.value)}
          placeholder="Constraint 1&#10;Constraint 2&#10;..."
          rows={3}
          disabled={isLoading}
        />
      </div>

      {/* Assumptions */}
      <div className="space-y-2">
        <Label htmlFor="assumptions">Assumptions (one per line)</Label>
        <Textarea
          id="assumptions"
          value={assumptions}
          onChange={(e) => setAssumptions(e.target.value)}
          placeholder="Assumption 1&#10;Assumption 2&#10;..."
          rows={3}
          disabled={isLoading}
        />
      </div>

      {/* Uncertainties */}
      <div className="space-y-2">
        <Label htmlFor="uncertainties">Uncertainties (one per line)</Label>
        <Textarea
          id="uncertainties"
          value={uncertainties}
          onChange={(e) => setUncertainties(e.target.value)}
          placeholder="Uncertainty 1&#10;Uncertainty 2&#10;..."
          rows={3}
          disabled={isLoading}
        />
      </div>

      {/* Recommended Tools */}
      <div className="space-y-2">
        <Label htmlFor="recommendedTools">Recommended Tools (comma-separated)</Label>
        <Input
          id="recommendedTools"
          value={recommendedTools}
          onChange={(e) => setRecommendedTools(e.target.value)}
          placeholder="list_facilities, get_facility, generate_facility_report"
          disabled={isLoading}
        />
      </div>

      {/* Success Rating */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="successRating">Success Rating</Label>
          <span className="text-sm text-muted-foreground">
            {(successRating * 100).toFixed(0)}%
          </span>
        </div>
        <Slider
          id="successRating"
          value={[successRating]}
          onValueChange={(value) => setSuccessRating(value[0])}
          min={0}
          max={1}
          step={0.01}
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          How effective this example pattern has been (0-100%)
        </p>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          id="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g., facility-health, data-query, compliance"
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
        <Button type="submit" disabled={isLoading || !query.trim() || !reasoning.trim()}>
          {isLoading ? 'Saving...' : example ? 'Update Example' : 'Create Example'}
        </Button>
      </div>
    </form>
  )
}


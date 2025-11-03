'use client'

import { useState } from 'react'
import { PlanExample } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface PlannerExampleFormProps {
  example?: PlanExample
  onSubmit: (example: Omit<PlanExample, 'id' | 'embedding' | 'createdAt' | 'updatedAt' | 'usageCount'>) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

interface StepFormData {
  description: string
  action: string
  parameters: string // JSON string
}

export function PlannerExampleForm({ example, onSubmit, onCancel, isLoading = false }: PlannerExampleFormProps) {
  const [query, setQuery] = useState(example?.query || '')
  const [goal, setGoal] = useState(example?.goal || '')
  const [steps, setSteps] = useState<StepFormData[]>(
    example?.steps?.map(s => ({
      description: s.description || '',
      action: s.action || '',
      parameters: s.parameters ? JSON.stringify(s.parameters, null, 2) : '',
    })) || [{ description: '', action: '', parameters: '' }]
  )
  const [rationale, setRationale] = useState(example?.rationale || '')
  const [successRating, setSuccessRating] = useState(example?.successRating ?? 0.8)
  const [tags, setTags] = useState(example?.tags?.join(', ') || '')
  const [parameterErrors, setParameterErrors] = useState<{ [index: number]: string }>({})

  const addStep = () => {
    setSteps([...steps, { description: '', action: '', parameters: '' }])
  }

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index))
      // Remove error for deleted step
      setParameterErrors({ ...parameterErrors, [index]: undefined })
    }
  }

  const updateStep = (index: number, field: keyof StepFormData, value: string) => {
    const updated = [...steps]
    updated[index] = { ...updated[index], [field]: value }
    setSteps(updated)

    // Validate JSON when parameters change
    if (field === 'parameters' && value.trim()) {
      try {
        JSON.parse(value)
        const errors = { ...parameterErrors }
        delete errors[index]
        setParameterErrors(errors)
      } catch (e) {
        setParameterErrors({ ...parameterErrors, [index]: 'Invalid JSON format' })
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate all parameter JSONs
    const errors: { [index: number]: string } = {}
    steps.forEach((step, index) => {
      if (step.parameters.trim()) {
        try {
          JSON.parse(step.parameters)
        } catch (e) {
          errors[index] = 'Invalid JSON format'
        }
      }
    })

    if (Object.keys(errors).length > 0) {
      setParameterErrors(errors)
      return
    }

    // Parse and validate steps
    const parsedSteps = steps.map(step => {
      const stepData: { description: string; action: string; parameters?: Record<string, any> } = {
        description: step.description.trim(),
        action: step.action.trim(),
      }

      if (step.parameters.trim()) {
        try {
          stepData.parameters = JSON.parse(step.parameters)
        } catch (e) {
          // Should not happen due to validation above
          console.error('Failed to parse parameters:', e)
        }
      }

      return stepData
    })

    await onSubmit({
      query: query.trim(),
      goal: goal.trim(),
      steps: parsedSteps,
      rationale: rationale.trim(),
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

      {/* Goal */}
      <div className="space-y-2">
        <Label htmlFor="goal">Goal</Label>
        <Textarea
          id="goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Enter the goal statement..."
          rows={3}
          required
          disabled={isLoading}
        />
      </div>

      {/* Steps */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Steps</Label>
          <Button type="button" variant="outline" size="sm" onClick={addStep} disabled={isLoading}>
            <Plus className="w-4 h-4 mr-1" />
            Add Step
          </Button>
        </div>

        {steps.map((step, index) => (
          <div key={index} className="p-4 border rounded-lg space-y-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">Step {index + 1}</Badge>
              {steps.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeStep(index)}
                  disabled={isLoading}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`description-${index}`}>Description</Label>
              <Input
                id={`description-${index}`}
                value={step.description}
                onChange={(e) => updateStep(index, 'description', e.target.value)}
                placeholder="Step description..."
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`action-${index}`}>Action (MCP Tool)</Label>
              <Input
                id={`action-${index}`}
                value={step.action}
                onChange={(e) => updateStep(index, 'action', e.target.value)}
                placeholder="e.g., get_facility, list_facilities"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`parameters-${index}`}>Parameters (JSON, optional)</Label>
              <Textarea
                id={`parameters-${index}`}
                value={step.parameters}
                onChange={(e) => updateStep(index, 'parameters', e.target.value)}
                placeholder='{"key": "value"}'
                rows={3}
                className="font-mono text-xs"
                disabled={isLoading}
              />
              {parameterErrors[index] && (
                <p className="text-xs text-destructive">{parameterErrors[index]}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Optional: JSON object with parameter names and example values
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Rationale */}
      <div className="space-y-2">
        <Label htmlFor="rationale">Rationale</Label>
        <Textarea
          id="rationale"
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="Explain why this plan worked well..."
          rows={4}
          required
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
          placeholder="e.g., data-query, facility-analysis, compliance"
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
        <Button type="submit" disabled={isLoading || !query.trim() || !goal.trim() || !rationale.trim()}>
          {isLoading ? 'Saving...' : example ? 'Update Example' : 'Create Example'}
        </Button>
      </div>
    </form>
  )
}


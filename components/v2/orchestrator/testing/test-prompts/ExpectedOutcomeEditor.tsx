'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'

interface ExpectedOutcome {
  success: boolean
  expectedPhases?: string[]
  maxDuration?: number
  expectedResults?: any
}

interface ExpectedOutcomeEditorProps {
  value?: ExpectedOutcome
  onChange: (outcome: ExpectedOutcome | undefined) => void
}

const PHASES = ['thought', 'plan', 'execution', 'summary']

export function ExpectedOutcomeEditor({ value, onChange }: ExpectedOutcomeEditorProps) {
  const outcome = value || { success: true }

  const updateField = <K extends keyof ExpectedOutcome>(
    field: K,
    val: ExpectedOutcome[K]
  ) => {
    onChange({ ...outcome, [field]: val })
  }

  const togglePhase = (phase: string) => {
    const phases = outcome.expectedPhases || []
    const newPhases = phases.includes(phase)
      ? phases.filter((p) => p !== phase)
      : [...phases, phase]
    updateField('expectedPhases', newPhases.length > 0 ? newPhases : undefined)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Expected Outcome (Optional)</Label>
        <Checkbox
          checked={!!value}
          onCheckedChange={(checked) => {
            if (checked) {
              onChange({ success: true })
            } else {
              onChange(undefined)
            }
          }}
        />
      </div>

      {value && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="expected-success"
              checked={outcome.success}
              onCheckedChange={(checked) => updateField('success', checked as boolean)}
            />
            <Label htmlFor="expected-success">Expected to succeed</Label>
          </div>

          <div className="space-y-2">
            <Label>Expected Phases</Label>
            <div className="flex flex-wrap gap-2">
              {PHASES.map((phase) => (
                <Badge
                  key={phase}
                  variant={outcome.expectedPhases?.includes(phase) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => togglePhase(phase)}
                >
                  {phase}
                  {outcome.expectedPhases?.includes(phase) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-duration">Max Duration (ms)</Label>
            <Input
              id="max-duration"
              type="number"
              value={outcome.maxDuration || ''}
              onChange={(e) =>
                updateField('maxDuration', e.target.value ? parseInt(e.target.value) : undefined)
              }
              placeholder="Optional maximum duration"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected-results">Expected Results (JSON)</Label>
            <Textarea
              id="expected-results"
              value={
                outcome.expectedResults
                  ? JSON.stringify(outcome.expectedResults, null, 2)
                  : ''
              }
              onChange={(e) => {
                try {
                  const parsed = e.target.value ? JSON.parse(e.target.value) : undefined
                  updateField('expectedResults', parsed)
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              placeholder="Optional expected results structure (JSON)"
              rows={4}
            />
          </div>
        </Card>
      )}
    </div>
  )
}


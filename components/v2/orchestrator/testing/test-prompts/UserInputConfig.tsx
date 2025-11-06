'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'

interface UserInput {
  stepId?: string
  field: string
  value: any
  description?: string
  order?: number
}

interface UserInputConfigProps {
  value: UserInput[]
  onChange: (inputs: UserInput[]) => void
}

export function UserInputConfig({ value, onChange }: UserInputConfigProps) {
  const addInput = () => {
    onChange([
      ...value,
      {
        field: '',
        value: '', // Ensure value is always a string, not undefined
        order: value.length + 1,
      },
    ])
  }

  const updateInput = (index: number, updates: Partial<UserInput>) => {
    const newInputs = [...value]
    newInputs[index] = { ...newInputs[index], ...updates }
    onChange(newInputs)
  }

  const removeInput = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>User Inputs Configuration</Label>
        <Button type="button" variant="outline" size="sm" onClick={addInput}>
          <Plus className="w-4 h-4 mr-2" />
          Add Input
        </Button>
      </div>

      {value.length === 0 && (
        <Card className="p-4 text-center text-muted-foreground">
          No user inputs configured. Click "Add Input" to configure inputs that will be automatically provided during test execution.
        </Card>
      )}

      <div className="space-y-3">
        {value.map((input, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor={`field-${index}`}>Field Name *</Label>
                    <Input
                      id={`field-${index}`}
                      value={input.field}
                      onChange={(e) => updateInput(index, { field: e.target.value })}
                      placeholder="e.g., facility_id"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`stepId-${index}`}>Step ID (optional)</Label>
                    <Input
                      id={`stepId-${index}`}
                      value={input.stepId || ''}
                      onChange={(e) => updateInput(index, { stepId: e.target.value || undefined })}
                      placeholder="e.g., step1"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`value-${index}`}>Value *</Label>
                  <Input
                    id={`value-${index}`}
                    value={typeof input.value === 'string' ? input.value : JSON.stringify(input.value)}
                    onChange={(e) => {
                      let parsedValue: any = e.target.value
                      try {
                        parsedValue = JSON.parse(e.target.value)
                      } catch {
                        // Keep as string if not valid JSON
                      }
                      updateInput(index, { value: parsedValue })
                    }}
                    placeholder="Enter value (JSON supported)"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`description-${index}`}>Description</Label>
                  <Textarea
                    id={`description-${index}`}
                    value={input.description || ''}
                    onChange={(e) => updateInput(index, { description: e.target.value || undefined })}
                    placeholder="Optional description..."
                    rows={2}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Label htmlFor={`order-${index}`} className="w-20">Order:</Label>
                  <Input
                    id={`order-${index}`}
                    type="number"
                    value={input.order || index + 1}
                    onChange={(e) => updateInput(index, { order: parseInt(e.target.value) || index + 1 })}
                    className="w-20"
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeInput(index)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}


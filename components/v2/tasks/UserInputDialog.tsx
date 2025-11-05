'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Loader2 } from 'lucide-react'

interface UserInput {
  stepId: string
  field: string
  description?: string
  value?: any
}

interface UserInputDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pendingInputs: Array<{
    stepId: string
    field: string
    description?: string
  }>
  onSubmit: (inputs: Array<{ stepId: string; field: string; value: any }>) => Promise<void>
  isLoading?: boolean
}

export function UserInputDialog({
  open,
  onOpenChange,
  pendingInputs,
  onSubmit,
  isLoading = false,
}: UserInputDialogProps) {
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (stepId: string, field: string, value: string) => {
    const key = `${stepId}.${field}`
    setInputValues((prev) => ({ ...prev, [key]: value }))
    // Clear error when user starts typing
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[key]
        return newErrors
      })
    }
  }

  const handleSubmit = async () => {
    // Validate all inputs
    const newErrors: Record<string, string> = {}
    const inputs: Array<{ stepId: string; field: string; value: any }> = []

    pendingInputs.forEach((input) => {
      const key = `${input.stepId}.${input.field}`
      const value = inputValues[key]

      if (!value || value.trim() === '') {
        newErrors[key] = 'This field is required'
        return
      }

      // Try to parse as JSON if it looks like JSON
      let parsedValue: any = value
      if ((value.trim().startsWith('{') || value.trim().startsWith('[')) && value.trim().endsWith('}') || value.trim().endsWith(']')) {
        try {
          parsedValue = JSON.parse(value)
        } catch {
          // If parsing fails, use as string
          parsedValue = value
        }
      }

      inputs.push({
        stepId: input.stepId,
        field: input.field,
        value: parsedValue,
      })
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      await onSubmit(inputs)
      // Reset form on success
      setInputValues({})
      setErrors({})
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to submit inputs:', error)
    }
  }

  const handleCancel = () => {
    setInputValues({})
    setErrors({})
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Provide Required Inputs</DialogTitle>
          <DialogDescription>
            This task is paused and requires your input to continue. Please provide the following information:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {pendingInputs.length === 0 ? (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm text-yellow-900 dark:text-yellow-100">No pending inputs required.</p>
            </div>
          ) : (
            pendingInputs.map((input, index) => {
              const key = `${input.stepId}.${input.field}`
              const value = inputValues[key] || ''
              const error = errors[key]

              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={key} className="text-sm font-medium">
                      {input.field}
                    </Label>
                    <span className="text-xs text-muted-foreground">(Step: {input.stepId})</span>
                  </div>
                  {input.description && (
                    <p className="text-xs text-muted-foreground">{input.description}</p>
                  )}
                  <Textarea
                    id={key}
                    value={value}
                    onChange={(e) => handleInputChange(input.stepId, input.field, e.target.value)}
                    placeholder={`Enter value for ${input.field}...`}
                    className={error ? 'border-red-500' : ''}
                    rows={3}
                  />
                  {error && (
                    <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                  )}
                </div>
              )
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || pendingInputs.length === 0}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit & Resume Task'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


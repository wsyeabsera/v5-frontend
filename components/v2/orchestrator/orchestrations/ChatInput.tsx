'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Send, Loader2, AlertCircle } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface PendingInput {
  stepId: string
  field: string
  description?: string
  type?: string
}

interface ChatInputProps {
  onSendMessage: (message: string) => void
  onSubmitUserInput?: (inputs: Array<{ stepId: string; field: string; value: any }>) => Promise<void>
  pendingInputs?: PendingInput[]
  isDisabled?: boolean
  isLoading?: boolean
  placeholder?: string
}

export function ChatInput({
  onSendMessage,
  onSubmitUserInput,
  pendingInputs,
  isDisabled = false,
  isLoading = false,
  placeholder = 'Type your message...',
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset input values when pendingInputs change
  useEffect(() => {
    if (pendingInputs && pendingInputs.length > 0) {
      setInputValues({})
      setErrors({})
    } else {
      // Clear form when no pending inputs
      setInputValues({})
      setErrors({})
      setIsSubmitting(false)
    }
  }, [pendingInputs])

  const handleSend = async () => {
    if (isSubmitting || isLoading) return

    // If we have pending inputs, submit those instead
    if (pendingInputs && pendingInputs.length > 0 && onSubmitUserInput) {
      const newErrors: Record<string, string> = {}
      const inputs: Array<{ stepId: string; field: string; value: any }> = []

      pendingInputs.forEach((input) => {
        const key = `${input.stepId}.${input.field}`
        const value = inputValues[key]

        if (!value || value.trim() === '') {
          newErrors[key] = 'This field is required'
          return
        }

        let parsedValue: any = value
        if (
          (value.trim().startsWith('{') || value.trim().startsWith('[')) &&
          (value.trim().endsWith('}') || value.trim().endsWith(']'))
        ) {
          try {
            parsedValue = JSON.parse(value)
          } catch {
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

      setIsSubmitting(true)
      try {
        await onSubmitUserInput(inputs)
        setInputValues({})
        setErrors({})
      } catch (error) {
        console.error('Failed to submit inputs:', error)
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    // Regular message send
    if (!message.trim()) return

    onSendMessage(message.trim())
    setMessage('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (stepId: string, field: string, value: string) => {
    const key = `${stepId}.${field}`
    setInputValues((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[key]
        return newErrors
      })
    }
  }

  // If we have pending inputs, show structured input form
  if (pendingInputs && pendingInputs.length > 0) {
    return (
      <Card className="p-5 border-2 border-yellow-200 dark:border-yellow-900/50 bg-yellow-50/50 dark:bg-yellow-950/20 rounded-t-lg rounded-b-none shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            <div className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
              Please provide the following information:
            </div>
          </div>
          <ScrollArea className="max-h-64">
            <div className="space-y-4 pr-4">
              {pendingInputs.map((input, index) => {
                const key = `${input.stepId}.${input.field}`
                const value = inputValues[key] || ''
                const error = errors[key]

                return (
                  <div key={index} className="space-y-2">
                    <Label htmlFor={key} className="text-sm font-medium">
                      {input.field}
                      {input.description && (
                        <span className="text-xs text-muted-foreground ml-2 font-normal">({input.description})</span>
                      )}
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Textarea
                      id={key}
                      value={value}
                      onChange={(e) => handleInputChange(input.stepId, input.field, e.target.value)}
                      placeholder={`Enter ${input.field}...`}
                      className={cn(
                        'min-h-[80px] resize-none',
                        error && 'border-red-500 focus-visible:ring-red-500'
                      )}
                      rows={3}
                      disabled={isSubmitting || isDisabled}
                    />
                    {error && (
                      <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {error}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
          <div className="flex justify-end pt-2 border-t border-yellow-200 dark:border-yellow-900/50">
            <Button 
              onClick={handleSend} 
              disabled={isSubmitting || isDisabled}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit & Continue
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  // Regular message input
  return (
    <div className="flex items-end gap-3 p-4 border-t bg-background rounded-b-lg">
      <div className="flex-1 relative">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={isDisabled || isLoading}
          className="resize-none min-h-[60px] max-h-[200px] pr-12"
        />
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
      <Button 
        onClick={handleSend} 
        disabled={!message.trim() || isDisabled || isLoading} 
        size="icon"
        className="h-[60px] w-[60px] shrink-0"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Send className="w-5 h-5" />
        )}
      </Button>
    </div>
  )
}

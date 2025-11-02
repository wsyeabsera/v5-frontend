'use client'

import { FormEvent, ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2 } from 'lucide-react'

interface ChatInputProps {
  input: string
  handleInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void
  isLoading: boolean
}

export function ChatInput({ 
  input, 
  handleInputChange, 
  handleSubmit, 
  isLoading 
}: ChatInputProps) {
  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Textarea
        value={input}
        onChange={handleInputChange}
        placeholder="Ask about facilities, shipments, or operations..."
        className="min-h-[44px] max-h-[200px] resize-none text-[13px] border-border/40 dark:border-border/20"
        disabled={isLoading}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e as any)
          }
        }}
      />
      <Button 
        type="submit" 
        disabled={isLoading || !input.trim()}
        className="h-[44px] px-3"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </Button>
    </form>
  )
}


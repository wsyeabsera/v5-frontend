'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Loader2, User, Bot, AlertCircle } from 'lucide-react'
import { ChatMessage as ChatMessageType } from './types'
import { SummaryMessage } from './SummaryMessage'

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.type === 'user'
  const isSystem = message.type === 'system'
  const isUserInputRequired = message.type === 'user_input_required'
  const isAssistant = message.type === 'assistant'

  // System messages - hide these, we don't need them anymore
  if (isSystem) {
    return null
  }

  // User input required messages
  if (isUserInputRequired) {
    return (
      <div className="flex justify-start my-4 animate-fade-in">
        <div className="max-w-2xl w-full">
          <Card className="p-5 bg-yellow-50 dark:bg-yellow-950/30 border-2 border-yellow-200 dark:border-yellow-900/50 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1 space-y-3">
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">{message.content}</p>
                {message.pendingInputs && message.pendingInputs.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-yellow-200 dark:border-yellow-900/50">
                    <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 uppercase tracking-wide">
                      Required Fields:
                    </p>
                    <div className="space-y-1.5">
                      {message.pendingInputs.map((input, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-yellow-700 dark:text-yellow-300">
                          <span className="font-semibold min-w-[80px]">{input.field}:</span>
                          <span>{input.description || `Please provide ${input.field}`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
          <div className="text-xs text-muted-foreground px-2 mt-1.5">
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    )
  }

  // User messages
  if (isUser) {
    return (
      <div className="flex justify-end my-4 animate-fade-in">
        <div className="max-w-2xl w-full space-y-1.5">
          <div className="flex items-end gap-2 justify-end">
            <div className="flex-1" />
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mb-1">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
            <Card className="p-4 bg-primary text-primary-foreground rounded-2xl rounded-br-md shadow-sm max-w-[85%]">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
            </Card>
          </div>
          <div className="text-xs text-muted-foreground text-right px-2">
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    )
  }

  // Assistant messages - simplified, clean display
  if (isAssistant) {
    // Check if this is a summary message (completed phase with substantial content)
    const isSummary = (message.phase === 'completed' || message.phase === 'summary') && 
                     message.content && 
                     message.content.trim().length > 50 && 
                     !message.isLoading

    // If it's a summary, use the SummaryMessage component
    if (isSummary) {
      return (
        <div className="flex justify-start my-4 animate-fade-in">
          <div className="max-w-3xl w-full space-y-1.5">
            <SummaryMessage content={message.content} />
            <div className="text-xs text-muted-foreground px-2">
              {formatTime(message.timestamp)}
            </div>
          </div>
        </div>
      )
    }

    // Regular assistant message (loading or intermediate)
    return (
      <div className="flex justify-start my-4 animate-fade-in">
        <div className="max-w-2xl w-full space-y-1.5">
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <Card className="p-4 bg-card border rounded-2xl rounded-bl-md shadow-sm flex-1">
              <div className="flex items-start gap-2">
                {message.isLoading && (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 text-sm whitespace-pre-wrap leading-relaxed">
                  {message.content || (message.isLoading ? 'Processing...' : '')}
                </div>
              </div>
            </Card>
          </div>
          <div className="text-xs text-muted-foreground px-2">
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    )
  }

  return null
}

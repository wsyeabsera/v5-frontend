'use client'

import { Message } from 'ai'
import { ScrollArea } from '@/components/ui/scroll-area'
import { User, Bot, Wrench } from 'lucide-react'
import { useEffect, useRef } from 'react'

interface MessageListProps {
  messages: Message[]
}

export function MessageList({ messages }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  if (messages.length === 0) {
    return null
  }

  return (
    <ScrollArea className="h-full">
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-2.5 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted/40 dark:bg-muted/20 rounded-bl-sm'
              }`}
            >
              <div className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                {message.content}
              </div>
              
              {message.toolInvocations && message.toolInvocations.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {message.toolInvocations.map((tool: any, i: number) => (
                    <div
                      key={i}
                      className="text-xs rounded-lg p-2 bg-background/40 dark:bg-background/20 border-0"
                    >
                      <div className="flex items-center gap-1.5 mb-1.5 font-medium">
                        <Wrench className="w-2.5 h-2.5" />
                        <span className="text-[11px]">{tool.toolName}</span>
                        {tool.state === 'result' && (
                          <span className="ml-auto text-primary text-[10px]">✓</span>
                        )}
                        {tool.state === 'call' && (
                          <span className="ml-auto text-yellow-500 text-[10px]">⏳</span>
                        )}
                      </div>
                      
                      {tool.args && Object.keys(tool.args).length > 0 && (
                        <div className="mt-1.5">
                          <div className="text-[9px] uppercase font-semibold text-muted-foreground mb-1">
                            Arguments
                          </div>
                          <pre className="p-1.5 bg-background/60 dark:bg-background/40 rounded text-[10px] overflow-x-auto font-mono">
                            {JSON.stringify(tool.args, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      {tool.state === 'result' && tool.result && (
                        <div className="mt-1.5">
                          <div className="text-[9px] uppercase font-semibold text-primary mb-1">
                            Result
                          </div>
                          <pre className="p-1.5 bg-background/60 dark:bg-background/40 rounded text-[10px] overflow-x-auto max-h-32 font-mono">
                            {typeof tool.result === 'string'
                              ? tool.result
                              : JSON.stringify(tool.result, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {message.role === 'user' && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}
        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  )
}


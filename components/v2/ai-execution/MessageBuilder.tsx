'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Plus, Trash2, GripVertical } from 'lucide-react'

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface MessageBuilderProps {
  messages: Message[]
  onChange: (messages: Message[]) => void
}

export function MessageBuilder({ messages, onChange }: MessageBuilderProps) {
  const addMessage = () => {
    onChange([...messages, { role: 'user', content: '' }])
  }

  const updateMessage = (index: number, updates: Partial<Message>) => {
    const newMessages = [...messages]
    newMessages[index] = { ...newMessages[index], ...updates }
    onChange(newMessages)
  }

  const removeMessage = (index: number) => {
    onChange(messages.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Messages *</Label>
        <Button type="button" variant="outline" size="sm" onClick={addMessage} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Message
        </Button>
      </div>

      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-dashed border-border bg-muted/30">
          <p className="text-sm text-muted-foreground mb-4">No messages added yet</p>
          <Button type="button" variant="outline" onClick={addMessage} className="gap-2">
            <Plus className="w-4 h-4" />
            Add First Message
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((message, index) => (
            <MessageItem
              key={index}
              message={message}
              index={index}
              onUpdate={(updates) => updateMessage(index, updates)}
              onRemove={() => removeMessage(index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface MessageItemProps {
  message: Message
  index: number
  onUpdate: (updates: Partial<Message>) => void
  onRemove: () => void
}

function MessageItem({ message, index, onUpdate, onRemove }: MessageItemProps) {
  const roleColors = {
    system: 'border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20',
    user: 'border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20',
    assistant: 'border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/20',
  }

  return (
    <Card className={`p-4 ${roleColors[message.role]}`}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
          <Select value={message.role} onValueChange={(value) => onUpdate({ role: value as Message['role'] })}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="assistant">Assistant</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1 text-xs text-muted-foreground">
            Message {index + 1}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        <Textarea
          placeholder="Enter message content..."
          value={message.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          rows={4}
          className="resize-none"
        />
      </div>
    </Card>
  )
}

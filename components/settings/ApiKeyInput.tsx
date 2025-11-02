'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { useState } from 'react'
import { Eye, EyeOff, Check } from 'lucide-react'

interface ApiKeyInputProps {
  provider: 'anthropic' | 'openai' | 'google' | 'groq'
  label: string
  placeholder: string
}

export function ApiKeyInput({ provider, label, placeholder }: ApiKeyInputProps) {
  const { apiKeys, setApiKey } = useStore()
  const [show, setShow] = useState(false)
  const [value, setValue] = useState(apiKeys[provider] || '')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    console.log(`[ApiKeyInput] Saving ${provider} key:`, value ? `${value.substring(0, 10)}...` : 'empty')
    setApiKey(provider, value)
    
    // Verify it was saved
    setTimeout(() => {
      const currentKeys = useStore.getState().apiKeys
      console.log(`[ApiKeyInput] After save, all keys:`, Object.keys(currentKeys).filter(k => currentKeys[k as keyof typeof currentKeys]))
      console.log(`[ApiKeyInput] ${provider} key in store:`, currentKeys[provider] ? 'YES' : 'NO')
    }, 100)
    
    setSaved(true)
    // Hide the success message after 2 seconds
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-1.5">
      <label className="text-[13px] font-medium text-foreground">{label}</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setSaved(false) // Reset saved state when user types
            }}
            placeholder={placeholder}
            className="pr-9 h-9 font-mono text-[12px] border-border/40 dark:border-border/20"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted/30"
            onClick={() => setShow(!show)}
            aria-label={show ? 'Hide key' : 'Show key'}
          >
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </Button>
        </div>
        <Button 
          onClick={handleSave}
          disabled={!value || value === apiKeys[provider]}
          className="min-w-[75px] h-9 text-[13px]"
          size="sm"
        >
          {saved ? (
            <>
              <Check className="w-3.5 h-3.5 mr-1" />
              Saved
            </>
          ) : (
            'Save'
          )}
        </Button>
      </div>
      {saved && (
        <p className="text-[11px] text-primary flex items-center gap-1">
          <Check className="w-3 h-3" />
          API key saved successfully
        </p>
      )}
    </div>
  )
}


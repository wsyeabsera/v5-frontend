'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/lib/store'
import { useState } from 'react'
import { Eye, EyeOff, Check, Copy } from 'lucide-react'

interface ApiKeyInputProps {
  provider: 'anthropic' | 'openai' | 'google' | 'groq'
  label: string
  placeholder: string
}

const PROVIDER_CONFIG: Record<string, { color: string; icon: string }> = {
  anthropic: { color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900', icon: '🤖' },
  openai: { color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900', icon: '🧠' },
  google: { color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900', icon: '🔍' },
  groq: { color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900', icon: '⚡' },
}

export function ApiKeyInput({ provider, label, placeholder }: ApiKeyInputProps) {
  const { apiKeys, setApiKey } = useStore()
  const [show, setShow] = useState(false)
  const [value, setValue] = useState(apiKeys[provider] || '')
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleSave = () => {
    console.log(`[ApiKeyInput] Saving ${provider} key:`, value ? `${value.substring(0, 10)}...` : 'empty')
    setApiKey(provider, value)
    
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleCopy = async () => {
    if (value) {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const providerConfig = PROVIDER_CONFIG[provider]

  return (
    <div className="group relative p-4 rounded-lg border border-border/40 dark:border-border/20 bg-card/50 hover:bg-card/80 transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`${providerConfig.color} font-medium`}>
            <span className="mr-1">{providerConfig.icon}</span>
            {label}
          </Badge>
        </div>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2 text-xs"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </>
            )}
          </Button>
        )}
      </div>
      
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setSaved(false)
            }}
            placeholder={placeholder}
            className="pr-20 h-10 font-mono text-sm border-border/60 focus:border-primary/50 transition-colors"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-muted/50"
              onClick={() => setShow(!show)}
              aria-label={show ? 'Hide key' : 'Show key'}
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <Button 
          onClick={handleSave}
          disabled={!value || value === apiKeys[provider]}
          className="min-w-[90px] h-10"
          size="sm"
        >
          {saved ? (
            <>
              <Check className="w-4 h-4 mr-1.5" />
              Saved
            </>
          ) : (
            'Save'
          )}
        </Button>
      </div>
      
      {saved && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 animate-fade-in">
          <Check className="w-3.5 h-3.5" />
          <span>API key saved successfully</span>
        </div>
      )}
    </div>
  )
}


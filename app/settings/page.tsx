import { ModelSelector } from '@/components/settings/ModelSelector'
import { ApiKeyInput } from '@/components/settings/ApiKeyInput'
import { StorageDebug } from '@/components/settings/StorageDebug'
import { Card } from '@/components/ui/card'
import { Key, Sparkles, Info } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="mb-1">Settings</h1>
          <p className="text-[13px] text-muted-foreground">
            Configure your AI models and API keys
          </p>
        </div>

        {/* Model Selection */}
        <div className="space-y-3 pb-6 border-b border-border/40 dark:border-border/20">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-medium">AI Model</h3>
          </div>
          <p className="text-[13px] text-muted-foreground">
            Choose your preferred language model
          </p>
          <ModelSelector />
        </div>

        {/* API Keys */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            <h3 className="font-medium">API Keys</h3>
          </div>
          
          <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted/30 dark:bg-muted/10 border-0">
            <Info className="w-3.5 h-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Your API keys are stored locally in your browser and never sent to our servers.
            </p>
          </div>
          
          <div className="space-y-3">
            <ApiKeyInput
              provider="anthropic"
              label="Anthropic API Key"
              placeholder="sk-ant-..."
            />
            <ApiKeyInput
              provider="openai"
              label="OpenAI API Key"
              placeholder="sk-..."
            />
            <ApiKeyInput
              provider="google"
              label="Google API Key"
              placeholder="AIza..."
            />
            <ApiKeyInput
              provider="groq"
              label="Groq API Key"
              placeholder="gsk_..."
            />
          </div>

          {/* Debug Component */}
          <StorageDebug />
        </div>
      </div>
    </div>
  )
}


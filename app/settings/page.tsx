import { ModelSelector } from '@/components/settings/ModelSelector'
import { ApiKeyInput } from '@/components/settings/ApiKeyInput'
import { OllamaConfig } from '@/components/settings/OllamaConfig'
import { ModelTestList } from '@/components/settings/ModelTestList'
import { StorageDebug } from '@/components/settings/StorageDebug'
import { AgentConfigList } from '@/components/settings/AgentConfigList'
import { Key, Sparkles, Info, Server, TestTube, Settings as SettingsIcon, Cog, CheckSquare, Bot } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function SettingsPage() {
  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-background via-background to-muted/10">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <SettingsIcon className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Settings
            </h1>
          </div>
          <p className="text-sm text-muted-foreground ml-11">
            Configure your AI models and API keys
          </p>
        </div>

        <Tabs defaultValue="configuration" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-6">
            <TabsTrigger value="configuration" className="gap-2">
              <Cog className="w-4 h-4" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="testing" className="gap-2">
              <TestTube className="w-4 h-4" />
              Testing
            </TabsTrigger>
            <TabsTrigger value="selection" className="gap-2">
              <CheckSquare className="w-4 h-4" />
              Selection
            </TabsTrigger>
            <TabsTrigger value="agents" className="gap-2">
              <Bot className="w-4 h-4" />
              Agents
            </TabsTrigger>
          </TabsList>

          {/* Configuration Tab */}
          <TabsContent value="configuration" className="space-y-6 mt-6">
            {/* API Keys */}
            <Card className="p-6 shadow-sm hover:shadow-md transition-all duration-300 border-border/50 animate-slide-up">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
                  <div>
                    <h3 className="font-semibold text-lg">API Keys</h3>
                    <p className="text-xs text-muted-foreground">Configure your API credentials</p>
        </div>
          </div>
          
                <div className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/20 border border-blue-200/50 dark:border-blue-900/30">
                  <Info className="w-4 h-4 mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
              Your API keys are stored locally in your browser and never sent to our servers.
            </p>
          </div>
          
                <div className="space-y-4">
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
            </Card>

            {/* Ollama Configuration */}
            <Card className="p-6 shadow-sm hover:shadow-md transition-all duration-300 border-border/50 animate-slide-up" style={{ animationDelay: '100ms' }}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Server className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Ollama Configuration</h3>
                    <p className="text-xs text-muted-foreground">Configure your local Ollama server and models</p>
                  </div>
                </div>
                <OllamaConfig />
              </div>
            </Card>
          </TabsContent>

          {/* Testing Tab */}
          <TabsContent value="testing" className="space-y-6 mt-6">
            <Card className="p-6 shadow-sm hover:shadow-md transition-all duration-300 border-border/50 animate-fade-in">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <TestTube className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Test Models</h3>
                    <p className="text-xs text-muted-foreground">Test your API keys and Ollama models to verify they're working</p>
                  </div>
                </div>
                <ModelTestList />
              </div>
            </Card>
          </TabsContent>

          {/* Selection Tab */}
          <TabsContent value="selection" className="space-y-6 mt-6">
            <Card className="p-6 shadow-sm hover:shadow-md transition-all duration-300 border-border/50 animate-scale-in">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">AI Model Selection</h3>
                    <p className="text-xs text-muted-foreground">Choose your preferred language model (only tested models are available)</p>
                  </div>
                </div>
                <ModelSelector />
              </div>
            </Card>
          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents" className="space-y-6 mt-6">
            <Card className="p-6 shadow-sm hover:shadow-md transition-all duration-300 border-border/50 animate-fade-in">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10">
                    <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Agent Configurations</h3>
                    <p className="text-xs text-muted-foreground">Configure AI models and parameters for each agent</p>
                  </div>
                </div>
                <AgentConfigList />
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

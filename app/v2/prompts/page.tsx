'use client'

import { LocalPromptList } from '@/components/v2/prompts/LocalPromptList'
import { RemotePromptList } from '@/components/v2/prompts/RemotePromptList'
import { InitPromptsButton } from '@/components/v2/prompts/InitPromptsButton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageSquare, Database, Cloud } from 'lucide-react'

export default function PromptsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Prompt Management</h1>
        </div>
        <p className="text-muted-foreground">
          View local database prompts and remote MCP prompts. Prompts can be synchronized from the remote server.
        </p>
      </div>

      <div className="mb-6 flex justify-end">
        <InitPromptsButton />
      </div>

      <Tabs defaultValue="local" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="local" className="gap-2">
            <Database className="w-4 h-4" />
            Local Prompts
          </TabsTrigger>
          <TabsTrigger value="remote" className="gap-2">
            <Cloud className="w-4 h-4" />
            Remote Prompts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="local" className="mt-0">
          <LocalPromptList />
        </TabsContent>

        <TabsContent value="remote" className="mt-0">
          <RemotePromptList />
        </TabsContent>
      </Tabs>
    </div>
  )
}


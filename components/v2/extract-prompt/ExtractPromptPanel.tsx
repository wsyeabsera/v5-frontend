'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LocalPromptExtractor } from './LocalPromptExtractor'
import { RemotePromptExtractor } from './RemotePromptExtractor'
import { Database, Cloud } from 'lucide-react'

export function ExtractPromptPanel() {
  return (
    <Tabs defaultValue="local" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="local" className="flex items-center gap-2">
          <Database className="w-4 h-4" />
          Local
        </TabsTrigger>
        <TabsTrigger value="remote" className="flex items-center gap-2">
          <Cloud className="w-4 h-4" />
          Remote
        </TabsTrigger>
      </TabsList>
      <TabsContent value="local">
        <LocalPromptExtractor />
      </TabsContent>
      <TabsContent value="remote">
        <RemotePromptExtractor />
      </TabsContent>
    </Tabs>
  )
}


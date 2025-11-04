'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { AvailableModelsList } from '@/components/v2/settings/AvailableModelsList'
import { AgentConfigListV2 } from '@/components/v2/settings/AgentConfigListV2'
import { Database, Cpu } from 'lucide-react'

export default function V2SettingsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Version 2 Settings</h1>
        <p className="text-muted-foreground">
          Manage available models and agent configurations for the V2 system
        </p>
      </div>

      <Card className="p-6">
        <Tabs defaultValue="models" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="models" className="gap-2">
              <Database className="w-4 h-4" />
              Available Models
            </TabsTrigger>
            <TabsTrigger value="configs" className="gap-2">
              <Cpu className="w-4 h-4" />
              Agent Configurations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="models" className="mt-0">
            <AvailableModelsList />
          </TabsContent>

          <TabsContent value="configs" className="mt-0">
            <AgentConfigListV2 />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}

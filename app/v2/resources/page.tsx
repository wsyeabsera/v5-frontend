'use client'

import { ResourceList } from '@/components/v2/resources/ResourceList'
import { MCPResourceList } from '@/components/v2/resources/MCPResourceList'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FolderOpen, Database, Cloud } from 'lucide-react'

export default function ResourcesPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <FolderOpen className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Resource Management</h1>
        </div>
        <p className="text-muted-foreground">
          Manage local database resources and view remote MCP resources.
        </p>
      </div>

      <Tabs defaultValue="database" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="database" className="gap-2">
            <Database className="w-4 h-4" />
            Database Resources
          </TabsTrigger>
          <TabsTrigger value="mcp" className="gap-2">
            <Cloud className="w-4 h-4" />
            MCP Resources
          </TabsTrigger>
        </TabsList>

        <TabsContent value="database" className="mt-0">
          <ResourceList />
        </TabsContent>

        <TabsContent value="mcp" className="mt-0">
          <MCPResourceList />
        </TabsContent>
      </Tabs>
    </div>
  )
}


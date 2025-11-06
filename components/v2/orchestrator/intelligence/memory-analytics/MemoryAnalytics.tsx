'use client'

import { MemoryDashboard } from './MemoryDashboard'
import { MemoryEffectiveness } from './MemoryEffectiveness'
import { MemoryUsage } from './MemoryUsage'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function MemoryAnalytics() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="effectiveness">Effectiveness</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <MemoryDashboard />
        </TabsContent>

        <TabsContent value="effectiveness" className="space-y-4">
          <MemoryEffectiveness />
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <MemoryUsage />
        </TabsContent>
      </Tabs>
    </div>
  )
}


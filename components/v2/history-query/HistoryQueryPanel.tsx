'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SimilarTasksResults } from './SimilarTasksResults'
import { SuccessfulPlansResults } from './SuccessfulPlansResults'
import { ToolPerformanceResults } from './ToolPerformanceResults'
import { AgentInsightsResults } from './AgentInsightsResults'

export function HistoryQueryPanel() {
  return (
    <Tabs defaultValue="similar-tasks" className="w-full">
      <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-6">
        <TabsTrigger value="similar-tasks">Similar Tasks</TabsTrigger>
        <TabsTrigger value="successful-plans">Successful Plans</TabsTrigger>
        <TabsTrigger value="tool-performance">Tool Performance</TabsTrigger>
        <TabsTrigger value="agent-insights">Agent Insights</TabsTrigger>
      </TabsList>

      <TabsContent value="similar-tasks" className="mt-0">
        <SimilarTasksResults />
      </TabsContent>

      <TabsContent value="successful-plans" className="mt-0">
        <SuccessfulPlansResults />
      </TabsContent>

      <TabsContent value="tool-performance" className="mt-0">
        <ToolPerformanceResults />
      </TabsContent>

      <TabsContent value="agent-insights" className="mt-0">
        <AgentInsightsResults />
      </TabsContent>
    </Tabs>
  )
}


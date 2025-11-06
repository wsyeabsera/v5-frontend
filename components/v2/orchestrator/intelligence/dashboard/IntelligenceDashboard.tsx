'use client'

import { IntelligenceStats } from './IntelligenceStats'
import { IntelligenceHealth } from './IntelligenceHealth'
import { IntelligenceCharts } from './IntelligenceCharts'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RefreshCw, Search, Database, Tag } from 'lucide-react'
import Link from 'next/link'
import { TimeRange } from '@/components/v2/orchestrator/dashboard/TimeRangeSelector'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

interface IntelligenceDashboardProps {
  timeRange: TimeRange
}

export function IntelligenceDashboard({ timeRange }: IntelligenceDashboardProps) {
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Invalidate all intelligence-related queries
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['intelligence', 'stats'] }),
      queryClient.invalidateQueries({ queryKey: ['intelligence', 'health'] }),
      queryClient.invalidateQueries({ queryKey: ['intelligence', 'metrics'] }),
    ])
    setIsRefreshing(false)
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/v2/orchestrator/intelligence/semantic-search">
          <Button variant="outline" className="gap-2">
            <Search className="w-4 h-4" />
            Semantic Search
          </Button>
        </Link>
        <Link href="/v2/orchestrator/intelligence/embeddings">
          <Button variant="outline" className="gap-2">
            <Database className="w-4 h-4" />
            Embeddings Status
          </Button>
        </Link>
        <Link href="/v2/orchestrator/intelligence/classification">
          <Button variant="outline" className="gap-2">
            <Tag className="w-4 h-4" />
            Query Classification
          </Button>
        </Link>
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Stats Cards */}
      <IntelligenceStats timeRange={timeRange} />

      {/* Health Status */}
      <IntelligenceHealth />

      {/* Charts */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <IntelligenceCharts timeRange={timeRange} type="overview" />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <IntelligenceCharts timeRange={timeRange} type="performance" />
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <IntelligenceCharts timeRange={timeRange} type="usage" />
        </TabsContent>
      </Tabs>
    </div>
  )
}


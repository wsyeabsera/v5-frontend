'use client'

import { useState } from 'react'
import { IntelligenceDashboard } from '@/components/v2/orchestrator/intelligence/dashboard/IntelligenceDashboard'
import { DashboardLayout } from '@/components/v2/orchestrator/dashboard/DashboardLayout'
import { TimeRangeSelector, TimeRange } from '@/components/v2/orchestrator/dashboard/TimeRangeSelector'
import { Brain } from 'lucide-react'

export default function IntelligenceDashboardPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')

  return (
    <div className="container mx-auto py-8 px-4 max-w-[95vw]">
      <DashboardLayout
        title="Intelligence Dashboard"
        description="Overview of orchestrator intelligence features, health status, and performance metrics"
        timeRangeSelector={
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        }
      >
        <IntelligenceDashboard timeRange={timeRange} />
      </DashboardLayout>
    </div>
  )
}


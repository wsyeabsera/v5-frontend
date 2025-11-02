'use client'

import { StatsCard } from '@/components/dashboard/StatsCard'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { useSystemStats } from '@/lib/queries'
import { Building, Package, AlertTriangle, CheckCircle } from 'lucide-react'

export default function Home() {
  const { data: stats, isLoading } = useSystemStats()

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="mb-1">Dashboard</h1>
          <p className="text-[13px] text-muted-foreground">
            Monitor your waste management operations
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Facilities"
            value={isLoading ? '...' : stats?.overview.facilities || 0}
            icon={<Building className="w-4 h-4" />}
          />
          <StatsCard
            title="Shipments"
            value={isLoading ? '...' : stats?.overview.shipments || 0}
            icon={<Package className="w-4 h-4" />}
          />
          <StatsCard
            title="Contaminants"
            value={isLoading ? '...' : stats?.overview.contaminants || 0}
            icon={<AlertTriangle className="w-4 h-4" />}
          />
          <StatsCard
            title="Acceptance Rate"
            value={isLoading ? '...' : stats?.metrics.overallAcceptanceRate || '0%'}
            description="Last 30 days"
            icon={<CheckCircle className="w-4 h-4" />}
          />
        </div>

        {/* Activity Feed */}
        <ActivityFeed />
      </div>
    </div>
  )
}


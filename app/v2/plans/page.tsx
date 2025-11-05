'use client'

import { PlanList } from '@/components/v2/plans/PlanList'
import { Target } from 'lucide-react'

export default function PlansPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <Target className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Plan Management</h1>
        </div>
        <p className="text-muted-foreground">
          Generate, view, and manage execution plans created by the Planner Agent.
        </p>
      </div>

      <PlanList />
    </div>
  )
}


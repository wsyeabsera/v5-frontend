'use client'

import { SmartFeaturesPanel } from '@/components/v2/smart-features/SmartFeaturesPanel'
import { Sparkles } from 'lucide-react'

export default function SmartFeaturesPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Smart Features</h1>
        </div>
        <p className="text-muted-foreground">
          Predictive optimization and recommendations. Predict plan quality, get tool recommendations, and track costs.
        </p>
      </div>

      <SmartFeaturesPanel />
    </div>
  )
}


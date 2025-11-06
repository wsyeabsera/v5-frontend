'use client'

import { ComparisonView } from './ComparisonView'
import { FeatureImpact } from './FeatureImpact'
import { PerformanceComparison } from './PerformanceComparison'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function IntelligenceComparison() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="comparison" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
          <TabsTrigger value="comparison">A/B Comparison</TabsTrigger>
          <TabsTrigger value="impact">Feature Impact</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="space-y-4">
          <ComparisonView />
        </TabsContent>

        <TabsContent value="impact" className="space-y-4">
          <FeatureImpact />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <PerformanceComparison />
        </TabsContent>
      </Tabs>
    </div>
  )
}


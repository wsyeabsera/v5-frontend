'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlanQualityPrediction } from './PlanQualityPrediction'
import { ToolRecommendations } from './ToolRecommendations'
import { CostTracking } from './CostTracking'

export function SmartFeaturesPanel() {
  return (
    <Tabs defaultValue="plan-quality" className="w-full">
      <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
        <TabsTrigger value="plan-quality">Plan Quality</TabsTrigger>
        <TabsTrigger value="tool-recommendations">Tool Recommendations</TabsTrigger>
        <TabsTrigger value="cost-tracking">Cost Tracking</TabsTrigger>
      </TabsList>

      <TabsContent value="plan-quality" className="mt-0">
        <PlanQualityPrediction />
      </TabsContent>

      <TabsContent value="tool-recommendations" className="mt-0">
        <ToolRecommendations />
      </TabsContent>

      <TabsContent value="cost-tracking" className="mt-0">
        <CostTracking />
      </TabsContent>
    </Tabs>
  )
}


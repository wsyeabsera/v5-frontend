'use client'

import { useIntelligenceComparison } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

export function ComparisonView() {
  const { data: comparison, isLoading } = useIntelligenceComparison()

  if (isLoading) {
    return (
      <Card className="p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
      </Card>
    )
  }

  const data = comparison || {
    withIntelligence: { count: 0, successRate: 0, avgConfidence: 0, avgQuality: 0, avgLatency: 0 },
    withoutIntelligence: { count: 0, successRate: 0, avgConfidence: 0, avgQuality: 0, avgLatency: 0 },
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">With Intelligence</h3>
            <Badge variant="default">Enhanced</Badge>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Executions</p>
              <p className="text-2xl font-bold">{data.withIntelligence.count}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className="text-2xl font-bold">{data.withIntelligence.successRate.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Confidence</p>
              <p className="text-2xl font-bold">{data.withIntelligence.avgConfidence.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Quality</p>
              <p className="text-2xl font-bold">{data.withIntelligence.avgQuality.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Latency</p>
              <p className="text-2xl font-bold">{data.withIntelligence.avgLatency.toFixed(0)}ms</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Without Intelligence</h3>
            <Badge variant="outline">Baseline</Badge>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Executions</p>
              <p className="text-2xl font-bold">{data.withoutIntelligence.count}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className="text-2xl font-bold">{data.withoutIntelligence.successRate.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Confidence</p>
              <p className="text-2xl font-bold">{data.withoutIntelligence.avgConfidence.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Quality</p>
              <p className="text-2xl font-bold">{data.withoutIntelligence.avgQuality.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Latency</p>
              <p className="text-2xl font-bold">{data.withoutIntelligence.avgLatency.toFixed(0)}ms</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Improvement Metrics */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Improvement Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Success Rate</p>
            <p
              className={`text-xl font-bold ${
                data.withIntelligence.successRate > data.withoutIntelligence.successRate
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {(
                data.withIntelligence.successRate - data.withoutIntelligence.successRate
              ).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Confidence</p>
            <p
              className={`text-xl font-bold ${
                data.withIntelligence.avgConfidence > data.withoutIntelligence.avgConfidence
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {(
                data.withIntelligence.avgConfidence - data.withoutIntelligence.avgConfidence
              ).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Quality</p>
            <p
              className={`text-xl font-bold ${
                data.withIntelligence.avgQuality > data.withoutIntelligence.avgQuality
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {(
                data.withIntelligence.avgQuality - data.withoutIntelligence.avgQuality
              ).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Latency</p>
            <p
              className={`text-xl font-bold ${
                data.withIntelligence.avgLatency < data.withoutIntelligence.avgLatency
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {(
                data.withIntelligence.avgLatency - data.withoutIntelligence.avgLatency
              ).toFixed(0)}ms
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}


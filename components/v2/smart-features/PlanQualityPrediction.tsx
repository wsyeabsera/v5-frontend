'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { usePredictPlanQuality } from '@/lib/queries-intelligence/smart-features'
import { Loader2, Target, AlertTriangle } from 'lucide-react'

export function PlanQualityPrediction() {
  const [planId, setPlanId] = useState('')

  const { data: prediction, isLoading, error } = usePredictPlanQuality(planId)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="plan-id-input">Plan ID</Label>
        <Input
          id="plan-id-input"
          placeholder="Enter plan ID to predict quality..."
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
        />
      </div>

      {isLoading && planId && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">Predicting plan quality...</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
          <p className="text-sm text-red-600 dark:text-red-400">
            {error instanceof Error ? error.message : 'Failed to predict plan quality'}
          </p>
        </div>
      )}

      {!isLoading && planId && prediction && (
        <Card className="p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-semibold">Plan Quality Prediction</h3>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Success Probability</span>
                  <span className="text-sm font-bold">
                    {(((prediction as any).successProbability || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress value={((prediction as any).successProbability || 0) * 100} className="h-2" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Quality Score</span>
                  <span className="text-sm font-bold">{(prediction as any).qualityScore || 0}/100</span>
                </div>
                <Progress value={(prediction as any).qualityScore || 0} className="h-2" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Estimated Duration</div>
                <div className="text-2xl font-bold">{(prediction as any).estimatedDuration || 0}ms</div>
              </div>
              {(prediction as any).estimatedCost && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Estimated Cost</div>
                  <div className="text-2xl font-bold">${((prediction as any).estimatedCost || 0).toFixed(4)}</div>
                </div>
              )}
            </div>

            {(prediction as any).risks && (prediction as any).risks.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Risks
                </h4>
                <div className="space-y-2">
                  {(prediction as any).risks.map((risk: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Badge
                        variant={
                          risk.severity === 'high' ? 'destructive' : risk.severity === 'medium' ? 'default' : 'secondary'
                        }
                      >
                        {risk.severity}
                      </Badge>
                      <span className="text-sm">{risk.risk}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(prediction as any).recommendations && (prediction as any).recommendations.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Recommendations</h4>
                <ul className="list-disc list-inside space-y-1">
                  {(prediction as any).recommendations.map((rec: string, idx: number) => (
                    <li key={idx} className="text-sm text-muted-foreground">{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

      {!planId && (
        <div className="text-center py-12 text-muted-foreground">
          <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Enter a plan ID to predict quality</p>
        </div>
      )}
    </div>
  )
}


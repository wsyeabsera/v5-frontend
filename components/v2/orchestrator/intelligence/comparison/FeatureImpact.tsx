'use client'

import { useFeatureImpact } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export function FeatureImpact() {
  const { data: impact, isLoading } = useFeatureImpact()

  if (isLoading) {
    return (
      <Card className="p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Feature Impact Analysis</h3>
        {impact?.impact && impact.impact.length > 0 ? (
          <div className="space-y-3">
            {impact.impact.map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted rounded">
                <span className="font-medium">{item.feature}</span>
                <span
                  className={`font-bold ${
                    item.improvement > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {item.improvement > 0 ? '+' : ''}
                  {item.improvement.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No impact data available
          </div>
        )}
      </Card>
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Feature Recommendations</h3>
        {impact?.recommendations && impact.recommendations.length > 0 ? (
          <div className="space-y-3">
            {impact.recommendations.map((item: any, index: number) => (
              <div key={index} className="p-3 bg-green-50 dark:bg-green-950 rounded">
                <p className="font-medium">{item.feature}</p>
                <p className="text-sm text-muted-foreground">
                  Shows {item.improvement.toFixed(1)}% improvement
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No recommendations available
          </div>
        )}
      </Card>
    </div>
  )
}


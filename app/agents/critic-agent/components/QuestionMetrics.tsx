'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, MessageSquare, AlertCircle, CheckCircle2, Target } from 'lucide-react'
import { FollowUpQuestion } from '@/types'

interface QuestionMetricsProps {
  questions: FollowUpQuestion[]
}

export function QuestionMetrics({ questions }: QuestionMetricsProps) {
  if (!questions || questions.length === 0) {
    return null
  }

  // Calculate metrics
  const totalQuestions = questions.length
  
  // Count by priority
  const priorityCounts = questions.reduce((acc, q) => {
    acc[q.priority] = (acc[q.priority] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  // Count by category
  const categoryCounts = questions.reduce((acc, q) => {
    acc[q.category] = (acc[q.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  // Calculate specificity score
  const specificQuestions = questions.filter(q => 
    /step \d+|parameter|param|id|value|facility|timeframe|threshold|criteria/i.test(q.question)
  )
  const specificityScore = (specificQuestions.length / totalQuestions) * 100

  const metrics = [
    {
      label: 'Total Questions',
      value: totalQuestions,
      icon: MessageSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10'
    },
    {
      label: 'Specificity',
      value: `${specificityScore.toFixed(0)}%`,
      icon: Target,
      color: specificityScore >= 70 ? 'text-green-600' : specificityScore >= 50 ? 'text-yellow-600' : 'text-red-600',
      bgColor: specificityScore >= 70 ? 'bg-green-500/10' : specificityScore >= 50 ? 'bg-yellow-500/10' : 'bg-red-500/10'
    },
    {
      label: 'High Priority',
      value: priorityCounts.high || 0,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-500/10'
    },
    {
      label: 'Missing Info',
      value: categoryCounts['missing-info'] || 0,
      icon: CheckCircle2,
      color: 'text-orange-600',
      bgColor: 'bg-orange-500/10'
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Question Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((metric, idx) => {
            const Icon = metric.icon
            return (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${metric.bgColor} border-border/50`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${metric.color}`} />
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                </div>
                <div className="text-2xl font-bold">{metric.value}</div>
              </div>
            )
          })}
        </div>

        {/* Category Breakdown */}
        {Object.keys(categoryCounts).length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-muted-foreground">By Category</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(categoryCounts).map(([category, count]) => (
                <Badge key={category} variant="outline" className="text-xs">
                  {category.replace('-', ' ')}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Priority Breakdown */}
        {Object.keys(priorityCounts).length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-muted-foreground">By Priority</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(priorityCounts).map(([priority, count]) => (
                <Badge
                  key={priority}
                  variant="outline"
                  className={`text-xs ${
                    priority === 'high' ? 'bg-red-500/10 text-red-700 border-red-500/20' :
                    priority === 'medium' ? 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20' :
                    'bg-blue-500/10 text-blue-700 border-blue-500/20'
                  }`}
                >
                  {priority}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


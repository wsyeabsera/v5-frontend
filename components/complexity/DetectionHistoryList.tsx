'use client'

import { ComplexityDetectorOutput } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Loader2, Frown } from 'lucide-react'
import Link from 'next/link'

interface DetectionHistoryListProps {
  detections: ComplexityDetectorOutput[]
  isLoading: boolean
  onViewDetails?: (detection: ComplexityDetectorOutput) => void
}

export function DetectionHistoryList({
  detections,
  isLoading,
  onViewDetails,
}: DetectionHistoryListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Loading detection history...</p>
      </div>
    )
  }

  if (detections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Frown className="h-8 w-8 mb-4" />
        <p>No detection history found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {detections.map((detection) => (
        <Card key={detection.requestId} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <CardTitle className="text-base font-medium line-clamp-2">
                  {detection.userQuery}
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant={
                      detection.detectionMethod === 'semantic' ? 'default' : 'secondary'
                    }
                  >
                    {detection.detectionMethod === 'semantic' ? 'Semantic' : 'Keyword'}
                  </Badge>
                  <Badge variant="outline">
                    Score: {(detection.complexity.score * 100).toFixed(1)}%
                  </Badge>
                  <Badge variant="secondary">
                    {detection.complexity.reasoningPasses} Pass
                    {detection.complexity.reasoningPasses > 1 ? 'es' : ''}
                  </Badge>
                  {detection.similarity && (
                    <Badge variant="outline" className="text-xs">
                      Similarity: {(detection.similarity * 100).toFixed(1)}%
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/agents/complexity-detector/${detection.requestId}`}>
                  <Button variant="default" size="sm" className="gap-2">
                    Open
                  </Button>
                </Link>
                {onViewDetails && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(detection)}
                    className="gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Quick View
                  </Button>
                )}
                <Link href={`/requests?search=${detection.requestId}`}>
                  <Button variant="outline" size="sm" className="gap-2">
                    Request
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Request ID: <code className="font-mono">{detection.requestId.substring(0, 8)}...</code>
              </span>
              <span>
                {new Date(detection.timestamp).toLocaleString()}
              </span>
            </div>
            {detection.detectedKeywords && detection.detectedKeywords.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {detection.detectedKeywords.map((keyword, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">
                    {keyword}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}


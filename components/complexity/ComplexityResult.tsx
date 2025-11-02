'use client'

import { ComplexityDetectorOutput } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Hash, Brain } from 'lucide-react'

interface ComplexityResultProps {
  result: ComplexityDetectorOutput
}

export function ComplexityResult({ result }: ComplexityResultProps) {
  const { complexity, detectionMethod, similarity, matchedExampleId, llmUsed, llmExplanation, llmConfidence } = result

  return (
    <div className="space-y-4">
      {/* Detection Method Indicator */}
      <div className="flex items-center gap-2 flex-wrap">
        {detectionMethod === 'semantic' ? (
          <Badge variant="default" className="gap-2">
            <Sparkles className="w-3 h-3" />
            Semantic Match
          </Badge>
        ) : detectionMethod === 'llm' ? (
          <Badge variant="default" className="gap-2 bg-purple-600">
            <Brain className="w-3 h-3" />
            LLM Analysis
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-2">
            <Hash className="w-3 h-3" />
            Keyword Fallback
          </Badge>
        )}
        {similarity !== undefined && (
          <span className="text-sm text-muted-foreground">
            Similarity: {(similarity * 100).toFixed(1)}%
          </span>
        )}
        {llmConfidence !== undefined && (
          <span className="text-sm text-muted-foreground">
            LLM Confidence: {(llmConfidence * 100).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Complexity Score */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Complexity Score</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Score</span>
              <span className="text-2xl font-bold">
                {(complexity.score * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${complexity.score * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Reasoning Passes</span>
              <span className="text-3xl font-bold">{complexity.reasoningPasses}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {complexity.reasoningPasses === 1 && 'Simple query - single pass'}
              {complexity.reasoningPasses === 2 && 'Medium complexity - two passes'}
              {complexity.reasoningPasses === 3 && 'Complex query - three passes'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Matched Example Info */}
      {matchedExampleId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Matched Example</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Example ID: <code className="text-xs">{matchedExampleId}</code>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Detected Keywords (if fallback) */}
      {result.detectedKeywords && result.detectedKeywords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detected Keywords</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {result.detectedKeywords.map((keyword, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* LLM Explanation */}
      {llmExplanation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Explanation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{llmExplanation}</p>
          </CardContent>
        </Card>
      )}

      {/* Request ID */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request ID</CardTitle>
        </CardHeader>
        <CardContent>
          <code className="text-xs break-all">{result.requestId}</code>
        </CardContent>
      </Card>
    </div>
  )
}


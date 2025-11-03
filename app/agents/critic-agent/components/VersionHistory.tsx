'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CriticAgentOutput } from '@/types'
import { History, Clock, TrendingUp, TrendingDown, Minus, ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useState } from 'react'

interface VersionHistoryProps {
  versions: CriticAgentOutput[]
  currentVersionId: string
}

export function VersionHistory({ versions, currentVersionId }: VersionHistoryProps) {
  const [expandedVersions, setExpandedVersions] = useState<Set<number>>(new Set())

  if (!versions || versions.length === 0) {
    return null
  }

  const sortedVersions = [...versions].sort((a, b) => (a.critiqueVersion || 1) - (b.critiqueVersion || 1))

  const toggleVersion = (version: number) => {
    const newExpanded = new Set(expandedVersions)
    if (newExpanded.has(version)) {
      newExpanded.delete(version)
    } else {
      newExpanded.add(version)
    }
    setExpandedVersions(newExpanded)
  }

  const getScoreChange = (version: CriticAgentOutput, prevVersion?: CriticAgentOutput) => {
    if (!prevVersion) return null
    const change = (version.critique.overallScore - prevVersion.critique.overallScore) * 100
    if (change > 0) return { value: change, direction: 'up' as const }
    if (change < 0) return { value: Math.abs(change), direction: 'down' as const }
    return { value: 0, direction: 'same' as const }
  }

  const getRecommendationBadge = (recommendation: string) => {
    const styles = {
      approve: 'bg-green-500/10 text-green-700 border-green-500/20',
      revise: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
      reject: 'bg-red-500/10 text-red-700 border-red-500/20'
    }
    return (
      <Badge variant="outline" className={`text-xs ${styles[recommendation as keyof typeof styles]}`}>
        {recommendation}
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Version History
          <Badge variant="outline" className="ml-auto">
            {versions.length} {versions.length === 1 ? 'version' : 'versions'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedVersions.map((version, idx) => {
            const versionNum = version.critiqueVersion || idx + 1
            const isCurrent = version.critiqueVersion?.toString() === currentVersionId
            const prevVersion = idx > 0 ? sortedVersions[idx - 1] : undefined
            const scoreChange = getScoreChange(version, prevVersion)
            const isExpanded = expandedVersions.has(versionNum)

            return (
              <Collapsible
                key={versionNum}
                open={isExpanded}
                onOpenChange={() => toggleVersion(versionNum)}
              >
                <div className={`p-4 border rounded-lg transition-colors ${
                  isCurrent ? 'border-blue-500 bg-blue-500/5' : 'border-border'
                }`}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-start gap-3">
                      {/* Version Number */}
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                        isCurrent 
                          ? 'border-blue-500 bg-blue-500/10 text-blue-700' 
                          : 'border-muted-foreground/30 bg-muted/50 text-muted-foreground'
                      }`}>
                        <span className="text-sm font-bold">v{versionNum}</span>
                      </div>

                      {/* Main Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getRecommendationBadge(version.critique.recommendation)}
                          <span className="text-sm font-semibold">
                            {(version.critique.overallScore * 100).toFixed(0)}%
                          </span>
                          {scoreChange && (
                            <div className="flex items-center gap-1 text-xs">
                              {scoreChange.direction === 'up' && (
                                <TrendingUp className="w-3 h-3 text-green-600" />
                              )}
                              {scoreChange.direction === 'down' && (
                                <TrendingDown className="w-3 h-3 text-red-600" />
                              )}
                              {scoreChange.direction === 'same' && (
                                <Minus className="w-3 h-3 text-muted-foreground" />
                              )}
                              <span className={
                                scoreChange.direction === 'up' ? 'text-green-600' :
                                scoreChange.direction === 'down' ? 'text-red-600' :
                                'text-muted-foreground'
                              }>
                                {scoreChange.value > 0 ? '+' : ''}{scoreChange.value.toFixed(0)}%
                              </span>
                            </div>
                          )}
                          {isCurrent && (
                            <Badge variant="outline" className="text-xs border-blue-500 text-blue-700">
                              Current
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(version.timestamp).toLocaleString()}
                          </span>
                          <span>•</span>
                          <span>
                            {version.critique.issues.length} issues
                          </span>
                          <span>•</span>
                          <span>
                            {version.critique.followUpQuestions.length} questions
                          </span>
                          {version.planId && (
                            <>
                              <span>•</span>
                              <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                                {version.planId.slice(-8)}
                              </code>
                            </>
                          )}
                        </div>

                        {/* Key Improvements (if not first version) */}
                        {prevVersion && (
                          <div className="text-xs">
                            {version.planId !== prevVersion.planId && (
                              <Badge variant="outline" className="mr-1 bg-blue-500/10 text-blue-700 border-blue-500/20">
                                Plan updated
                              </Badge>
                            )}
                            {version.critique.followUpQuestions.length === 0 && 
                             prevVersion.critique.followUpQuestions.length > 0 && (
                              <Badge variant="outline" className="mr-1 bg-green-500/10 text-green-700 border-green-500/20">
                                Questions resolved
                              </Badge>
                            )}
                            {version.critique.issues.length < prevVersion.critique.issues.length && (
                              <Badge variant="outline" className="mr-1 bg-green-500/10 text-green-700 border-green-500/20">
                                Issues reduced
                              </Badge>
                            )}
                            {version.critique.overallScore > prevVersion.critique.overallScore && (
                              <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                                Score improved
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Expand/Collapse Icon */}
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${
                        isExpanded ? 'transform rotate-180' : ''
                      }`} />
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="mt-4 pt-4 border-t space-y-3">
                      {/* Rationale */}
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">Rationale</div>
                        <p className="text-sm">{version.critique.rationale}</p>
                      </div>

                      {/* Strengths */}
                      {version.critique.strengths && version.critique.strengths.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">Strengths</div>
                          <ul className="text-sm space-y-1">
                            {version.critique.strengths.map((strength, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-green-600 mt-0.5">✓</span>
                                <span>{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Issues */}
                      {version.critique.issues && version.critique.issues.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">Issues</div>
                          <ul className="text-sm space-y-1">
                            {version.critique.issues.map((issue, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className={`mt-0.5 ${
                                  issue.severity === 'critical' ? 'text-red-600' :
                                  issue.severity === 'high' ? 'text-orange-600' :
                                  issue.severity === 'medium' ? 'text-yellow-600' :
                                  'text-blue-600'
                                }`}>⚠</span>
                                <span>{issue.description}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}


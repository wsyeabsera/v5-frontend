'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExecutorAgentOutput } from '@/types'
import { History, Clock, CheckCircle, XCircle, ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useState } from 'react'

interface VersionHistoryProps {
  versions: ExecutorAgentOutput[]
  currentVersionId: string
}

export function VersionHistory({ versions, currentVersionId }: VersionHistoryProps) {
  const [expandedVersions, setExpandedVersions] = useState<Set<number>>(new Set())

  if (!versions || versions.length === 0) {
    return null
  }

  const sortedVersions = [...versions].sort((a, b) => (a.executionVersion || 1) - (b.executionVersion || 1))

  const toggleVersion = (version: number) => {
    const newExpanded = new Set(expandedVersions)
    if (newExpanded.has(version)) {
      newExpanded.delete(version)
    } else {
      newExpanded.add(version)
    }
    setExpandedVersions(newExpanded)
  }

  const getSuccessBadge = (overallSuccess: boolean) => {
    return overallSuccess ? (
      <Badge variant="default" className="bg-green-500/10 text-green-700 border-green-500/20">
        <CheckCircle className="w-3 h-3 mr-1" />
        Success
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        Failed
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
            const versionNum = version.executionVersion || idx + 1
            const isCurrent = version.executionVersion?.toString() === currentVersionId
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
                          {getSuccessBadge(version.executionResult.overallSuccess)}
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
                            {version.executionResult.steps.filter(s => s.success).length} / {version.executionResult.steps.length} steps
                          </span>
                          <span>•</span>
                          <span>
                            {version.executionResult.totalDuration}ms
                          </span>
                          {version.executionResult.questionsAsked.length > 0 && (
                            <>
                              <span>•</span>
                              <span>
                                {version.executionResult.questionsAsked.length} questions
                              </span>
                            </>
                          )}
                        </div>

                        {version.executionResult.errors.length > 0 && (
                          <div className="text-xs text-destructive">
                            {version.executionResult.errors.length} error(s)
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
                      {/* Summary */}
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">Summary</div>
                        <div className="text-sm space-y-1">
                          <div>
                            Steps executed: {version.executionResult.steps.length}
                          </div>
                          <div>
                            Success rate: {((version.executionResult.steps.filter(s => s.success).length / version.executionResult.steps.length) * 100).toFixed(0)}%
                          </div>
                          {version.executionResult.adaptations.length > 0 && (
                            <div>
                              Adaptations: {version.executionResult.adaptations.length}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Errors */}
                      {version.executionResult.errors.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">Errors</div>
                          <ul className="text-sm space-y-1">
                            {version.executionResult.errors.map((error, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-destructive">
                                <span className="mt-0.5">⚠</span>
                                <span>{error}</span>
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


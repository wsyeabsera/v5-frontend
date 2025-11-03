'use client'

import { useState, useEffect } from 'react'
import { CriticAgentOutput } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, RefreshCw, History, Trash2, Eye, ShieldCheck, AlertTriangle, Loader2, Frown } from 'lucide-react'
import { DeleteAllDialog } from '@/components/ui/delete-all-dialog'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function CriticAgentHistoryPage() {
  const [critiques, setCritiques] = useState<CriticAgentOutput[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCritique, setSelectedCritique] = useState<CriticAgentOutput | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false)

  const loadHistory = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/agents/critic-agent/history')
      if (!response.ok) {
        throw new Error('Failed to load critic history')
      }

      const data = await response.json()
      const processedData = data.map((d: any) => ({
        ...d,
        timestamp: new Date(d.timestamp),
        critique: {
          ...d.critique,
          issues: d.critique.issues || [],
          followUpQuestions: d.critique.followUpQuestions || [],
          strengths: d.critique.strengths || [],
          suggestions: d.critique.suggestions || [],
        },
        requestContext: d.requestContext
          ? {
              ...d.requestContext,
              createdAt: new Date(d.requestContext.createdAt),
            }
          : undefined,
      }))
      setCritiques(processedData)
    } catch (err: any) {
      setError(err.message || 'Failed to load critic history')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const handleViewDetails = (critique: CriticAgentOutput) => {
    setSelectedCritique(critique)
    setIsDetailOpen(true)
  }

  const handleDeleteAll = async () => {
    try {
      const response = await fetch('/api/agents/critic-agent/history', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete all critic history')
      }

      const result = await response.json()
      setError(null)
      await loadHistory()
      alert(`Successfully deleted ${result.count} critique${result.count !== 1 ? 's' : ''}`)
    } catch (err: any) {
      setError(err.message || 'Failed to delete all critic history')
    }
  }

  const getRecommendationBadge = (recommendation: string) => {
    switch (recommendation) {
      case 'approve':
        return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900">Approve</Badge>
      case 'revise':
        return <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900">Revise</Badge>
      case 'reject':
        return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900">Reject</Badge>
      default:
        return <Badge variant="secondary">{recommendation}</Badge>
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Breadcrumbs items={[
          { label: 'Agent Pipeline', href: '/agents/pipeline' },
          { label: 'Critic Agent', href: '/agents/critic-agent' },
          { label: 'History' },
        ]} />
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/agents/critic-agent">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="mb-1 flex items-center gap-2">
                <History className="w-5 h-5" />
                Critic Agent History
              </h1>
              <p className="text-[13px] text-muted-foreground">
                View all past critic agent outputs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadHistory}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {critiques.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteAllOpen(true)}
                disabled={isLoading}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete All
              </Button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            Showing {critiques.length} critique{critiques.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* History List */}
        <Card>
          <CardHeader>
            <CardTitle>Critic History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p>Loading critic history...</p>
              </div>
            ) : critiques.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Frown className="h-8 w-8 mb-4" />
                <p>No critic history found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {critiques.map((critique) => (
                  <Card key={critique.requestId} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="default" className="gap-2">
                              <ShieldCheck className="w-3 h-3" />
                              Critic Agent
                            </Badge>
                            {getRecommendationBadge(critique.critique.recommendation)}
                            <Badge variant="outline">
                              Score: {(critique.critique.overallScore * 100).toFixed(1)}%
                            </Badge>
                            {critique.critique.issues.length > 0 && (
                              <Badge variant="secondary">
                                {critique.critique.issues.length} Issue{critique.critique.issues.length !== 1 ? 's' : ''}
                              </Badge>
                            )}
                            {critique.critique.followUpQuestions.length > 0 && (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900">
                                {critique.critique.followUpQuestions.length} Question{critique.critique.followUpQuestions.length !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {critique.critique.rationale}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(critique)}
                            className="gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            Details
                          </Button>
                          <Link href={`/requests?search=${critique.requestId}`}>
                            <Button variant="outline" size="sm" className="gap-2">
                              Request
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Critique Details</DialogTitle>
            </DialogHeader>
            {selectedCritique && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium">Overall Score:</span>
                    <div className="w-full bg-muted h-2 rounded-full overflow-hidden mt-2">
                      <div
                        className={`h-full transition-all ${
                          selectedCritique.critique.overallScore >= 0.8 ? 'bg-green-500' :
                          selectedCritique.critique.overallScore >= 0.6 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${selectedCritique.critique.overallScore * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {(selectedCritique.critique.overallScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Recommendation:</span>
                    <div className="mt-2">
                      {getRecommendationBadge(selectedCritique.critique.recommendation)}
                    </div>
                  </div>
                </div>

                {selectedCritique.critique.issues.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Issues ({selectedCritique.critique.issues.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedCritique.critique.issues.map((issue, idx) => (
                        <div key={idx} className="p-3 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{issue.severity}</Badge>
                            <Badge variant="secondary">{issue.category}</Badge>
                          </div>
                          <p className="text-sm">{issue.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Suggestion: {issue.suggestion}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCritique.critique.strengths.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Strengths</h4>
                    <ul className="space-y-1">
                      {selectedCritique.critique.strengths.map((strength, idx) => (
                        <li key={idx} className="text-sm">• {strength}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete All Dialog */}
        <DeleteAllDialog
          open={isDeleteAllOpen}
          onOpenChange={setIsDeleteAllOpen}
          onConfirm={handleDeleteAll}
          title="Delete All Critic History"
          description="Are you sure you want to delete all critic agent history? This action cannot be undone."
          itemCount={critiques.length}
          itemName="critiques"
        />
      </div>
    </div>
  )
}


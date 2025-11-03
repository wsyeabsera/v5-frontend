'use client'

import { useState, useEffect } from 'react'
import { ThoughtAgentOutput } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ThoughtHistoryList } from '@/components/thought/ThoughtHistoryList'
import { ArrowLeft, RefreshCw, History, Trash2 } from 'lucide-react'
import { DeleteAllDialog } from '@/components/ui/delete-all-dialog'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ThoughtDetail } from '@/components/thought/ThoughtDetail'

export default function ThoughtAgentHistoryPage() {
  const [thoughts, setThoughts] = useState<ThoughtAgentOutput[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedThought, setSelectedThought] = useState<ThoughtAgentOutput | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false)

  const loadHistory = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/agents/thought-agent/history')
      if (!response.ok) {
        throw new Error('Failed to load thought history')
      }

      const data = await response.json()
      // Ensure timestamps are Date objects
      const processedData = data.map((d: any) => ({
        ...d,
        timestamp: new Date(d.timestamp),
        requestContext: d.requestContext
          ? {
              ...d.requestContext,
              createdAt: new Date(d.requestContext.createdAt),
            }
          : undefined,
      }))
      setThoughts(processedData)
    } catch (err: any) {
      setError(err.message || 'Failed to load thought history')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const handleViewDetails = (thought: ThoughtAgentOutput) => {
    setSelectedThought(thought)
    setIsDetailOpen(true)
  }

  const handleDeleteAll = async () => {
    try {
      const response = await fetch('/api/agents/thought-agent/history', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete all thought history')
      }

      const result = await response.json()
      setError(null)
      await loadHistory()
      alert(`Successfully deleted ${result.count} thought${result.count !== 1 ? 's' : ''}`)
    } catch (err: any) {
      setError(err.message || 'Failed to delete all thought history')
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Breadcrumbs items={[
          { label: 'Agent Pipeline', href: '/agents/pipeline' },
          { label: 'Thought Agent', href: '/agents/thought-agent' },
          { label: 'History' },
        ]} />
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/agents/thought-agent">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="mb-1 flex items-center gap-2">
                <History className="w-5 h-5" />
                Thought Agent History
              </h1>
              <p className="text-[13px] text-muted-foreground">
                View all past thought agent outputs
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
            {thoughts.length > 0 && (
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
            Showing {thoughts.length} thought{thoughts.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* History List */}
        <Card>
          <CardHeader>
            <CardTitle>Thought History</CardTitle>
          </CardHeader>
          <CardContent>
            <ThoughtHistoryList
              thoughts={thoughts}
              isLoading={isLoading}
              onViewDetails={handleViewDetails}
            />
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Thought Details</DialogTitle>
            </DialogHeader>
            {selectedThought && <ThoughtDetail result={selectedThought} />}
          </DialogContent>
        </Dialog>

        {/* Delete All Dialog */}
        <DeleteAllDialog
          open={isDeleteAllOpen}
          onOpenChange={setIsDeleteAllOpen}
          onConfirm={handleDeleteAll}
          title="Delete All Thought History"
          description="Are you sure you want to delete all thought agent history? This action cannot be undone."
          itemCount={thoughts.length}
          itemName="thoughts"
        />
      </div>
    </div>
  )
}


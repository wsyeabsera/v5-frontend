'use client'

import { useState, useEffect } from 'react'
import { ComplexityDetectorOutput } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DetectionHistoryList } from '@/components/complexity/DetectionHistoryList'
import {
  DetectionHistoryFilters,
  DetectionHistoryFilters as FiltersType,
} from '@/components/complexity/DetectionHistoryFilters'
import { ArrowLeft, RefreshCw, History, Trash2 } from 'lucide-react'
import { DeleteAllDialog } from '@/components/ui/delete-all-dialog'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ComplexityResult } from '@/components/complexity/ComplexityResult'

export default function ComplexityDetectorHistoryPage() {
  const [detections, setDetections] = useState<ComplexityDetectorOutput[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDetection, setSelectedDetection] = useState<ComplexityDetectorOutput | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false)
  const [filters, setFilters] = useState<FiltersType>({
    detectionMethod: 'all',
  })

  const loadHistory = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (filters.detectionMethod !== 'all') {
        params.append('detectionMethod', filters.detectionMethod)
      }
      if (filters.minScore !== undefined) {
        params.append('minScore', filters.minScore.toString())
      }
      if (filters.maxScore !== undefined) {
        params.append('maxScore', filters.maxScore.toString())
      }
      if (filters.startDate) {
        params.append('startDate', filters.startDate)
      }
      if (filters.endDate) {
        params.append('endDate', filters.endDate)
      }

      const url = `/api/agents/complexity-detector/history${
        params.toString() ? `?${params.toString()}` : ''
      }`

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to load detection history')
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
      setDetections(processedData)
    } catch (err: any) {
      setError(err.message || 'Failed to load detection history')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [filters])

  const handleViewDetails = (detection: ComplexityDetectorOutput) => {
    setSelectedDetection(detection)
    setIsDetailOpen(true)
  }

  const handleDeleteAll = async () => {
    try {
      const response = await fetch('/api/agents/complexity-detector/history', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete all detection history')
      }

      const result = await response.json()
      setError(null)
      await loadHistory()
      alert(`Successfully deleted ${result.count} detection${result.count !== 1 ? 's' : ''}`)
    } catch (err: any) {
      setError(err.message || 'Failed to delete all detection history')
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/agents/complexity-detector">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="mb-1 flex items-center gap-2">
                <History className="w-5 h-5" />
                Complexity Detector History
              </h1>
              <p className="text-[13px] text-muted-foreground">
                View all past complexity detection results
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
            {detections.length > 0 && (
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

        {/* Filters */}
        <DetectionHistoryFilters filters={filters} onFiltersChange={setFilters} />

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            Showing {detections.length} detection{detections.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* History List */}
        <Card>
          <CardHeader>
            <CardTitle>Detection History</CardTitle>
          </CardHeader>
          <CardContent>
            <DetectionHistoryList
              detections={detections}
              isLoading={isLoading}
              onViewDetails={handleViewDetails}
            />
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detection Details</DialogTitle>
            </DialogHeader>
            {selectedDetection && <ComplexityResult result={selectedDetection} />}
          </DialogContent>
        </Dialog>

        {/* Delete All Dialog */}
        <DeleteAllDialog
          open={isDeleteAllOpen}
          onOpenChange={setIsDeleteAllOpen}
          onConfirm={handleDeleteAll}
          title="Delete All Detection History"
          description="Are you sure you want to delete all complexity detection history? This action cannot be undone."
          itemCount={detections.length}
          itemName="detections"
        />
      </div>
    </div>
  )
}


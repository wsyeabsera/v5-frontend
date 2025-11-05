'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSummarizeTask, useTask } from '@/lib/queries-v2'
import { saveSummary, hasSummary, getTaskSummaries as getTaskSummariesUtil } from '@/lib/utils/summary-storage'
import { TaskRelationships } from './TaskRelationships'
import { SummaryHistory } from '@/components/v2/task-summaries/SummaryHistory'
import { SummaryContentView } from '@/components/v2/task-summaries/SummaryContentView'
import { Loader2, Copy, Check, FileText, Sparkles, History } from 'lucide-react'
import { ThoughtViewDialog } from '@/components/v2/thoughts/ThoughtViewDialog'
import { PlanViewDialog } from '@/components/v2/plans/PlanViewDialog'
import { TaskViewDialog } from './TaskViewDialog'

interface TaskSummaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId: string
}

export function TaskSummaryDialog({ open, onOpenChange, taskId }: TaskSummaryDialogProps) {
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate')
  const [format, setFormat] = useState<'brief' | 'detailed' | 'technical'>('detailed')
  const [includeInsights, setIncludeInsights] = useState(true)
  const [includeRecommendations, setIncludeRecommendations] = useState(true)
  const [summary, setSummary] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [historyKey, setHistoryKey] = useState(0) // Force refresh of history
  
  const [viewThoughtDialogOpen, setViewThoughtDialogOpen] = useState(false)
  const [viewPlanDialogOpen, setViewPlanDialogOpen] = useState(false)
  const [viewTaskDialogOpen, setViewTaskDialogOpen] = useState(false)
  const [selectedThoughtId, setSelectedThoughtId] = useState<string | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)

  const { data: task } = useTask(taskId)
  const summarizeMutation = useSummarizeTask()

  const hasCachedSummary = hasSummary(taskId)

  useEffect(() => {
    if (open && taskId) {
      // Load cached summaries if available
      const cached = hasSummary(taskId) ? getTaskSummariesUtil(taskId) : []
      if (cached.length > 0) {
        // Auto-switch to history if there are summaries and we're on generate tab
        setActiveTab('history')
      }
      // Reset summary in generate tab when opening
      setSummary(null)
    }
  }, [open, taskId])

  const handleGenerate = async () => {
    try {
      const result = await summarizeMutation.mutateAsync({
        taskId,
        format,
        includeInsights,
        includeRecommendations,
      })
      
      // Handle both string and object responses (including nested result wrapper)
      let summaryText = ''
      const actualResult = result?.result || result // Handle nested result wrapper
      
      if (typeof actualResult === 'string') {
        summaryText = actualResult
      } else if (actualResult?.summary) {
        summaryText = actualResult.summary
      } else if (result?.summary) {
        summaryText = result.summary
      } else if (result?.content) {
        summaryText = result.content
      } else if (typeof result === 'string') {
        summaryText = result
      } else {
        summaryText = JSON.stringify(result, null, 2)
      }

      setSummary(summaryText)

      // Save to cache
      saveSummary({
        taskId,
        summary: summaryText,
        format,
        includeInsights,
        includeRecommendations,
        generatedAt: new Date().toISOString(),
        taskMetadata: {
          planId: task?.planId,
          status: task?.status,
          createdAt: task?.createdAt,
        },
      })

      // Switch to history tab to show the new summary
      setActiveTab('history')
      // Force refresh of history component
      setHistoryKey(prev => prev + 1)
    } catch (error) {
      console.error('Failed to generate summary:', error)
      setSummary(`Error generating summary: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleRegenerate = async (
    oldFormat: 'brief' | 'detailed' | 'technical',
    oldIncludeInsights: boolean,
    oldIncludeRecommendations: boolean
  ) => {
    setFormat(oldFormat)
    setIncludeInsights(oldIncludeInsights)
    setIncludeRecommendations(oldIncludeRecommendations)
    setActiveTab('generate')
    // Small delay to ensure state is updated
    setTimeout(() => {
      handleGenerate()
    }, 100)
  }

  const handleCopy = async () => {
    if (!summary) return
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy summary:', err)
    }
  }

  const handleViewThought = (thoughtId: string) => {
    setSelectedThoughtId(thoughtId)
    setViewThoughtDialogOpen(true)
  }

  const handleViewPlan = (planId: string) => {
    setSelectedPlanId(planId)
    setViewPlanDialogOpen(true)
  }

  const handleViewTask = (taskId: string) => {
    setViewTaskDialogOpen(true)
  }

  const isLoading = summarizeMutation.isPending

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl h-[95vh] max-h-[95vh] flex flex-col p-0">
          <div className="flex-shrink-0 p-6 border-b">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                Task Summary
              </DialogTitle>
              <DialogDescription className="text-base">
                Generate and view intelligent summaries of task execution with insights and recommendations.
              </DialogDescription>
            </DialogHeader>

            {/* Task Relationships */}
            {task && (
              <div className="mt-4">
                <TaskRelationships
                  task={task}
                  onViewThought={handleViewThought}
                  onViewPlan={handleViewPlan}
                  onViewTask={handleViewTask}
                />
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-6 pb-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                <TabsTrigger value="generate" className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Generate New
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="w-4 h-4" />
                  History
                  {hasCachedSummary && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/20 rounded-full">
                      {getTaskSummariesUtil(taskId).length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="generate" className="flex-1 flex flex-col min-h-0 mt-4 data-[state=inactive]:hidden">
                <div className="space-y-4 flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Options */}
                <Card className="p-6 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200/50 dark:border-blue-900/50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="format" className="text-sm font-semibold">Summary Format</Label>
                      <Select value={format} onValueChange={(value) => setFormat(value as typeof format)}>
                        <SelectTrigger id="format" className="bg-white/80 dark:bg-gray-900/80">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="brief">Brief - Quick overview</SelectItem>
                          <SelectItem value="detailed">Detailed - Comprehensive analysis</SelectItem>
                          <SelectItem value="technical">Technical - Deep dive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-3 pt-8">
                      <Switch
                        id="includeInsights"
                        checked={includeInsights}
                        onCheckedChange={setIncludeInsights}
                      />
                      <Label htmlFor="includeInsights" className="cursor-pointer font-medium">
                        Include Insights
                      </Label>
                    </div>

                    <div className="flex items-center space-x-3 pt-8">
                      <Switch
                        id="includeRecommendations"
                        checked={includeRecommendations}
                        onCheckedChange={setIncludeRecommendations}
                      />
                      <Label htmlFor="includeRecommendations" className="cursor-pointer font-medium">
                        Include Recommendations
                      </Label>
                    </div>
                  </div>
                </Card>

                {/* Generate Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleGenerate}
                    disabled={isLoading || !taskId}
                    size="lg"
                    className="gap-2 shadow-lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating Summary...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Generate Summary
                      </>
                    )}
                  </Button>
                </div>

                {/* Summary Display */}
                {summary && (
                  <Card className="flex-1 flex flex-col min-h-0 border-2 shadow-lg overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/5 to-primary/10 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        <Label className="text-base font-semibold">Generated Summary</Label>
                        <Badge variant="outline">{format}</Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopy}
                        className="gap-2"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <SummaryContentView content={summary} />
                  </Card>
                )}

                {/* Error State */}
                {summarizeMutation.error && !summary && (
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-900/30">
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">
                      {summarizeMutation.error instanceof Error
                        ? summarizeMutation.error.message
                        : 'Failed to generate summary'}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

              <TabsContent value="history" className="flex-1 flex flex-col min-h-0 mt-4 data-[state=inactive]:hidden">
                <SummaryHistory key={historyKey} taskId={taskId} onRegenerate={handleRegenerate} />
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialogs */}
      <ThoughtViewDialog
        open={viewThoughtDialogOpen}
        onOpenChange={setViewThoughtDialogOpen}
        thoughtId={selectedThoughtId}
      />
      <PlanViewDialog
        open={viewPlanDialogOpen}
        onOpenChange={setViewPlanDialogOpen}
        planId={selectedPlanId}
      />
      <TaskViewDialog
        open={viewTaskDialogOpen}
        onOpenChange={setViewTaskDialogOpen}
        taskId={taskId}
      />
    </>
  )
}

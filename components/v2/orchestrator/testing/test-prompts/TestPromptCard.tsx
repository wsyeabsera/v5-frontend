'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreVertical, Edit, Trash2, Play, FileText } from 'lucide-react'
import { useDeleteTestPrompt } from '@/lib/queries-v2'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface TestPrompt {
  promptId: string
  query: string
  name?: string
  description?: string
  categories: string[]
  tags: string[]
  version: string
  userInputs?: Array<{
    stepId?: string
    field: string
    value: any
    description?: string
    order?: number
  }>
  stats?: {
    executionCount: number
    successCount: number
    failureCount: number
    averageLatency: number
  }
}

interface TestPromptCardProps {
  prompt: TestPrompt
  onEdit: (promptId: string) => void
  onDelete: () => void
}

export function TestPromptCard({ prompt, onEdit, onDelete }: TestPromptCardProps) {
  const router = useRouter()
  const deleteMutation = useDeleteTestPrompt()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(prompt.promptId)
    onDelete()
    setShowDeleteDialog(false)
  }

  const successRate = prompt.stats?.executionCount
    ? ((prompt.stats.successCount / prompt.stats.executionCount) * 100).toFixed(1)
    : 'N/A'

  return (
    <>
      <Card className="p-4 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">
              {prompt.name || prompt.promptId}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {prompt.query}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(prompt.promptId)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  router.push(`/v2/orchestrator/testing/execution?promptId=${prompt.promptId}`)
                }}
              >
                <Play className="w-4 h-4 mr-2" />
                Run Test
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {prompt.categories.map((cat) => (
            <Badge key={cat} variant="secondary">
              {cat}
            </Badge>
          ))}
          {prompt.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
          {prompt.tags.length > 3 && (
            <Badge variant="outline">+{prompt.tags.length - 3}</Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>v{prompt.version}</span>
          </div>
          {prompt.userInputs && prompt.userInputs.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {prompt.userInputs.length} inputs
            </Badge>
          )}
        </div>

        {prompt.stats && prompt.stats.executionCount > 0 && (
          <div className="grid grid-cols-3 gap-2 pt-3 border-t text-sm">
            <div>
              <div className="text-muted-foreground">Executions</div>
              <div className="font-semibold">{prompt.stats.executionCount}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Success Rate</div>
              <div className="font-semibold">{successRate}%</div>
            </div>
            <div>
              <div className="text-muted-foreground">Avg Latency</div>
              <div className="font-semibold">
                {Math.round(prompt.stats.averageLatency)}ms
              </div>
            </div>
          </div>
        )}
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test Prompt?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{prompt.name || prompt.promptId}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}


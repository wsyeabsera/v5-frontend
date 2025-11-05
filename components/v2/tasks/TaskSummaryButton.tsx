'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { TaskSummaryDialog } from './TaskSummaryDialog'
import { hasSummary } from '@/lib/utils/summary-storage'
import { FileText, Sparkles } from 'lucide-react'

interface TaskSummaryButtonProps {
  taskId: string
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function TaskSummaryButton({
  taskId,
  variant = 'outline',
  size = 'sm',
}: TaskSummaryButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const hasCachedSummary = hasSummary(taskId)

  return (
    <>
      <Button
        variant={hasCachedSummary ? 'default' : variant}
        size={size}
        onClick={() => setDialogOpen(true)}
        className="gap-2"
      >
        {hasCachedSummary ? (
          <>
            <FileText className="w-4 h-4" />
            View Summary
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Generate Summary
          </>
        )}
      </Button>
      <TaskSummaryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        taskId={taskId}
      />
    </>
  )
}


'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ExecutePlanDialog } from '@/components/v2/plans/ExecutePlanDialog'
import { Play } from 'lucide-react'

interface ExecutePlanButtonProps {
  planId: string
}

export function ExecutePlanButton({ planId }: ExecutePlanButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <Button
        variant="default"
        size="sm"
        onClick={() => setDialogOpen(true)}
      >
        <Play className="w-4 h-4 mr-2" />
        Execute Plan
      </Button>
      <ExecutePlanDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        planId={planId}
      />
    </>
  )
}

